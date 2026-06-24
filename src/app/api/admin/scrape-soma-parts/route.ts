import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToR2 } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8'
};

const CATEGORY_MAP_PARTS: Record<string, number> = {
    // BP
    "bp": 4583,
    "bp-connectors": 4662,
    "ibp-cables": 4663,
    "nibp-cuffs": 4664,
    "nibp-hoses": 4638,
    "tourniquet-cuffs": 4586,
    "tourniquet-hoses": 4587,

    // Consumables
    "consumables": 4610,
    "batteries": 4612,
    "blades": 4611,
    "blankets-sleeves": 4676,
    "bulbs": 4613,

    // Disposables
    "disposables": 4615,
    "aed-defib-pads": 4681,
    "esu-electrodes": 4683,

    // ECG
    "ecg": 4556,
    "defib-pacer-cables": 4691,
    "ecg-accessories": 4578,
    "ecg-leadwires": 4576,
    "ecg-one-piece-cables": 4557,
    "ecg-trunk-cables": 4694,

    // Light Cables
    "light-cables": 4601,
    "endoscopy-light-cables": 4603,
    "headlight-cables": 4602,
    "light-cables-miscroscopes": 4696,

    // Mattress
    "mattress": 4560,
    "incubators-warmers-pads": 4643,
    "infant-pads": 4565,
    "stretcher-mattress": 4644,
    "surgical-table-pads": 4562,

    // Mounting Solution
    "mounting-solution": 4605,
    "iv_poles": 4608,
    "brackets": 4609,
    "rolling-stands": 4606,
    "wall-mounts": 4607,

    // O2-Co2
    "o2-co2": 4566,
    "canulae": 4574,
    "co2-sensors": 4700,
    "others-o2-co2": 4701,
    "oxygen-cell": 4575,
    "patient-circuits": 4703,
    "water-traps": 4567,

    // Others
    "others": 4619,
    "cables-harness": 4755,
    "cylinders": 4736,
    "foot-switches": 4704,
    "hand-control": 4705,
    "hoses": 4725,
    "power-supply-cords": 4751,
    "regulators": 4752,

    // Paper
    "paper": 4621,
    "paper-rolls": 4622,
    "z-fold-paper-pack": 4707,

    // Product Type
    "product-type": 4563,
    "aed-defibs": 4598,
    "anesthesia-vents": 4708,
    "ekg-accessories": 4600,
    "esu-accessories": 4597,
    "fetal-monitor": 4599,
    "patient-monitor": 4635,
    "stretchers-acc": 4645,
    "surgical-table-accessories": 4572,
    "tourniquet": 4561,

    // Repair Parts
    "repair-parts": 4590,
    "circuit-boards": 4595,
    "display-touch-screen": 4709,
    "keypads-overlays": 4710,
    "parameter-modules": 4596,
    "rollers-belts": 4592,
    "wheels-casters": 4594,

    // Spo2
    "spo2": 4558,
    "spo2-accessories": 4580,
    "spo2-cables": 4579,
    "spo2-one-piece-sensors": 4712,
    "spo2-sensors": 4559,

    // Temp
    "temp": 4620,
    "temp-cables-adapters": 4713,
    "temperature-sensors": 4714
};

