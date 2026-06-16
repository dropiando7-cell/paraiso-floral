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
    'anesthesia': 6198,      // Anesthesia Machines
    'defibrillators': 6184,  // Defibrillators
    'patient-monitors': 6207, // Patient Monitors
    'surgical-tables': 6203, // Surgical Tables
    'ultrasounds': 6191      // Ultrasounds
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
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 2. Fetch default organization
        const defaultOrg = await prisma.organization.findFirst();
        if (!defaultOrg) {
            return NextResponse.json({ error: 'No se encontró ninguna organización en el sistema' }, { status: 500 });
        }
        const organizationId = defaultOrg.id;

        // 3. Parse category filter
        let requestCategory = "all";
        try {
            const body = await req.json();
            if (body.category) requestCategory = body.category;
        } catch {
            // Use default 'all' if body is empty
        }

        // 4. Construct WooCommerce Store API endpoint
        let targetUrl = 'https://www.somatechnology.com/wp-json/wc/store/v1/products?per_page=10';
        if (requestCategory !== "all" && CATEGORY_MAP[requestCategory]) {
            const categoryId = CATEGORY_MAP[requestCategory];
            targetUrl = `https://www.somatechnology.com/wp-json/wc/store/v1/products?category=${categoryId}&per_page=10`;
        }

        // 5. Fetch real products from WooCommerce Store API
        console.log(`[Scraper] Fetching products from live URL: ${targetUrl}`);
        const response = await fetch(targetUrl, { headers: HEADERS });
        if (!response.ok) {
            throw new Error(`Error de red al consultar Soma Technology (Código: ${response.status})`);
        }

        const scrapedProducts = await response.json();
        if (!Array.isArray(scrapedProducts)) {
            throw new Error('La respuesta de Soma Technology no tiene un formato válido.');
        }

        console.log(`[Scraper] Successfully fetched ${scrapedProducts.length} products.`);
        let importedCount = 0;

        // 6. Process products sequentially to respect rate limits
        for (const item of scrapedProducts) {
            const decodedName = decodeHtml(item.name || '');
            const brand = extractBrand(decodedName);
            const model = extractModel(decodedName, brand);
            
            // Clean up SKU generation
            const cleanSku = `SOMA-${brand.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${model.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;

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
            console.log(`[Scraper] Upserting product: ${decodedName} with SKU: ${cleanSku}`);
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
                    estado: 'ACTIVO'
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
                    estado: 'ACTIVO'
                }
            });

            importedCount++;

            // Wait 1 second between products to avoid rate limit bans
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return NextResponse.json({ success: true, count: importedCount });
    } catch (err: any) {
        console.error('[Scraper Endpoint Error]:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
