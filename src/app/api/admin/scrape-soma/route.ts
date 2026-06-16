import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToR2 } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8'
};

const CATEGORY_MAP: Record<string, number> = {
    "analizador-de-coagulacion": 44,
    "arcos-en-c": 66,
    "artroscopios": 102,
    "autoclaves-esterilizadores": 61,
    "autotransfusion": 110,
    "bacinetes-pediatricos": 9507,
    "bipap": 88,
    "bisturies-armonicos": 89,
    "bomba-de-alimentacion": 9503,
    "bombas-de-jeringe": 57,
    "bombas-de-succion": 54,
    "bombas-intra-aorticas": 96,
    "bombas-intravenosas": 52,
    "bombas-portatiles-de-infusion": 4779,
    "cabezales-medicos": 10577,
    "calentador-enfriador": 82,
    "calentador-de-fluidos": 912,
    "calentador-de-mantas": 83,
    "calentadores": 7029,
    "camaras-de-video": 99,
    "camas-de-hospital": 272,
    "camillas": 58,
    "camillas-de-transporte": 4778,
    "capturadores-de-imagenes": 63,
    "cardiologia": 130,
    "cardiovascular": 131,
    "carros-de-anestesia": 9506,
    "carros-de-emergencia": 9505,
    "carros-de-paro": 307,
    "cistoscopios": 103,
    "colposcopios": 9501,
    "cortador-de-yeso": 9696,
    "cunas-termicas": 56,
    "desfibriladores": 97,
    "desfibriladores-medicos": 117,
    "desfibriladores-automaticos-externos": 92,
    "desfibriladores-portatiles": 4765,
    "unidades-electroquirurgicas-electrobisturis": 76,
    "ekg-interpretativo-y-no-interpretativo": 49,
    "electroencefalogramas-eeg": 6091,
    "endoscopia": 118,
    "endoscopios-flexibles": 7015,
    "endoscopios-rigidos": 7010,
    "algologia": 7006,
    "escaneres-de-vejiga": 1157,
    "evacuadores-de-humo": 9627,
    "fibroscopios": 95,
    "fuentes-de-luz": 74,
    "generador-de-radiofrecuencia": 9529,
    "ucii-nicu-unidades-neonatales-cuidado-intensivo": 132,
    "imagenologia-radiologia": 127,
    "impresoras": 106,
    "incubadoras": 55,
    "incubadoras-de-transporte": 4772,
    "instrumental-de-cirugia": 4530,
    "insufladores": 108,
    "inyectores-para-campo-magnetico": 6039,
    "luces-de-cirugia-lamparas-quirurgicas": 71,
    "laparoscopios": 101,
    "scrub-sinks": 123,
    "limpiadores-ultrasonicos": 2382,
    "maquinas-de-anestesia": 48,
    "maquinas-de-corazon-y-pulmon": 78,
    "maquinas-para-hiper-hipotermia": 9504,
    "marcapasos-externos": 7504,
    "mesa-de-examen": 10069,
    "mesas-de-cirugia": 72,
    "mesas-quirurgicas-de-urologia": 10933,
    "mesas-transducidas": 136,
    "microscopios-de-cirugia": 69,
    "microscopios-para-oftalmologa": 70,
    "microscopios-para-otorrinolaringologo": 68,
    "mini-arcos-en-c": 53,
    "miscelaneos": 10711,
    "monitor-multiparametro-para-uti": 185,
    "monitores": 107,
    "monitores-bis": 7249,
    "monitores-de-agente-y-co2": 60,
    "monitores-de-capnografia": 9500,
    "monitores-de-oxigeno": 81,
    "monitores-de-paciente-portatiles": 4764,
    "monitores-de-pantalla-plana": 7014,
    "monitores-de-presin-sanguinea-no-invasiva": 67,
    "monitores-de-signos-vitales": 129,
    "monitores-de-volumen": 79,
    "monitores-fetales": 3649,
    "monitores-fetales-antepartum": 46,
    "monitores-fetales-intrapartum": 105,
    "monitores-multiparametros": 50,
    "neurocirugia": 90,
    "oximetro-de-pulso": 65,
    "procesadores-de-video": 7016,
    "productos-destacados": 2871,
    "rayos-x-portables": 94,
    "razuradores-artroscopicos": 100,
    "reprocesador-para-endoscopios": 9572,
    "calentadores-de-pacientes": 7028,
    "sistema-de-compresion-secuencial": 9531,
    "sistemas-completos-de-endoscopia": 7012,
    "sistemas-completos-de-laparoscopia": 7011,
    "sistemas-de-alto-flujo": 6174,
    "sistemas-de-pruebas-de-esfuerzo": 75,
    "sistemas-de-telemetria": 86,
    "sistemas-hardwired": 80,
    "sistemas-quirurgicos-de-slush": 291,
    "soluciones-de-anestesia": 7007,
    "terapia-respiratoria": 7009,
    "obgyn-ucin": 7005,
    "stirrups": 3206,
    "terapia-intravenosa": 121,
    "torniquetes": 77,
    "sistema-de-video-endoscopia": 84,
    "transductores-de-ultrasonido": 2032,
    "ultrasonidos": 91,
    "uncategorized": 9449,
    "uci": 7017,
    "unidades-emg": 47,
    "vaporizadores-de-anestesia": 62,
    "ventiladores": 51,
    "ventiladores-de-anestesia": 64,
    "ventiladores-portatil": 4780,
    "video-laringoscopios": 978,
    "video-endoscopia-y-laparoscopia": 7025
};