const CATEGORY_NAMES_PARTS: Record<string, string> = {
    "bp": "BP (Blood Pressure)",
    "bp-connectors": "BP Connectors",
    "ibp-cables": "IBP Cables",
    "nibp-cuffs": "NIBP Cuffs",
    "nibp-hoses": "NIBP Hoses",
    "tourniquet-cuffs": "Tourniquet Cuffs",
    "tourniquet-hoses": "Tourniquet Hoses",
    "consumables": "Consumables",
    "batteries": "Batteries",
    "blades": "Blades",
    "blankets-sleeves": "Blankets & Sleeves",
    "bulbs": "Bulbs",
    "disposables": "Disposables",
    "aed-defib-pads": "AED-Defib Pads",
    "esu-electrodes": "ESU Electrodes",
    "ecg": "ECG",
    "defib-pacer-cables": "Defib-Pacer Cables",
    "ecg-accessories": "ECG Accessories",
    "ecg-leadwires": "ECG Leadwires",
    "ecg-one-piece-cables": "ECG One-Piece Cables",
    "ecg-trunk-cables": "ECG Trunk Cables",
    "light-cables": "Light Cables",
    "endoscopy-light-cables": "Endoscopy Light Cables",
    "headlight-cables": "Headlights & Cables",
    "light-cables-miscroscopes": "Microscopes Light Cables",
    "mattress": "Mattress",
    "incubators-warmers-pads": "Incubators & Warmers Pads",
    "infant-pads": "Infant Pads",
    "stretcher-mattress": "Stretcher Mattress",
    "surgical-table-pads": "Surgical Table Pads",
    "mounting-solution": "Mounting Solution",
    "iv_poles": "IV Poles",
    "brackets": "Mounts & Brackets",
    "rolling-stands": "Rolling Stand/Carts",
    "wall-mounts": "Wall Mounts",
    "o2-co2": "O2-Co2",
    "canulae": "Canulae",
    "co2-sensors": "Co2 Sensors",
    "others-o2-co2": "Others (O2-Co2)",
    "oxygen-cell": "Oxygen Cell",
    "patient-circuits": "Patient Circuits",
    "water-traps": "Water Traps",
    "paper": "Paper",
    "paper-rolls": "Paper Rolls",
    "z-fold-paper-pack": "Z-fold Paper Pack",
    "product-type": "Product Type",
    "aed-defibs": "AED & Defibs",
    "anesthesia-vents": "Anesthesia-Vents",
    "ekg-accessories": "EKG-Stress Test",
    "esu-accessories": "ESU Accessories",
    "fetal-monitor": "Fetal Monitor",
    "patient-monitor": "Patient Monitor",
    "stretchers-acc": "Stretchers Acc",
    "surgical-table-accessories": "Surgical Table Accessories",
    "tourniquet": "Tourniquet Accessories",
    "repair-parts": "Repair Parts",
    "circuit-boards": "Circuit Boards",
    "display-touch-screen": "Display & Touch Screen",
    "keypads-overlays": "KeyPads & Overlays",
    "parameter-modules": "Parameter Modules",
    "rollers-belts": "Rollers & Belts",
    "wheels-casters": "Wheels & Casters",
    "spo2": "Spo2",
    "spo2-accessories": "SpO2 Accessories",
    "spo2-cables": "SpO2 Cables",
    "spo2-one-piece-sensors": "SpO2 One-Piece Sensors",
    "spo2-sensors": "SpO2 Sensors",
    "temp": "Temp",
    "temp-cables-adapters": "Temp Cables & Adapters",
    "temperature-sensors": "Temperature Sensors",
    "others": "Others",
    "cables-harness": "Cables & Harness",
    "cylinders": "Cylinders",
    "foot-switches": "Foot Switches",
    "hand-control": "Hand Control",
    "hoses": "Hoses",
    "power-supply-cords": "Power Supply & Cords",
    "regulators": "Regulators"
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
    return firstWord || "Soma Medical Parts";
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

// Fetch with direct attempt and proxy fallback with exponential backoff retries
async function fetchWithFallback(url: string, options: any = {}): Promise<any> {
    const requestHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
        ...options.headers
    };

    let lastResponse: any = null;
    let lastError: any = null;

    // 1. Direct attempt
    try {
        console.log(`[Scraper Parts] Trying direct fetch: ${url}`);
        const response: any = await fetch(url, { ...options, headers: requestHeaders });
        if (response.ok) {
            return response;
        }
        console.log(`[Scraper Parts] Direct fetch failed with status ${response.status}`);
        lastResponse = response;
    } catch (err: any) {
        console.log(`[Scraper Parts] Direct fetch failed with error: ${err.message}`);
        lastError = err;
    }

    // 2. Fallback to api.allorigins.win
    console.log(`[Scraper Parts] Falling back to proxy for: ${url}`);
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    
    const maxRetries = 3;
    let delay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[Scraper Parts] Proxy fetch attempt ${attempt}/${maxRetries}: ${proxyUrl}`);
            const proxyResponse: any = await fetch(proxyUrl, {
                ...options,
                headers: {
                    ...requestHeaders,
                    'Cache-Control': 'no-cache'
                }
            });
            if (proxyResponse.ok) {
                return proxyResponse;
            }
            console.warn(`[Scraper Parts] Proxy attempt ${attempt} failed with status ${proxyResponse.status}`);
            lastResponse = proxyResponse;
        } catch (proxyErr: any) {
            console.warn(`[Scraper Parts] Proxy attempt ${attempt} failed with error: ${proxyErr.message}`);
            lastError = proxyErr;
        }

        if (attempt < maxRetries) {
            console.log(`[Scraper Parts] Waiting ${delay}ms before retrying proxy...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }

    // If both failed, return the last response if we got one, otherwise throw the last exception
    if (lastResponse) {
        return lastResponse;
    }
    throw lastError || new Error(`Failed to fetch ${url} directly and via proxy.`);
}

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
                    sendUpdate({ type: 'status', message: 'Iniciando conexión con Soma Medical Parts...' });

                    let allProducts: any[] = [];
                    let page = 1;
                    let hasMore = true;

                    while (hasMore) {
                        let targetUrl = `https://somamedicalparts.com/wp-json/wc/store/v1/products?per_page=100&page=${page}`;
                        if (requestCategory !== "all" && CATEGORY_MAP_PARTS[requestCategory]) {
                            const categoryId = CATEGORY_MAP_PARTS[requestCategory];
                            targetUrl = `https://somamedicalparts.com/wp-json/wc/store/v1/products?category=${categoryId}&per_page=100&page=${page}`;
                        }

                        console.log(`[Scraper Parts] Fetching products from live URL: ${targetUrl}`);
                        sendUpdate({ type: 'status', message: `Descargando repuestos, página ${page}...` });

                        const response = await fetchWithFallback(targetUrl, { headers: HEADERS });
                        if (!response.ok) {
                            if (page === 1) {
                                throw new Error(`Error de red al consultar Soma Medical Parts (Código: ${response.status})`);
                            } else {
                                console.log(`[Scraper Parts] Stopped paging at page ${page} due to status ${response.status}`);
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

                    console.log(`[Scraper Parts] Successfully fetched ${allProducts.length} products total.`);
                    sendUpdate({ type: 'info', total: allProducts.length, message: `Se encontraron ${allProducts.length} repuestos en Soma Medical Parts.` });

                    let importedCount = 0;
                    let processedCount = 0;

                    for (const item of allProducts) {
                        processedCount++;
                        const decodedName = decodeHtml(item.name || '');
                        const brand = extractBrand(decodedName);
                        const model = extractModel(decodedName, brand);
                        
                        // Clean up SKU generation using REP- prefix and avoiding Soma naming
                        const originalSku = item.sku ? String(item.sku).trim() : '';
                        const cleanSku = originalSku 
                            ? `REP-${originalSku.toUpperCase().replace(/[^A-Z0-9-]/g, '')}` 
                            : `REP-${item.id}`;

                        let categoryName = item.categories?.[0]?.name || 'Repuestos / Accesorios';
                        if (requestCategory !== "all" && CATEGORY_NAMES_PARTS[requestCategory]) {
                            const matchedCategory = item.categories?.find(
                                (c: any) => c.slug === requestCategory || String(c.id) === String(CATEGORY_MAP_PARTS[requestCategory])
                            );
                            if (matchedCategory) {
                                categoryName = matchedCategory.name;
                            } else {
                                categoryName = CATEGORY_NAMES_PARTS[requestCategory];
                            }
                        }

                        // Check if product already exists (by SKU) in the database
                        const existingProduct = await prisma.producto.findUnique({
                            where: { sku: cleanSku }
                        });

                        if (existingProduct) {
                            // If it exists, make sure organization, category, and active state are updated
                            if (
                                existingProduct.organizationId !== organizationId || 
                                existingProduct.categoria !== categoryName || 
                                existingProduct.estado !== 'ACTIVO'
                            ) {
                                console.log(`[Scraper Parts] Updating product SKU ${cleanSku}`);
                                await prisma.producto.update({
                                    where: { sku: cleanSku },
                                    data: { 
                                        organizationId,
                                        categoria: categoryName,
                                        estado: 'ACTIVO'
                                    }
                                });
                            }
                            console.log(`[Scraper Parts] Product with SKU ${cleanSku} already exists. Skipping...`);
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
                                console.log(`[Scraper Parts] Downloading image for ${decodedName}: ${originalImageUrl}`);
                                sendUpdate({ type: 'status', message: `Descargando imagen comercial para: ${decodedName}` });
                                const imgResponse = await fetchWithFallback(originalImageUrl, { headers: HEADERS });
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
                                        console.log(`[Scraper Parts] Image successfully uploaded to R2: ${r2Url}`);
                                    }
                                }
                            } catch (imgErr) {
                                console.error(`[Scraper Parts] Failed to download or upload image to R2 for ${decodedName}:`, imgErr);
                                // Keep original URL as fallback if R2 upload fails
                            }
                        }

                        // Upsert the Producto entry in the database
                        console.log(`[Scraper Parts] Creating product: ${decodedName} with SKU: ${cleanSku}`);
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
                    console.error('[Scraper Parts Stream Error]:', err);
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
        console.error('[Scraper Parts Endpoint Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
