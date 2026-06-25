import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToR2 } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
};

const CATEGORY_MAP: Record<string, { label: string; wpCatId: number; slug: string }> = {
    "anestesia": { label: "Equipos de Anestesia", wpCatId: 1964, slug: "anesthesia" },
    "aspiradores-succion": { label: "Aspiradores y Bombas de Succión", wpCatId: 2040, slug: "aspirators-suction-pumps" },
    "electrocirugia": { label: "Equipos de Electrocirugía", wpCatId: 2006, slug: "electrosurgical-power-generators" },
    "endoscopia-laparoscopia": { label: "Endoscopía y Laparoscopía", wpCatId: 1984, slug: "endoscopy-laparoscopy" },
    "lamparas-quirurgicas": { label: "Lámparas Quirúrgicas", wpCatId: 2032, slug: "lights" },
    "microscopios": { label: "Microscopios Clínicos y Quirúrgicos", wpCatId: 1992, slug: "microscopios" },
    "mobiliario-quirofano": { label: "Mobiliario de Quirófano", wpCatId: 2047, slug: "or-furniture" },
    "motores-quirurgicos": { label: "Motores e Instrumental de Poder", wpCatId: 2002, slug: "power-instruments" },
    "sillones-procedimiento": { label: "Sillones de Procedimiento", wpCatId: 2025, slug: "procedure-chairs" },
    "camillas-quirurgicas": { label: "Camillas Quirúrgicas y de Transporte", wpCatId: 2010, slug: "stretchers" },
    "compresion-secuencial": { label: "Dispositivos de Compresión Secuencial", wpCatId: 2123, slug: "sequential-compression-devices" },
    "esterilizacion-autoclaves": { label: "Esterilizadores y Autoclaves", wpCatId: 1996, slug: "sterile-processing" },
    "instrumental-quirurgico": { label: "Instrumental Quirúrgico", wpCatId: 2087, slug: "surgical-instruments" },
    "mesas-quirurgicas": { label: "Mesas Quirúrgicas", wpCatId: 2027, slug: "tables-surgical" },
    "sistemas-torniquete": { label: "Sistemas de Torniquete", wpCatId: 2124, slug: "tourniquets-systems" },
    "camas-hospital": { label: "Camas de Hospital", wpCatId: 2035, slug: "hospital-beds" },
    "cunas-incubadoras": { label: "Cuidado Neonatal e Incubadoras", wpCatId: 2019, slug: "neonatal-care" },
    "desfibriladores": { label: "Desfibriladores y DEAs", wpCatId: 1967, slug: "aeds-defibrillators" },
    "electrocardiografos": { label: "Electrocardiógrafos (ECG/EKG)", wpCatId: 2091, slug: "electrocardiogram-ecg-ekg" },
    "monitores-fetal": { label: "Monitores Fetales", wpCatId: 2020, slug: "fetal-monitor" },
    "monitores-paciente": { label: "Monitores de Signos Vitales y Paciente", wpCatId: 1972, slug: "patient-monitors" },
    "mesas-imagenologia": { label: "Mesas de Imagenología", wpCatId: 2021, slug: "imaging-tables" },
    "ultrasonidos": { label: "Equipos de Ultrasonido", wpCatId: 1987, slug: "ultrasounds" }
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
        .replace(/&#8211;/g, '-')
        .replace(/&#8212;/g, '-')
        .replace(/&#8216;/g, "'")
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"')
        .replace(/&#038;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
};

// Strips HTML tags and formats nicely
const cleanHtml = (html: string): string => {
    if (!html) return '';
    let text = decodeHtml(html);

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

// Translation Helper using Google's free translation API
const translateText = async (text: string): Promise<string> => {
    if (!text || !text.trim()) return '';
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
            const data = await res.json();
            if (data && data[0]) {
                return data[0].map((x: any) => x[0]).join('');
            }
        }
    } catch (err) {
        console.error('[Scraper DRE Translation Error]:', err);
    }
    return text; // Return original English text as fallback
};

async function uploadImageFromUrl(url: string, prefix: string): Promise<string | null> {
    try {
        const res = await fetch(url, { headers: HEADERS });
        if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
            const uniqueFileName = `scraped/${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
            const contentType = res.headers.get('content-type') || 'image/jpeg';
            return await uploadToR2(buffer, uniqueFileName, contentType);
        }
    } catch (err) {
        console.error(`[Scraper DRE] Failed to download and upload image ${url}:`, err);
    }
    return null;
}

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
                    sendUpdate({ type: 'status', message: 'Iniciando conexión con la API REST de DRE Medical...' });

                    // 1. Resolve categories to process
                    const categoriesToProcess = requestCategory === "all"
                        ? Object.keys(CATEGORY_MAP)
                        : [requestCategory];

                    const allProductsToImport: {
                        id: number;
                        title: string;
                        slug: string;
                        descriptionHtml: string;
                        excerptHtml: string;
                        featuredMediaId: number;
                        categoryLabel: string;
                    }[] = [];

                    for (const catKey of categoriesToProcess) {
                        const catInfo = CATEGORY_MAP[catKey];
                        if (!catInfo) continue;

                        sendUpdate({ type: 'status', message: `Obteniendo listado de productos de la categoría: ${catInfo.label}...` });
                        console.log(`[Scraper DRE] Loading category: ${catInfo.label} (ID: ${catInfo.wpCatId})`);

                        let page = 1;
                        let hasMore = true;

                        while (hasMore) {
                            const targetUrl = `https://dremed.com/wp-json/wp/v2/product?product_cat=${catInfo.wpCatId}&per_page=100&page=${page}`;
                            console.log(`[Scraper DRE] Fetching products page: ${targetUrl}`);

                            const response = await fetch(targetUrl, { headers: HEADERS });
                            if (!response.ok) {
                                console.log(`[Scraper DRE] Finished fetching category ${catInfo.label} page ${page}: status ${response.status}`);
                                hasMore = false;
                                continue;
                            }

                            const productsJson = await response.json();
                            if (!Array.isArray(productsJson) || productsJson.length === 0) {
                                hasMore = false;
                                continue;
                            }

                            for (const prod of productsJson) {
                                if (!allProductsToImport.some(p => p.id === prod.id)) {
                                    allProductsToImport.push({
                                        id: prod.id,
                                        title: decodeHtml(prod.title?.rendered || ''),
                                        slug: prod.slug || '',
                                        descriptionHtml: prod.content?.rendered || '',
                                        excerptHtml: prod.excerpt?.rendered || '',
                                        featuredMediaId: prod.featured_media || 0,
                                        categoryLabel: catInfo.label
                                    });
                                }
                            }

                            page++;
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                    }

                    console.log(`[Scraper DRE] Found ${allProductsToImport.length} unique products to process.`);
                    sendUpdate({ type: 'info', total: allProductsToImport.length, message: `Se encontraron ${allProductsToImport.length} productos en DRE Medical para importar.` });

                    let importedCount = 0;
                    let processedCount = 0;

                    for (const item of allProductsToImport) {
                        processedCount++;
                        const cleanSku = `DRE-${item.id}`;
                        console.log(`[Scraper DRE] Processing product ${processedCount}/${allProductsToImport.length}: ${item.title}`);

                        try {
                            // Translate fields to Spanish
                            sendUpdate({ type: 'status', message: `Traduciendo ficha al español: ${item.title}` });
                            const titleEs = await translateText(item.title);
                            
                            const descClean = cleanHtml(item.descriptionHtml);
                            const descEs = await translateText(descClean);

                            const shortDescClean = cleanHtml(item.excerptHtml);
                            const shortDescEs = await translateText(shortDescClean);

                            // Retrieve all images associated with this product parent
                            sendUpdate({ type: 'status', message: `Obteniendo galería de imágenes para: ${item.title}` });
                            let mainImageUrl = '';
                            const galleryUrls: string[] = [];

                            const mediaUrl = `https://dremed.com/wp-json/wp/v2/media?parent=${item.id}&per_page=50`;
                            const mediaResponse = await fetch(mediaUrl, { headers: HEADERS });
                            
                            if (mediaResponse.ok) {
                                const mediaList = await mediaResponse.json();
                                if (Array.isArray(mediaList)) {
                                    // Sort to make sure featured media or first attachment is mapped correctly
                                    for (const media of mediaList) {
                                        const originalUrl = media.source_url;
                                        if (originalUrl) {
                                            sendUpdate({ type: 'status', message: `Subiendo imagen a R2: ${media.title?.rendered || 'archivo'}` });
                                            const r2Url = await uploadImageFromUrl(originalUrl, 'dre');
                                            if (r2Url) {
                                                if (media.id === item.featuredMediaId) {
                                                    mainImageUrl = r2Url;
                                                } else {
                                                    galleryUrls.push(r2Url);
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Fallback if mainImageUrl was not set in parent loop but we have gallery images
                            if (!mainImageUrl && galleryUrls.length > 0) {
                                mainImageUrl = galleryUrls.shift() || '';
                            }

                            // Extract brand from title or use DRE as fallback
                            let brand = 'DRE';
                            const titleTokens = item.title.split(' ');
                            if (titleTokens.length > 0 && titleTokens[0].toLowerCase() !== 'dre') {
                                brand = titleTokens[0];
                            }

                            // Extract model (first alphanumeric token after brand, if any)
                            let model = 'N/A';
                            if (titleTokens.length > 1) {
                                model = titleTokens[1].toUpperCase().replace(/[^A-Z0-9-]/g, '');
                            }

                            // Check if product already exists in database
                            const existingProduct = await prisma.producto.findUnique({
                                where: { sku: cleanSku }
                            });

                            if (existingProduct) {
                                // Update basic fields
                                await prisma.producto.update({
                                    where: { sku: cleanSku },
                                    data: {
                                        organizationId,
                                        categoria: item.categoryLabel,
                                        estado: 'ACTIVO',
                                        nombre: titleEs,
                                        descripcion: descEs,
                                        imagenWeb: mainImageUrl || existingProduct.imagenWeb,
                                        imagenes: galleryUrls.length > 0 ? galleryUrls : existingProduct.imagenes,
                                        tituloWeb: titleEs,
                                        descripcionWeb: shortDescEs || existingProduct.descripcionWeb
                                    }
                                });
                                
                                sendUpdate({
                                    type: 'progress',
                                    current: processedCount,
                                    total: allProductsToImport.length,
                                    product: `${titleEs} (Actualizado)`
                                });
                                continue;
                            }

                            // Create new product
                            console.log(`[Scraper DRE] Creating product: ${titleEs} (${cleanSku})`);
                            await prisma.producto.create({
                                data: {
                                    organizationId,
                                    sku: cleanSku,
                                    nombre: titleEs,
                                    descripcion: descEs,
                                    imagenWeb: mainImageUrl || null,
                                    imagenes: galleryUrls,
                                    tituloWeb: titleEs,
                                    descripcionWeb: shortDescEs || null,
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
                                total: allProductsToImport.length,
                                product: titleEs
                            });

                        } catch (err: any) {
                            console.error(`[Scraper DRE] Error processing product ID ${item.id}:`, err);
                            sendUpdate({
                                type: 'progress',
                                current: processedCount,
                                total: allProductsToImport.length,
                                product: `Error al procesar: ${item.title}`
                            });
                        }

                        // Respect rate limiting
                        await new Promise(resolve => setTimeout(resolve, 800));
                    }

                    sendUpdate({ type: 'success', count: importedCount, total: allProductsToImport.length });
                    controller.close();

                } catch (err: any) {
                    console.error('[Scraper DRE Stream Error]:', err);
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
        console.error('[Scraper DRE Endpoint Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