// Decodes common HTML entities returned by the WordPress REST API
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
        .replace(/&nbsp;/g, ' ');
};

// Strips HTML tags and decodes entities for clean database description text
const cleanHtml = (html: string): string => {
    if (!html) return '';
    const decoded = decodeHtml(html);
    return decoded
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

// Extract brand name from the product title
const extractBrand = (name: string): string => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes("datex") || nameLower.includes("ohmeda")) return "Datex Ohmeda";
    if (nameLower.includes("drager") || nameLower.includes("draeger") || nameLower.includes("dräger")) return "Dräger";
    if (nameLower.includes("zoll")) return "Zoll Medical";
    if (nameLower.includes("physio") || nameLower.includes("lifepak")) return "Physio-Control";
    if (nameLower.includes("mindray")) return "Mindray";
    if (nameLower.includes("philips")) return "Philips";
    if (nameLower.includes("steris")) return "Steris";
    if (nameLower.includes("maquet")) return "Maquet";
    if (nameLower.includes("stryker")) return "Stryker";
    if (nameLower.includes("ge ") || nameLower.includes("general electric")) return "General Electric";
    if (nameLower.includes("ecolab")) return "Ecolab";
    if (nameLower.includes("intensa")) return "Intensa";
    if (nameLower.includes("haemonetics")) return "Haemonetics";
    if (nameLower.includes("livanova")) return "LivaNova";
    if (nameLower.includes("hillrom") || nameLower.includes("hill-rom")) return "Hillrom";
    if (nameLower.includes("covidien")) return "Covidien";
    if (nameLower.includes("medtronic")) return "Medtronic";
    if (nameLower.includes("aspect")) return "Aspect";
    
    // Default brand to the first word or fallback
    const firstWord = name.split(' ')[0];
    return firstWord || "Soma Tech";
};

