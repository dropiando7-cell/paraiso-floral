import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToR2 } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

interface Subcategory {
    value: string;
    label: string;
    path: string;
}

interface CategoryGroup {
    value: string;
    label: string;
    subcategories: Subcategory[];
}

const AMCAREMED_CATEGORIES: CategoryGroup[] = [
    {
        value: "fuente-de-gases-medicinales",
        label: "Fuente de gases medicinales",
        subcategories: [
            { value: "plantas-de-oxigeno-medicinal", label: "Plantas de oxígeno medicinal", path: "product/oxygen-plant" },
            { value: "almacenamiento-de-oxigeno-liquido", label: "Almacenamiento de oxígeno líquido", path: "product/cryogenic-liquid-oxygen-storage-system" },
            { value: "compresores-de-aire-medicinal", label: "Compresores de aire medicinal", path: "product/medical-air-compressor" },
            { value: "sistema-de-vacio-medico", label: "Sistema de vacío médico", path: "products/medical-vacuum-pump-system" },
            { value: "sistema-de-eliminacion-de-gases-anestesicos", label: "Sistema de eliminación de gases anestésicos", path: "product/agss" },
            { value: "colectores", label: "Colectores", path: "product/manifolds" },
            { value: "cilindros-de-gases-medicinales", label: "Cilindros de gases medicinales", path: "product/medical-gas-cylinders" },
            { value: "ambulance-oxygen-supply-system", label: "Ambulance Oxygen Supply System", path: "products/ambulance-oxygen-supply-system" }
        ]
    },
    {
        value: "gasoducto-de-gases-medicinales",
        label: "Gasoducto de gases medicinales",
        subcategories: [
            { value: "tubo-de-cobre-accesorios-y-accesorios", label: "Tubo de cobre, Accesorios, y Accesorios", path: "product/copper-tube-fittings-accessories" },
            { value: "salidas", label: "Salidas", path: "product/gas-outlets" },
            { value: "adaptadores-de-gases-medicinales", label: "Adaptadores de gases medicinales", path: "product/gas-outlets-probes-adapters" },
            { value: "unidad-de-cabecera-de-cama", label: "Unidad de cabecera de cama", path: "product/bed-head-unit" },
            { value: "caja-de-valvulas-de-zona", label: "Caja de válvulas de zona", path: "products/zone-valve-box" },
            { value: "alarmas-de-gases-medicinales", label: "Alarmas de gases medicinales", path: "product/alarms" },
            { value: "estacion-de-regulacion-de-gases-medicinales", label: "Estación de regulación de gases medicinales", path: "product/medical-gas-regulating-station" },
            { value: "valvulas-de-gases-medicinales", label: "Válvulas de gases medicinales", path: "product/medical-gas-valves" },
            { value: "panel-de-control-de-gases", label: "Panel de control de gases", path: "products/gas-control-panel" }
        ]
    },
    {
        value: "equipos-secundarios",
        label: "Equipos Secundarios",
        subcategories: [
            { value: "caudalimetros", label: "Caudalímetros", path: "product/medical-gas-flowmeters" },
            { value: "reguladores-de-oxigeno", label: "Reguladores de oxígeno", path: "product/medical-regulators" },
            { value: "reguladores-de-vacio", label: "Reguladores de vacío", path: "product/vacuum-regulator" },
            { value: "jarra-de-succion", label: "Jarra de Succión", path: "product/suction-jar" },
            { value: "mezclador-de-aire-y-oxigeno", label: "Mezclador de aire y oxígeno", path: "products/air-oxygen-blender" },
            { value: "accesorios-equipos", label: "Accesorios", path: "product/accessories" }
        ]
    },
    {
        value: "quirofano",
        label: "Quirófano",
        subcategories: [
            { value: "colgante-medico", label: "Colgante médico", path: "product/medical-pendant" },
            { value: "lamparas-quirurgicas", label: "Lámparas quirúrgicas", path: "product/surgical-lights" },
            { value: "electric-operating-table", label: "Electric Operating Table", path: "products/electric-operating-table" },
            { value: "panel-de-control-del-teatro-de-operaciones", label: "Panel de control del teatro de operaciones", path: "product/operation-theatre-control-panel" },
            { value: "caja-de-paso-de-sala-limpia", label: "Caja de paso de sala limpia", path: "product/pass-box" },
            { value: "visor-de-pelicula-de-rayos-x-led", label: "Visor de película de rayos X LED", path: "product/led-x-ray-film-viewer" },
            { value: "monitor-de-sala-limpia", label: "Monitor de sala limpia", path: "products/cleanroom-monitor" },
            { value: "stainless-steel-surgical-scrub-sink", label: "Stainless Steel Surgical Scrub Sink", path: "products/stainless-steel-surgical-scrub-sink" },
            { value: "escritorio", label: "Escritorio", path: "products/writing-table" },
            { value: "techo-de-flujo-de-aire-laminar", label: "Techo de flujo de aire laminar", path: "products/laminar-air-flow-ceiling" }
        ]
    },
    {
        value: "sistema-de-llamada-de-enfermera",
        label: "Sistema de llamada de enfermera",
        subcategories: [
            { value: "intelligent-nurse-call-system", label: "Intelligent Nurse Call System", path: "product/nc-a-nurse-call-system" },
            { value: "sistema-de-llamada-de-enfermeria-ip", label: "Sistema de llamada de enfermería IP", path: "product/nc-c-ip-nurse-call-system" },
            { value: "wireless-nurse-call-system", label: "Wireless Nurse Call System", path: "products/wireless-nurse-call-system" }
        ]
    }
];


