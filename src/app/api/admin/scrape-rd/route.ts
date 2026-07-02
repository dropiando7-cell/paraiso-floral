import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToR2 } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';
import RD_CATEGORIES from '@/app/(dashboard)/admin/gestion-web/rd-categories.json';
import RD_CATEGORY_IDS from '@/app/(dashboard)/admin/gestion-web/rd-category-ids.json';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8'
};

const GRAPHQL_HEADERS = {
    'Content-Type': 'application/json',
    'x-api-key': 'c5412744e3264ed39d928d73cbb0c729',
    'magento-environment-id': '95267588-3a4b-4f03-ab99-424c48ed4f4c',
    'magento-website-code': 'base',
    'magento-store-code': 'main_website_store',
    'magento-store-view-code': 'default',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

const query = `
query GetCategoryProducts($categoryId: String!, $pageSize: Int!, $currentPage: Int!) {
  productSearch(
    phrase: ""
    page_size: $pageSize
    current_page: $currentPage
    filter: [
      {
        attribute: "categoryIds"
        eq: $categoryId
      }
    ]
  ) {
    items {
      productView {
        sku
        name
        url
        description
        shortDescription
        metaDescription
        images {
          url
          label
        }
        attributes {
          name
          value
        }
      }
    }
    total_count
  }
}
`;

// Helper to sanitize HTML strings
const cleanHtml = (html: string): string => {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
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

        // Parse category filter from body
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
                    sendUpdate({ type: 'status', message: 'Iniciando conexión con R&D Batteries (Adobe Live Search)...' });

                    // 1. Resolve which categories to process
                    const categoriesToProcess: { value: string; label: string }[] = [];
                    if (requestCategory === "all") {
                        categoriesToProcess.push(...RD_CATEGORIES);
                    } else {
                        const matched = RD_CATEGORIES.find(c => c.value === requestCategory);
                        if (matched) {
                            categoriesToProcess.push(matched);
                        } else {
                            throw new Error(`Categoría seleccionada no válida: ${requestCategory}`);
                        }
                    }

                    sendUpdate({ type: 'status', message: `Procesando ${categoriesToProcess.length} categoría(s)...` });

                    // We will collect products to import across resolved categories
                    // To avoid duplicates if the same product is in multiple categories, we track processed SKUs
                    const processedSkus = new Set<string>();
                    let totalProductsScraped = 0;
                    let importedCount = 0;

                    for (const cat of categoriesToProcess) {
                        const categoryId = (RD_CATEGORY_IDS as Record<string, string>)[cat.value];
                        if (!categoryId) {
                            console.log(`[Scraper] No category ID mapped for ${cat.label} (${cat.value}). Skipping...`);
                            continue;
                        }

                        sendUpdate({ type: 'status', message: `Descargando catálogo para: ${cat.label}...` });
                        console.log(`[Scraper] Fetching category ${cat.label} (ID: ${categoryId})`);

                        let currentPage = 1;
                        let hasMore = true;
                        const pageSize = 50;

                        while (hasMore) {
                            console.log(`[Scraper] Fetching page ${currentPage} for ${cat.label}`);
                            const response = await fetch('https://catalog-service.adobe.io/graphql', {
                                method: 'POST',
                                headers: GRAPHQL_HEADERS,
                                body: JSON.stringify({
                                    query,
                                    variables: {
                                        categoryId,
                                        pageSize,
                                        currentPage
                                    }
                                })
                            });

                            if (!response.ok) {
                                throw new Error(`Error en API de R&D Batteries (Status: ${response.status})`);
                            }

                            const result = await response.json();
                            if (result.errors && result.errors.length > 0) {
                                throw new Error(`GraphQL Error: ${result.errors[0].message}`);
                            }

                            const items = result.data?.productSearch?.items || [];
                            const totalCount = result.data?.productSearch?.total_count || 0;

                            if (items.length === 0) {
                                hasMore = false;
                                break;
                            }

                            // Process this batch of products
                            for (const productWrapper of items) {
                                const item = productWrapper.productView;
                                if (!item || !item.sku) continue;

                                totalProductsScraped++;

                                // Formulate safe SKU and category name
                                const cleanSku = `RD-${item.sku.toUpperCase().replace(/[^A-Z0-9-]/g, '')}`;
                                const brandAttr = item.attributes?.find((a: any) => a.name === 'brand')?.value || 'R&D Batteries';
                                
                                // Clean name and model extraction
                                const rawName = item.name || '';
                                const model = rawName.split('-')[1]?.trim() || rawName;

                                // Check if we already processed this SKU in this execution loop
                                if (processedSkus.has(cleanSku)) {
                                    continue;
                                }
                                processedSkus.add(cleanSku);

                                // Check if product already exists in database
                                const existingProduct = await prisma.producto.findUnique({
                                    where: { sku: cleanSku }
                                });

                                if (existingProduct) {
                                    // Update existing product
                                    if (
                                        existingProduct.organizationId !== organizationId || 
                                        existingProduct.categoria !== cat.label || 
                                        existingProduct.estado !== 'ACTIVO'
                                    ) {
                                        await prisma.producto.update({
                                            where: { sku: cleanSku },
                                            data: { 
                                                organizationId,
                                                categoria: cat.label,
                                                estado: 'ACTIVO'
                                            }
                                        });
                                    }
                                    sendUpdate({ 
                                        type: 'progress', 
                                        current: processedSkus.size, 
                                        total: totalCount, 
                                        product: `${rawName} (Ya existe - Omitido)` 
                                    });
                                    continue;
                                }

                                // Compose rich description
                                let descClean = cleanHtml(item.description || '');
                                if (item.metaDescription) {
                                    descClean += `\n\nCompatibilidad:\n${cleanHtml(item.metaDescription)}`;
                                }
                                const specs = item.attributes
                                    ?.filter((a: any) => a.name !== '_product_list_detail_extra_html' && a.name !== 'base_price' && a.name !== 'minimum_price')
                                    ?.map((a: any) => `${a.name.charAt(0).toUpperCase() + a.name.slice(1)}: ${a.value}`)
                                    .join('\n') || '';
                                if (specs) {
                                    descClean += `\n\nEspecificaciones Técnicas:\n${specs}`;
                                }

                                const descShortClean = cleanHtml(item.shortDescription || item.metaDescription || descClean.substring(0, 200));

                                // Determine image URL
                                let originalImageUrl = '';
                                if (item.images && item.images.length > 0) {
                                    originalImageUrl = item.images[0].url;
                                }

                                let finalImageUrl = originalImageUrl;

                                // Upload image to Cloudflare R2
                                if (originalImageUrl) {
                                    try {
                                        console.log(`[Scraper] Downloading image: ${originalImageUrl}`);
                                        sendUpdate({ type: 'status', message: `Descargando imagen para: ${rawName}` });
                                        
                                        const imgResponse = await fetch(originalImageUrl, { headers: HEADERS });
                                        if (imgResponse.ok) {
                                            const arrayBuffer = await imgResponse.arrayBuffer();
                                            const buffer = Buffer.from(arrayBuffer);
                                            const ext = originalImageUrl.split('.').pop()?.split('?')[0] || 'jpg';
                                            const uniqueFileName = `scraped/rd-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
                                            const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';

                                            const r2Url = await uploadToR2(buffer, uniqueFileName, contentType);
                                            if (r2Url) {
                                                finalImageUrl = r2Url;
                                            }
                                        }
                                    } catch (imgErr) {
                                        console.error(`[Scraper] Failed to upload image to R2 for ${rawName}:`, imgErr);
                                    }
                                }

                                // Create product in database
                                console.log(`[Scraper] Creating product: ${rawName} (${cleanSku})`);
                                await prisma.producto.create({
                                    data: {
                                        organizationId,
                                        sku: cleanSku,
                                        nombre: rawName,
                                        descripcion: descClean,
                                        imagenWeb: finalImageUrl || null,
                                        tituloWeb: rawName,
                                        descripcionWeb: descShortClean || null,
                                        marca: brandAttr,
                                        modelo: model,
                                        precioVenta: 0,
                                        costoBase: 0,
                                        stockActual: 0,
                                        stockMinimo: 0,
                                        estado: 'ACTIVO',
                                        categoria: cat.label
                                    }
                                });

                                importedCount++;
                                sendUpdate({ 
                                    type: 'progress', 
                                    current: processedSkus.size, 
                                    total: totalCount, 
                                    product: rawName 
                                });

                                // Respectful rate limiting sleep (1 sec)
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }

                            // Check pagination bounds
                            if (items.length < pageSize || processedSkus.size >= totalCount) {
                                hasMore = false;
                            } else {
                                currentPage++;
                            }
                        }
                    }

                    sendUpdate({ type: 'success', count: importedCount, total: processedSkus.size });
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
