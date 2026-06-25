import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToR2 } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

const CATEGORY_MAP: Record<string, { label: string; paths: string[] }> = {
    "camara-oxigeno": { label: "Cámara de oxígeno", paths: ["oxygen-chamber"] },
    "concentrador-medico": { label: "Concentrador de oxígeno médico", paths: ["medical-oxygen-concentrator"] },
    "concentrador-portatil": { label: "Concentrador de oxígeno portátil", paths: ["portable-oxygen-concentrator"] },
    "concentrador-industrial": { label: "Concentrador de oxígeno industrial", paths: ["industrial-oxygen-concentrator"] },
    "analizador-oxigeno": { label: "Analizador de oxígeno", paths: ["oxygen-analyzer"] },
    "mezclador-cocteles": { label: "Mezclador de cócteles de oxígeno", paths: ["oxygen-cocktail-mixer"] },
    "concentrador-veterinario": { label: "Concentrador de oxígeno veterinario", paths: ["veterinary-oxygen-concentrator"] },
    "entrenamiento-altitud": { label: "Entrenamiento de altitud simulada", paths: ["simulated-altitude-training"] },
    "accesorios-concentrador": { label: "Accesorios para concentradores de oxígeno", paths: ["oxygen-concentrator-accessories"] }
};

// Decodes common HTML entities
const decodeHtml = (html: string): string => {
    if (!html) return '';
    return html
        .replace(/&ndash;/g, '-')
        .replace(/&mdash;/g, '-')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&middot;/g, '·')
        .replace(/\s+/g, ' ')
        .trim();
};

