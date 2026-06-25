import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToR2 } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

const CATEGORY_MAP: Record<string, { label: string; urlSlug: string }> = {
    "hospital-bed": { label: "Cama de Hospital", urlSlug: "hospital-bed" },
    "icu-bed": { label: "Cama UCI", urlSlug: "icu-bed" },
    "electric-hospital-bed": { label: "Cama de Hospital Eléctrica", urlSlug: "electric-hospital-bed" },
    "manual-hospital-bed": { label: "Cama de Hospital Manual", urlSlug: "manual-hospital-bed" },
    "children-hospital-bed": { label: "Cama de Hospital para Niños", urlSlug: "children-hospital-bed" },
    "infant-hospital-bed": { label: "Cama de Hospital Infantil", urlSlug: "infant-hospital-bed" },
    "examination-bed": { label: "Cama de Examen", urlSlug: "examination-bed" },
    "home-care-bed": { label: "Cama de Cuidados Domiciliarios", urlSlug: "home-care-bed" },
    "transport-stretcher": { label: "Camilla de Transporte", urlSlug: "transport-stretcher" },
    "delivery-bed": { label: "Cama de Parto", urlSlug: "delivery-bed" },
    "medical-trolleys": { label: "Carro Médico", urlSlug: "medical-trolleys" },
    "bedside-table": { label: "Mesilla de Noche", urlSlug: "bedside-table" },
    "medical-cabinet": { label: "Gabinete Médico", urlSlug: "medical-cabinet" },
    "peripheral-products": { label: "Productos Periféricos", urlSlug: "peripheral-products" },
    "patient-lift": { label: "Elevación de Pacientes", urlSlug: "patient-lift" }
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

// Strips HTML tags
const cleanHtml = (html: string): string => {
    if (!html) return '';
    const decoded = decodeHtml(html);
    return decoded
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

// Extract model name from the relative URL basename
const getModelFromUrl = (url: string): string => {
    const parts = url.split('/').pop()?.replace('.html', '').split('-') || [];
    if (parts.length === 0) return 'Genérico';
    
    let model = parts[0].toUpperCase();
    if (parts[1] && (parts[0].length <= 3 || !isNaN(Number(parts[1])))) {
        model += '-' + parts[1].toUpperCase();
        if (parts[2] && !isNaN(Number(parts[2]))) {
            model += '-' + parts[2].toUpperCase();
        }
    }
    return model;
};

// Parse detail URLs from category list pages
const getProductLinks = (html: string): string[] => {
    const regex = /href="(\/products\/[^"]+\.html)"/g;
    const links: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        links.push(match[1]);
    }
    return Array.from(new Set(links));
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
                    sendUpdate({ type: 'status', message: 'Iniciando conexión con Pukang Medical...' });

                    // 1. Resolve target category slugs to process
                    const categoriesToProcess = requestCategory === "all"
                        ? Object.keys(CATEGORY_MAP)
                        : [requestCategory];

                    const allDetailLinks: { link: string; categoryKey: string }[] = [];

                    for (const catKey of categoriesToProcess) {
                        const catInfo = CATEGORY_MAP[catKey];
                        if (!catInfo) continue;

                        sendUpdate({ type: 'status', message: `Buscando productos en categoría: ${catInfo.label}...` });
                        console.log(`[Scraper] Finding products in category: ${catInfo.label}`);

                        let page = 1;
                        let hasMore = true;

                        while (hasMore && page <= 25) {
                            const targetUrl = `https://es.pukangmed.com/${catInfo.urlSlug}.html?page=${page}`;
                            console.log(`[Scraper] Fetching page: ${targetUrl}`);

                            const response = await fetch(targetUrl, { headers: HEADERS });
                            if (!response.ok) {
                                console.log(`[Scraper] Stopped category paging at page ${page} due to status ${response.status}`);
                                break;
                            }

                            const html = await response.text();
                            const links = getProductLinks(html);

                            if (links.length === 0) {
                                hasMore = false;
                            } else {
                                links.forEach(link => {
                                    if (!allDetailLinks.some(item => item.link === link)) {
                                        allDetailLinks.push({ link, categoryKey: catKey });
                                    }
                                });
                                page++;
                            }

                            // Wait 300ms between page lists
                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                    }

                    console.log(`[Scraper] Successfully found ${allDetailLinks.length} unique products.`);
                    sendUpdate({ type: 'info', total: allDetailLinks.length, message: `Se encontraron ${allDetailLinks.length} productos en Pukang Medical para importar.` });

                    let importedCount = 0;
                    let processedCount = 0;

                    for (const item of allDetailLinks) {
                        processedCount++;
                        const detailUrl = `https://es.pukangmed.com${item.link}`;
                        console.log(`[Scraper] Fetching product details: ${detailUrl}`);

                        let decodedTitle = '';

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

                            // Parse Title
                            const titleMatch = html.match(/<h1 class="prob-title[^"]*">([\s\S]*?)<\/h1>/);
                            const rawTitle = titleMatch ? titleMatch[1] : '';
                            decodedTitle = cleanHtml(rawTitle);

                            if (!decodedTitle) {
                                console.warn(`[Scraper] Could not parse title for URL: ${detailUrl}. Skipping...`);
                                continue;
                            }

                            // Parse Category from breadcrumb or use mapped category label
                            const breadcrumbMatch = html.match(/<div class="m-crm[\s\S]*?<span class="active"[^>]*>([\s\S]*?)<\/span>/);
                            let resolvedCategory = breadcrumbMatch ? cleanHtml(breadcrumbMatch[1]) : CATEGORY_MAP[item.categoryKey]?.label || 'Muebles Hospitalarios';
                            
                            // Keep category values clean
                            if (resolvedCategory.toLowerCase() === 'casa' || resolvedCategory.toLowerCase() === 'productos') {
                                resolvedCategory = CATEGORY_MAP[item.categoryKey]?.label || 'Muebles Hospitalarios';
                            }

                            // Parse Description
                            const descMatch = html.match(/<div class="bitem-desc m-desc">([\s\S]*?)<\/div>/);
                            const descClean = descMatch ? cleanHtml(descMatch[1]) : '';
                            const descShortClean = descClean ? descClean.substring(0, 200) : '';

                            // Parse Image
                            const bigImgDivMatch = html.match(/<div class="prob-pic-big-img">([\s\S]*?)<\/div>/);
                            let originalImageUrl = '';
                            if (bigImgDivMatch) {
                                const srcMatch = bigImgDivMatch[1].match(/src="([^"]+)"/);
                                if (srcMatch) {
                                    originalImageUrl = srcMatch[1];
                                }
                            }
                            if (!originalImageUrl) {
                                const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
                                if (ogImageMatch) {
                                    originalImageUrl = ogImageMatch[1];
                                }
                            }

                            let finalImageUrl = '';

                            if (originalImageUrl) {
                                if (originalImageUrl.startsWith('//')) {
                                    originalImageUrl = 'https:' + originalImageUrl;
                                }
                                originalImageUrl = originalImageUrl.split('?')[0]; // Strip resize parameters to get raw image
                                finalImageUrl = originalImageUrl;

                                // Upload image to R2
                                try {
                                    console.log(`[Scraper] Downloading image: ${originalImageUrl}`);
                                    sendUpdate({ type: 'status', message: `Descargando imagen para: ${decodedTitle}` });
                                    
                                    const imgResponse = await fetch(originalImageUrl, { headers: HEADERS });
                                    if (imgResponse.ok) {
                                        const arrayBuffer = await imgResponse.arrayBuffer();
                                        const buffer = Buffer.from(arrayBuffer);
                                        const ext = originalImageUrl.split('.').pop() || 'jpg';
                                        const uniqueFileName = `scraped/pukang-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
                                        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';

                                        const r2Url = await uploadToR2(buffer, uniqueFileName, contentType);
                                        if (r2Url) {
                                            finalImageUrl = r2Url;
                                        }
                                    }
                                } catch (imgErr) {
                                    console.error(`[Scraper] Failed to upload image to R2 for ${decodedTitle}:`, imgErr);
                                }
                            }

                            // Model and Brand details
                            const brand = 'Pukang';
                            const model = getModelFromUrl(item.link);
                            const cleanSku = `PUKANG-${model.replace(/[^A-Z0-9-]/g, '')}`;

                            // Check if product already exists (by SKU) in the database
                            const existingProduct = await prisma.producto.findUnique({
                                where: { sku: cleanSku }
                            });

                            if (existingProduct) {
                                if (
                                    existingProduct.organizationId !== organizationId || 
                                    existingProduct.categoria !== resolvedCategory || 
                                    existingProduct.estado !== 'ACTIVO'
                                ) {
                                    await prisma.producto.update({
                                        where: { sku: cleanSku },
                                        data: { 
                                            organizationId,
                                            categoria: resolvedCategory,
                                            estado: 'ACTIVO'
                                        }
                                    });
                                }
                                sendUpdate({ 
                                    type: 'progress', 
                                    current: processedCount, 
                                    total: allDetailLinks.length, 
                                    product: `${decodedTitle} (Ya existe - Omitido)` 
                                });
                                continue;
                            }

                            // Create Producto entry in the database
                            console.log(`[Scraper] Creating product: ${decodedTitle} (${cleanSku})`);
                            await prisma.producto.create({
                                data: {
                                    organizationId,
                                    sku: cleanSku,
                                    nombre: decodedTitle,
                                    descripcion: descClean,
                                    imagenWeb: finalImageUrl || null,
                                    tituloWeb: decodedTitle,
                                    descripcionWeb: descShortClean || null,
                                    marca: brand,
                                    modelo: model,
                                    precioVenta: 0,
                                    costoBase: 0,
                                    stockActual: 0,
                                    stockMinimo: 0,
                                    estado: 'ACTIVO',
                                    categoria: resolvedCategory
                                }
                            });

                            importedCount++;
                            sendUpdate({ 
                                type: 'progress', 
                                current: processedCount, 
                                total: allDetailLinks.length, 
                                product: decodedTitle 
                            });

                        } catch (err: any) {
                            console.error(`[Scraper] Error processing details for link ${item.link}:`, err);
                            sendUpdate({ 
                                type: 'progress', 
                                current: processedCount, 
                                total: allDetailLinks.length, 
                                product: `Error al procesar: ${decodedTitle || item.link}` 
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