const ensureSpanishUrl = (url: string): string => {
    if (!url) return '';
    if (!url.includes('lang=es')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}lang=es`;
    }
    return url;
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

    text = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<li>/gi, '\n- ')
        .replace(/<\/li>/gi, '\n');

    text = text.replace(/<[^>]*>/g, '');

    text = text
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join('\n');

    return text.trim();
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
                    sendUpdate({ type: 'status', message: 'Iniciando conexión con catálogo de AmcareMed...' });

                    // 1. Resolve subcategories to process
                    const targetSubcategories: { label: string; path: string }[] = [];

                    if (requestCategory === "all") {
                        for (const group of AMCAREMED_CATEGORIES) {
                            for (const sub of group.subcategories) {
                                targetSubcategories.push(sub);
                            }
                        }
                    } else {
                        // Check if requestCategory is a group value
                        const group = AMCAREMED_CATEGORIES.find(g => g.value === requestCategory);
                        if (group) {
                            for (const sub of group.subcategories) {
                                targetSubcategories.push(sub);
                            }
                        } else {
                            // Check if it's a specific subcategory
                            let found = false;
                            for (const g of AMCAREMED_CATEGORIES) {
                                const sub = g.subcategories.find(s => s.value === requestCategory);
                                if (sub) {
                                    targetSubcategories.push(sub);
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                throw new Error(`Categoría o subcategoría no reconocida: ${requestCategory}`);
                            }
                        }
                    }

                    const initialLinks: { link: string; categoryLabel: string }[] = [];
                    for (const sub of targetSubcategories) {
                        const subUrl = ensureSpanishUrl(`https://amcaremed.com/${sub.path}/`);
                        initialLinks.push({ link: subUrl, categoryLabel: sub.label });
                    }

                    console.log(`[Scraper AmcareMed] Found ${initialLinks.length} initial catalog links.`);
                    sendUpdate({ type: 'status', message: `Analizando estructura de páginas para resolver subproductos...` });

                    // 3. Resolve links recursively (2-tier traversal)
                    const queue = [...initialLinks];
                    const finalProducts: { link: string; categoryLabel: string }[] = [];

                    while (queue.length > 0) {
                        const item = queue.shift()!;
                        console.log(`[Scraper AmcareMed] Inspecting URL: ${item.link}`);
                        
                        try {
                            const detailRes = await fetch(item.link, { headers: HEADERS });
                            if (!detailRes.ok) {
                                console.error(`[Scraper AmcareMed] Failed to fetch intermediate URL: ${item.link}`);
                                continue;
                            }
                            const detailHtml = await detailRes.text();

                            // Check if this page is a list page itself (contains product cards)
                            if (detailHtml.includes('h5productTitle') || detailHtml.includes('c1ProductBox')) {
                                console.log(`[Scraper AmcareMed] Intermediate list page resolved: ${item.link}`);
                                const titleDivRegex = /<div class="h5productTitle[^>]*>([\s\S]*?)<\/div>/gi;
                                let titleDivMatch;
                                let subCount = 0;
                                while ((titleDivMatch = titleDivRegex.exec(detailHtml)) !== null) {
                                    const innerHtml = titleDivMatch[1];
                                    const hrefMatch = innerHtml.match(/href="([^"]+)"/i);
                                    if (hrefMatch) {
                                        let subUrl = hrefMatch[1].replace(/&amp;/g, '&').trim();
                                        if (subUrl.startsWith('//')) subUrl = 'https:' + subUrl;
                                        subUrl = ensureSpanishUrl(subUrl);
                                        
                                        if (!finalProducts.some(p => p.link === subUrl) && !queue.some(q => q.link === subUrl)) {
                                            queue.push({ link: subUrl, categoryLabel: item.categoryLabel });
                                            subCount++;
                                        }
                                    }
                                }
                                console.log(`[Scraper AmcareMed] Added ${subCount} nested links from intermediate list.`);
                            } else {
                                // Direct leaf page
                                finalProducts.push(item);
                            }
                        } catch (err) {
                            console.error(`[Scraper AmcareMed] Error during URL inspection of ${item.link}:`, err);
                        }

                        // Delay to avoid request bursts
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }

                    console.log(`[Scraper AmcareMed] Final resolved leaf products count: ${finalProducts.length}`);
                    sendUpdate({ 
                        type: 'info', 
                        total: finalProducts.length, 
                        message: `Se encontraron ${finalProducts.length} productos finales de AmcareMed para importar.` 
                    });

                    // 4. Scrape final products details
                    let importedCount = 0;
                    let processedCount = 0;

                    for (const item of finalProducts) {
                        processedCount++;
                        const detailUrl = item.link;
                        console.log(`[Scraper AmcareMed] Fetching leaf details: ${detailUrl}`);

                        let title = '';

                        try {
                            const response = await fetch(detailUrl, { headers: HEADERS });
                            if (!response.ok) {
                                console.error(`[Scraper AmcareMed] Failed to fetch product page: ${detailUrl} (Status: ${response.status})`);
                                sendUpdate({ 
                                    type: 'progress', 
                                    current: processedCount, 
                                    total: finalProducts.length, 
                                    product: `Error al descargar detalles (Código: ${response.status})` 
                                });
                                continue;
                            }

                            const html = await response.text();

                            // 1. Parse Title
                            const titleMatch = html.match(/<div class="[^"]*pd2Details[^"]*">[\s\S]*?<h1>([\s\S]*?)<\/h1>/i) ||
                                               html.match(/<h1>([\s\S]*?)<\/h1>/i);
                            title = titleMatch ? cleanHtml(titleMatch[1]) : '';

                            if (!title) {
                                console.warn(`[Scraper AmcareMed] Could not parse title for URL: ${detailUrl}. Skipping...`);
                                continue;
                            }

                            // 2. Parse Description
                            // Main intro
                            const introMatch = html.match(/<div class="[^"]*pd2Details[^"]*">([\s\S]*?)<\/div>/i);
                            let introText = '';
                            if (introMatch) {
                                const pMatch = introMatch[1].match(/<p>([\s\S]*?)<\/p>/i);
                                if (pMatch) introText = cleanHtml(pMatch[1]);
                            }

                            // Tab sections
                            const tabDescriptions: string[] = [];
                            const tabRegex = /<div id="mytab-\d"[^>]*class="mytab-content"[^>]*>([\s\S]*?)<\/div>/gi;
                            let tabMatch;
                            while ((tabMatch = tabRegex.exec(html)) !== null) {
                                const tabHtml = tabMatch[1];
                                const tabClean = cleanHtml(tabHtml);
                                if (tabClean) {
                                    tabDescriptions.push(tabClean);
                                }
                            }
                            const descClean = [introText, ...tabDescriptions].filter(Boolean).join('\n\n');
                            const descShortClean = descClean.split('\n')[0]?.substring(0, 200) || descClean.substring(0, 200);

                            // 3. Parse Image
                            let originalImageUrl = '';
                            const sliderMatch = html.match(/<ul class="detailProductSlider">([\s\S]*?)<\/ul>/i);
                            if (sliderMatch) {
                                const imgMatch = sliderMatch[1].match(/<img[^>]*src="([^"]+)"/i);
                                if (imgMatch) {
                                    originalImageUrl = imgMatch[1];
                                }
                            }
                            if (!originalImageUrl) {
                                const fallbackImgMatch = html.match(/<div class="col-sm-12 col-md-5">[\s\S]*?<img[^>]*src="([^"]+)"/i);
                                if (fallbackImgMatch) {
                                    originalImageUrl = fallbackImgMatch[1];
                                }
                            }

                            if (originalImageUrl) {
                                if (originalImageUrl.startsWith('//')) {
                                    originalImageUrl = 'https:' + originalImageUrl;
                                } else if (originalImageUrl.startsWith('/')) {
                                    originalImageUrl = 'https://amcaremed.com' + originalImageUrl;
                                }
                            }

                            let finalImageUrl = '';

                            if (originalImageUrl) {
                                finalImageUrl = originalImageUrl;

                                // Upload image to R2
                                try {
                                    console.log(`[Scraper AmcareMed] Downloading image: ${originalImageUrl}`);
                                    sendUpdate({ type: 'status', message: `Descargando imagen para: ${title}` });
                                    
                                    const imgResponse = await fetch(originalImageUrl, { headers: HEADERS });
                                    if (imgResponse.ok) {
                                        const arrayBuffer = await imgResponse.arrayBuffer();
                                        const buffer = Buffer.from(arrayBuffer);
                                        const ext = originalImageUrl.split('.').pop()?.split('?')[0] || 'jpg';
                                        const uniqueFileName = `scraped/amcaremed-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
                                        const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';

                                        const r2Url = await uploadToR2(buffer, uniqueFileName, contentType);
                                        if (r2Url) {
                                            finalImageUrl = r2Url;
                                        }
                                    }
                                } catch (imgErr) {
                                    console.error(`[Scraper AmcareMed] Failed to upload image to R2 for ${title}:`, imgErr);
                                }
                            }

                            // Model & SKU Details
                            let model = '';
                            const slugMatch = detailUrl.match(/\/products?\/([a-z0-9-]+)/i);
                            if (slugMatch) {
                                const slug = slugMatch[1];
                                model = slug.toUpperCase();
                            }
                            if (!model) {
                                model = 'GENERICO';
                            }
                            const cleanSku = `AMCARE-${model.replace(/[^A-Z0-9-]/g, '')}`;

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
                                     total: finalProducts.length, 
                                     product: `${title} (Ya existe - Omitido)` 
                                 });
                                 continue;
                             }

                             // Create Producto entry in the database
                             console.log(`[Scraper AmcareMed] Creating product: ${title} (${cleanSku})`);
                             await prisma.producto.create({
                                 data: {
                                     organizationId,
                                     sku: cleanSku,
                                     nombre: title,
                                     descripcion: descClean,
                                     imagenWeb: finalImageUrl || null,
                                     tituloWeb: title,
                                     descripcionWeb: descShortClean || null,
                                     marca: 'AmcareMed',
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
                                 total: finalProducts.length, 
                                 product: title 
                             });

                        } catch (err: any) {
                             console.error(`[Scraper AmcareMed] Error processing details for link ${item.link}:`, err);
                             sendUpdate({ 
                                 type: 'progress', 
                                 current: processedCount, 
                                 total: finalProducts.length, 
                                 product: `Error al procesar: ${title || item.link}` 
                             });
                        }

                        // Delay to respect rate limiting
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    sendUpdate({ type: 'success', count: importedCount, total: finalProducts.length });
                    controller.close();

                } catch (err: any) {
                    console.error('[Scraper AmcareMed Stream Error]:', err);
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
        console.error('[Scraper AmcareMed Endpoint Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
