import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToR2 } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

const CATEGORY_MAP: Record<string, { label: string; cids: number[] }> = {
    "cama-uci": { label: "Cama de UCI", cids: [508, 509, 510] },
    "cama-hospital": { label: "Cama de hospital", cids: [512, 511] },
    "cama-hospital-manual": { label: "Cama de hospital manual", cids: [503] },
    "camilla-emergencia": { label: "Camilla de emergencia", cids: [513, 514] },
    "cama-pediatrica": { label: "Cama pediátrica", cids: [505] },
    "cama-cuidados-hogar": { label: "Cama de cuidados en el hogar", cids: [515, 516, 517] },
    "equipo-medico-sala": { label: "Equipo médico y de sala", cids: [518, 519, 520, 521, 522] }
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
    const regex = /href="([^"]*product_d\.php\?lang=es&amp;tb=1&amp;id=\d+[^"]*)"/g;
    const rawLinks: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        rawLinks.push(match[1]);
    }
    const regex2 = /href="([^"]*product_d\.php\?lang=es&tb=1&id=\d+[^"]*)"/g;
    while ((match = regex2.exec(html)) !== null) {
        rawLinks.push(match[1]);
    }
    return Array.from(new Set(rawLinks)).map(link => {
        let clean = link.replace(/&amp;/g, '&');
        if (clean.startsWith('//')) clean = 'https:' + clean;
        else if (clean.startsWith('/')) clean = 'https://www.joson-care.com' + clean;
        else if (!clean.startsWith('http')) clean = 'https://www.joson-care.com/' + clean;
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

        // Fetch user from DB to get their organizationId
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
                    sendUpdate({ type: 'status', message: 'Iniciando conexión con Joson Care...' });

                    // 1. Resolve target categories/CIDs to process
                    const categoriesToProcess = requestCategory === "all"
                        ? Object.keys(CATEGORY_MAP)
                        : [requestCategory];

                    const allDetailLinks: { link: string; categoryLabel: string }[] = [];

                    for (const catKey of categoriesToProcess) {
                        const catInfo = CATEGORY_MAP[catKey];
                        if (!catInfo) continue;

                        sendUpdate({ type: 'status', message: `Buscando productos en categoría: ${catInfo.label}...` });
                        console.log(`[Scraper] Finding products in category: ${catInfo.label}`);

                        for (const cid of catInfo.cids) {
                            const targetUrl = `https://www.joson-care.com/product.php?lang=es&tb=1&cid=${cid}`;
                            console.log(`[Scraper] Fetching: ${targetUrl}`);

                            const response = await fetch(targetUrl, { headers: HEADERS });
                            if (!response.ok) {
                                console.log(`[Scraper] Failed to fetch category CID ${cid}: status ${response.status}`);
                                continue;
                            }

                            const html = await response.text();
                            const links = getProductLinks(html);

                            links.forEach(link => {
                                if (!allDetailLinks.some(item => item.link === link)) {
                                    allDetailLinks.push({ link, categoryLabel: catInfo.label });
                                }
                            });

                            // Wait 300ms between categories
                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                    }

                    console.log(`[Scraper] Successfully found ${allDetailLinks.length} unique products.`);
                    sendUpdate({ type: 'info', total: allDetailLinks.length, message: `Se encontraron ${allDetailLinks.length} productos en Joson Care para importar.` });

                    let importedCount = 0;
                    let processedCount = 0;

                    for (const item of allDetailLinks) {
                        processedCount++;
                        const detailUrl = item.link;
                        console.log(`[Scraper] Fetching product details: ${detailUrl}`);

                        let title = '';

                        try {
                            const response = await fetch(detailUrl, { headers: HEADERS });
                            if (!response.ok) {
                                console.error(`[Scraper] Failed to fetch product detail: ${detailUrl} (Status: ${response.status})`);
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
                            const titleMatch = html.match(/<div class="name">([\s\S]*?)<\/div>/) || 
                                               html.match(/<h1 class="pageTitle">([\s\S]*?)<\/h1>/);
                            title = titleMatch ? cleanHtml(titleMatch[1]) : '';

                            if (!title) {
                                console.warn(`[Scraper] Could not parse title for URL: ${detailUrl}. Skipping...`);
                                continue;
                            }

                            // 2. Parse Model
                            const modelMatch = html.match(/id="productNO"[^>]*>([^<]+)/) ||
                                               html.match(/Modelo：<span[^>]*>([\s\S]*?)<\/span>/);
                            const model = modelMatch ? modelMatch[1].trim() : '';

                            // Resolve product ID from url if model missing
                            const idMatch = detailUrl.match(/[?&]id=(\d+)/);
                            const productId = idMatch ? idMatch[1] : Date.now().toString();
                            const cleanModel = model || `GENERICO-${productId}`;
                            const cleanSku = `JOSON-${cleanModel.toUpperCase().replace(/[^A-Z0-9-]/g, '')}`;

                            // 3. Parse Description & Tabs
                            let descHtml = '';
                            const overviewMatch = html.match(/<article class="editor clearfix">([\s\S]*?)<\/article>/);
                            if (overviewMatch) {
                                descHtml += `<h3>Vista rápida</h3>\n${overviewMatch[1]}\n\n`;
                            }

                            const tabMenuRegex = /<li><a href="#(tab-\d+)"\s*>([^<]+)<\/a><\/li>/g;
                            let tabMenuMatch;
                            const tabLabels: Record<string, string> = {};
                            while ((tabMenuMatch = tabMenuRegex.exec(html)) !== null) {
                                tabLabels[tabMenuMatch[1]] = tabMenuMatch[2].trim();
                            }

                            const tabConRegex = /<li class="tab-con"\s+id="(tab-\d+)">([\s\S]*?)<\/li>/g;
                            let tabConMatch;
                            while ((tabConMatch = tabConRegex.exec(html)) !== null) {
                                const tabId = tabConMatch[1];
                                const tabContent = tabConMatch[2];
                                const label = tabLabels[tabId] || 'Detalles';
                                descHtml += `<h3>${label}</h3>\n${tabContent}\n\n`;
                            }

                            const descClean = cleanHtml(descHtml || overviewMatch?.[1] || '');
                            const descShortClean = descClean.split('\n')[0]?.substring(0, 200) || descClean.substring(0, 200);

                            // 4. Parse Main Image
                            const imgMatch = html.match(/<figure class="pic[^"]*">\s*<img src="([^"]+)"/) ||
                                             html.match(/<div class="big stage"[^>]*>[\s\S]*?<img src="([^"]+)"/);
                            let originalImageUrl = imgMatch ? imgMatch[1] : '';
                            if (originalImageUrl) {
                                if (originalImageUrl.startsWith('//')) {
                                    originalImageUrl = 'https:' + originalImageUrl;
                                } else if (originalImageUrl.startsWith('/')) {
                                    originalImageUrl = 'https://www.joson-care.com' + originalImageUrl;
                                }
                            }

                            let finalImageUrl = '';

                            if (originalImageUrl) {
                                finalImageUrl = originalImageUrl;

                                // Upload image to R2
                                try {
                                    console.log(`[Scraper] Downloading image: ${originalImageUrl}`);
                                    sendUpdate({ type: 'status', message: `Descargando imagen para: ${title}` });
                                    
                                    const imgResponse = await fetch(originalImageUrl, { headers: HEADERS });
                                    if (imgResponse.ok) {
                                        const arrayBuffer = await imgResponse.arrayBuffer();
                                        const buffer = Buffer.from(arrayBuffer);
                                        const ext = originalImageUrl.split('.').pop()?.split('?')[0] || 'jpg';
                                        const uniqueFileName = `scraped/joson-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
                                        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';

                                        const r2Url = await uploadToR2(buffer, uniqueFileName, contentType);
                                        if (r2Url) {
                                            finalImageUrl = r2Url;
                                        }
                                    }
                                } catch (imgErr) {
                                    console.error(`[Scraper] Failed to upload image to R2 for ${title}:`, imgErr);
                                }
                            }

                            // Brand and SKU Check
                            const brand = 'Joson-Care';

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
                            console.log(`[Scraper] Creating product: ${title} (${cleanSku})`);
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
                                    modelo: cleanModel,
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
                                total: allDetailLinks.length, 
                                product: title 
                            });

                        } catch (err: any) {
                            console.error(`[Scraper] Error processing details for link ${item.link}:`, err);
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
                    console.error('[Scraper Stream Error]:', err);
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
        console.error('[Scraper Endpoint Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