// Extract model name from product title by removing the brand name
const extractModel = (name: string, brand: string): string => {
    let model = name;
    const brandLower = brand.toLowerCase();
    
    if (model.toLowerCase().startsWith(brandLower)) {
        model = model.substring(brand.length).trim();
    } else {
        const brandWords = brand.split(' ');
        for (const word of brandWords) {
            if (word.length > 2) {
                const regex = new RegExp('\\b' + word + '\\b', 'gi');
                model = model.replace(regex, '');
            }
        }
    }
    
    model = model.replace(/\s+/g, ' ').trim();
    return model || "Genérico";
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

        // Parse category filter
        let requestCategory = "all";
        try {
            const body = await req.json();
            if (body.category) requestCategory = body.category;
        } catch {
            // Use default 'all' if body is empty
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const sendUpdate = (data: any) => {
                    controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
                };

                try {
                    sendUpdate({ type: 'status', message: 'Iniciando conexión con Soma Technology...' });

                    let allProducts: any[] = [];
                    let page = 1;
                    let hasMore = true;

                    while (hasMore) {
                        let targetUrl = `https://www.somatechnology.com/spanish/wp-json/wc/store/v1/products?per_page=100&page=${page}`;
                        if (requestCategory !== "all" && CATEGORY_MAP[requestCategory]) {
                            const categoryId = CATEGORY_MAP[requestCategory];
                            targetUrl = `https://www.somatechnology.com/spanish/wp-json/wc/store/v1/products?category=${categoryId}&per_page=100&page=${page}`;
                        }

                        console.log(`[Scraper] Fetching products from live URL: ${targetUrl}`);
                        sendUpdate({ type: 'status', message: `Descargando productos, página ${page}...` });

                        const response = await fetch(targetUrl, { headers: HEADERS });
                        if (!response.ok) {
                            if (page === 1) {
                                throw new Error(`Error de red al consultar Soma Technology (Código: ${response.status})`);
                            } else {
                                console.log(`[Scraper] Stopped paging at page ${page} due to status ${response.status}`);
                                break;
                            }
                        }

                        const scrapedProducts = await response.json();
                        if (!Array.isArray(scrapedProducts) || scrapedProducts.length === 0) {
                            hasMore = false;
                            break;
                        }

                        allProducts = allProducts.concat(scrapedProducts);
                        if (scrapedProducts.length < 100) {
                            hasMore = false;
                        } else {
                            page++;
                        }
                    }

                    console.log(`[Scraper] Successfully fetched ${allProducts.length} products total.`);
                    sendUpdate({ type: 'info', total: allProducts.length, message: `Se encontraron ${allProducts.length} productos en Soma Technology.` });

                    let importedCount = 0;
                    let processedCount = 0;

                    for (const item of allProducts) {
                        processedCount++;
                        const decodedName = decodeHtml(item.name || '');
                        const brand = extractBrand(decodedName);
                        const model = extractModel(decodedName, brand);
                        
                        // Clean up SKU generation
                        const cleanSku = `SOMA-${brand.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${model.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;

                        const categoryName = item.categories?.[0]?.name || 'Consumibles';

                        // Check if product already exists (by SKU) in the database
                        const existingProduct = await prisma.producto.findUnique({
                            where: { sku: cleanSku }
                        });

                        if (existingProduct) {
                            // If it exists, but lacks a category or belongs to a different organization, update it
                            if (existingProduct.organizationId !== organizationId || existingProduct.categoria !== categoryName) {
                                console.log(`[Scraper] Updating organizationId/category for product SKU ${cleanSku}`);
                                await prisma.producto.update({
                                    where: { sku: cleanSku },
                                    data: { 
                                        organizationId,
                                        categoria: categoryName
                                    }
                                });
                            }
                            console.log(`[Scraper] Product with SKU ${cleanSku} already exists. Skipping...`);
                            sendUpdate({ 
                                type: 'progress', 
                                current: processedCount, 
                                total: allProducts.length, 
                                product: `${decodedName} (Ya existe - Omitido)` 
                            });
                            continue;
                        }

                        const descClean = cleanHtml(item.description || '');
                        const descShortClean = cleanHtml(item.short_description || '') || descClean.substring(0, 200);

                        // Determine image URL
                        let originalImageUrl = '';
                        if (item.images && item.images.length > 0) {
                            originalImageUrl = item.images[0].src;
                        }

                        let finalImageUrl = originalImageUrl;

                        // Upload image to Cloudflare R2 if it exists
                        if (originalImageUrl) {
                            try {
                                console.log(`[Scraper] Downloading image for ${decodedName}: ${originalImageUrl}`);
                                sendUpdate({ type: 'status', message: `Descargando imagen comercial para: ${decodedName}` });
                                const imgResponse = await fetch(originalImageUrl, { headers: HEADERS });
                                if (imgResponse.ok) {
                                    const arrayBuffer = await imgResponse.arrayBuffer();
                                    const buffer = Buffer.from(arrayBuffer);
                                    const ext = originalImageUrl.split('.').pop()?.split('?')[0] || 'jpg';
                                    const uniqueFileName = `scraped/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
                                    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
                                    
                                    // Upload directly to R2 bucket!
                                    const r2Url = await uploadToR2(buffer, uniqueFileName, contentType);
                                    if (r2Url) {
                                        finalImageUrl = r2Url;
                                        console.log(`[Scraper] Image successfully uploaded to R2: ${r2Url}`);
                                    }
                                }
                            } catch (imgErr) {
                                console.error(`[Scraper] Failed to download or upload image to R2 for ${decodedName}:`, imgErr);
                                // Keep original URL as fallback if R2 upload fails
                            }
                        }

                        // Upsert the Producto entry in the database
                        console.log(`[Scraper] Creating product: ${decodedName} with SKU: ${cleanSku}`);
                        await prisma.producto.upsert({
                            where: { sku: cleanSku },
                            update: {
                                nombre: decodedName,
                                descripcion: descClean,
                                imagenWeb: finalImageUrl,
                                tituloWeb: decodedName,
                                descripcionWeb: descShortClean,
                                marca: brand,
                                modelo: model,
                                estado: 'ACTIVO',
                                categoria: categoryName
                            },
                            create: {
                                organizationId,
                                sku: cleanSku,
                                nombre: decodedName,
                                descripcion: descClean,
                                imagenWeb: finalImageUrl,
                                tituloWeb: decodedName,
                                descripcionWeb: descShortClean,
                                marca: brand,
                                modelo: model,
                                precioVenta: 0,
                                costoBase: 0,
                                stockActual: 0,
                                stockMinimo: 0,
                                estado: 'ACTIVO',
                                categoria: categoryName
                            }
                        });

                        importedCount++;
                        sendUpdate({ 
                            type: 'progress', 
                            current: processedCount, 
                            total: allProducts.length, 
                            product: decodedName 
                        });

                        // Wait 1 second between products to avoid rate limit bans
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    sendUpdate({ type: 'success', count: importedCount, total: allProducts.length });
                    controller.close();
                } catch (err: any) {
                    console.error('[Scraper Stream Error]:', err);
                    sendUpdate({ type: 'error', error: err.message || 'Error desconocido' });
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