// Strips HTML tags and formats nicely
const cleanHtml = (html: string): string => {
    if (!html) return '';
    
    // Decodes entities
    let text = html
        .replace(/&ndash;/g, '-')
        .replace(/&mdash;/g, '-')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&middot;/g, '·')
        .replace(/&#8211;/g, '-')
        .replace(/&#8212;/g, '-')
        .replace(/&#8216;/g, "'")
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"')
        .replace(/&#038;/g, '&')
        .replace(/&#039;/g, "'");

    // Replace line breaks and lists
    text = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<li>/gi, '\n- ')
        .replace(/<\/li>/gi, '\n');

    // Remove remaining tags
    text = text.replace(/<[^>]*>/g, '');

    // Normalize spacing and newlines
    text = text
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join('\n');

    return text.trim();
};

const getProductLinks = (html: string): string[] => {
    const regex = /href="([^"]*\/product\/[^"]*)"/g;
    const rawLinks: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        rawLinks.push(match[1]);
    }
    return Array.from(new Set(rawLinks)).map(link => {
        let clean = link.replace(/&amp;/g, '&');
        if (clean.startsWith('//')) clean = 'https:' + clean;
        else if (clean.startsWith('/')) clean = 'https://es.aertioxygen.com' + clean;
        else if (!clean.startsWith('http')) clean = 'https://es.aertioxygen.com/' + clean;
        return clean;
    });
};

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user || !user.email) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Fetch user from DB to get organizationId
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { organizationId: true }
        });
        if (!dbUser) {
            return NextResponse.json({ error: 'Usuario no encontrado en la base de datos' }, { status: 404 });
        }
        const organizationId = dbUser.organizationId;

        // Parse requested category
        let requestCategory = "all";
        try {
            const body = await req.json();
            if (body.category) requestCategory = body.category;
        } catch {
            // Keep default 'all'
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const sendUpdate = (data: any) => {
                    controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
                };

                try {
                    sendUpdate({ type: 'status', message: 'Iniciando conexión con Aerti Oxygen...' });

                    // 1. Resolve target categories/paths to process
                    const categoriesToProcess = requestCategory === "all"
                        ? Object.keys(CATEGORY_MAP)
                        : [requestCategory];

                    const allDetailLinks: { link: string; categoryLabel: string }[] = [];

                    for (const catKey of categoriesToProcess) {
                        const catInfo = CATEGORY_MAP[catKey];
                        if (!catInfo) continue;

                        sendUpdate({ type: 'status', message: `Buscando productos en categoría: ${catInfo.label}...` });
                        console.log(`[Scraper Aerti] Finding products in category: ${catInfo.label}`);

                        for (const path of catInfo.paths) {
                            let page = 1;
                            let hasMore = true;

                            while (hasMore) {
                                const targetUrl = page === 1
                                    ? `https://es.aertioxygen.com/product-list/${path}`
                                    : `https://es.aertioxygen.com/product-list/${path}_p${page}`;
                                
                                console.log(`[Scraper Aerti] Fetching list: ${targetUrl}`);
                                sendUpdate({ type: 'status', message: `Escaneando página ${page} de la categoría...` });

                                const response = await fetch(targetUrl, { headers: HEADERS });
                                if (!response.ok) {
                                    console.log(`[Scraper Aerti] Failed to fetch list path ${path} page ${page}: status ${response.status}`);
                                    hasMore = false;
                                    continue;
                                }

                                const html = await response.text();
                                const links = getProductLinks(html);

                                if (links.length === 0) {
                                    hasMore = false;
                                    continue;
                                }

                                links.forEach(link => {
                                    if (!allDetailLinks.some(item => item.link === link)) {
                                        allDetailLinks.push({ link, categoryLabel: catInfo.label });
                                    }
                                });

                                // Respect rate limiting
                                await new Promise(resolve => setTimeout(resolve, 300));
                                page++;
                            }
                        }
                    }

                    console.log(`[Scraper Aerti] Successfully found ${allDetailLinks.length} unique products.`);
                    sendUpdate({ type: 'info', total: allDetailLinks.length, message: `Se encontraron ${allDetailLinks.length} productos en Aerti Oxygen para importar.` });

                    let importedCount = 0;
                    let processedCount = 0;

                    for (const item of allDetailLinks) {
                        processedCount++;
                        const detailUrl = item.link;
                        console.log(`[Scraper Aerti] Fetching product details: ${detailUrl}`);

                        let title = '';

                        try {
                            const response = await fetch(detailUrl, { headers: HEADERS });
                            if (!response.ok) {
                                console.error(`[Scraper Aerti] Failed to fetch product detail: ${detailUrl} (Status: ${response.status})`);
                                sendUpdate({ 
                                    type: 'progress', 
                                    current: processedCount, 
                                    total: allDetailLinks.length, 
                                    product: `Error al descargar detalles (Código: ${response.status})` 
                                });
                                continue;
                            }

                            const html = await response.text();

                            // 1. Parse Title
                            const titleMatch = html.match(/<h1[^>]*wui-text-size-hr[^>]*>\s*<span>([\s\S]*?)<\/span>/i) ||
                                               html.match(/<meta property="og:title" content="([^"]+)"/i);
                            title = titleMatch ? cleanHtml(titleMatch[1]) : '';

                            if (!title) {
                                console.warn(`[Scraper Aerti] Could not parse title for URL: ${detailUrl}. Skipping...`);
                                continue;
                            }

                            // 2. Parse Model from Specs Table
                            let model = '';
                            const trRegex = /<tr>([\s\S]*?)<\/tr>/gi;
                            const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
                            let trMatch;
                            while ((trMatch = trRegex.exec(html)) !== null) {
                                const rowHtml = trMatch[1];
                                const cells: string[] = [];
                                let tdMatch;
                                while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
                                    cells.push(cleanHtml(tdMatch[1]));
                                }
                                if (cells.length >= 2 && cells[0].toLowerCase() === 'modelo') {
                                    model = cells[1].trim();
                                    break;
                                }
                            }

                            // Fallback if model not found in specs table
                            if (!model) {
                                const slugMatch = detailUrl.match(/\/product\/([a-z0-9-]+)/i);
                                if (slugMatch) {
                                    const slugPart = slugMatch[1];
                                    const firstToken = slugPart.split('-')[0].toUpperCase();
                                    model = firstToken || 'GENERICO';
                                } else {
                                    model = 'GENERICO';
                                }
                            }

                            const cleanSku = `AERTI-${model.toUpperCase().replace(/[^A-Z0-9-]/g, '')}`;

                            // 3. Parse Description
                            let descHtml = '';
                            const editorMatch = html.match(/<div class="content-container ueditor-container">([\s\S]*?)<\/div>/i);
                            if (editorMatch) {
                                descHtml = editorMatch[1];
                            }
                            const descClean = cleanHtml(descHtml);
                            const descShortClean = descClean.split('\n')[0]?.substring(0, 200) || descClean.substring(0, 200);

                            // 4. Parse Main Image
                            const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
                            let originalImageUrl = imgMatch ? imgMatch[1].trim() : '';
                            if (originalImageUrl) {
                                if (originalImageUrl.startsWith('//')) {
                                    originalImageUrl = 'https:' + originalImageUrl;
                                } else if (originalImageUrl.startsWith('/')) {
                                    originalImageUrl = 'https://es.aertioxygen.com' + originalImageUrl;
                                }
                            }

                            let finalImageUrl = '';

                            if (originalImageUrl) {
                                finalImageUrl = originalImageUrl;

                                // Upload image to R2
                                try {
                                    console.log(`[Scraper Aerti] Downloading image: ${originalImageUrl}`);
                                    sendUpdate({ type: 'status', message: `Descargando imagen para: ${title}` });
                                    
                                    const imgResponse = await fetch(originalImageUrl, { headers: HEADERS });
                                    if (imgResponse.ok) {
                                        const arrayBuffer = await imgResponse.arrayBuffer();
                                        const buffer = Buffer.from(arrayBuffer);
                                        const ext = originalImageUrl.split('.').pop()?.split('?')[0] || 'jpg';
                                        const uniqueFileName = `scraped/aerti-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
                                        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';

                                        const r2Url = await uploadToR2(buffer, uniqueFileName, contentType);
                                        if (r2Url) {
                                            finalImageUrl = r2Url;
                                        }
                                    }
                                } catch (imgErr) {
                                    console.error(`[Scraper Aerti] Failed to upload image to R2 for ${title}:`, imgErr);
                                }
                            }

                            const brand = 'Aerti';

                            // Check if product already exists (by SKU) in the database
                            const existingProduct = await prisma.producto.findUnique({
                                where: { sku: cleanSku }
                            });

                            if (existingProduct) {
                                if (
                                    existingProduct.organizationId !== organizationId || 
                                    existingProduct.categoria !== item.categoryLabel || 
                                    existingProduct.estado !== 'ACTIVO'
                                ) {
                                    await prisma.producto.update({
                                        where: { sku: cleanSku },
                                        data: { 
                                            organizationId,
                                            categoria: item.categoryLabel,
                                            estado: 'ACTIVO'
                                        }
                                    });
                                }
                                sendUpdate({ 
                                    type: 'progress', 
                                    current: processedCount, 
                                    total: allDetailLinks.length, 
                                    product: `${title} (Ya existe - Omitido)` 
                                });
                                continue;
                            }

                            // Create Producto entry in the database
                            console.log(`[Scraper Aerti] Creating product: ${title} (${cleanSku})`);
                            await prisma.producto.create({
                                data: {
                                    organizationId,
                                    sku: cleanSku,
                                    nombre: title,
                                    descripcion: descClean,
                                    imagenWeb: finalImageUrl || null,
                                    tituloWeb: title,
                                    descripcionWeb: descShortClean || null,
                                    marca: brand,
                                    modelo: model,
                                    precioVenta: 0,
                                    costoBase: 0,
                                    stockActual: 0,
                                    stockMinimo: 0,
                                    estado: 'ACTIVO',
                                    categoria: item.categoryLabel
                                }
                            });

                            importedCount++;
                            sendUpdate({ 
                                type: 'progress', 
                                current: processedCount, 
                                // wait, allDetailLinks.length
                                total: allDetailLinks.length, 
                                product: title 
                            });

                        } catch (err: any) {
                            console.error(`[Scraper Aerti] Error processing details for link ${item.link}:`, err);
                            sendUpdate({ 
                                type: 'progress', 
                                current: processedCount, 
                                total: allDetailLinks.length, 
                                product: `Error al procesar: ${title || item.link}` 
                            });
                        }

                        // Delay to respect rate limiting
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    sendUpdate({ type: 'success', count: importedCount, total: allDetailLinks.length });
                    controller.close();

                } catch (err: any) {
                    console.error('[Scraper Aerti Stream Error]:', err);
                    sendUpdate({ type: 'error', error: err.message || 'Error interno' });
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            }
        });

    } catch (err: any) {
        console.error('[Scraper Aerti Endpoint Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
