export {};

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

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

const cleanHtml = (html: string): string => {
    if (!html) return '';
    const decoded = decodeHtml(html);
    return decoded
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

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

const getProductLinks = (html: string): string[] => {
    const regex = /href="(\/products\/[^"]+\.html)"/g;
    const links: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        links.push(match[1]);
    }
    return Array.from(new Set(links));
};

async function test() {
    console.log("=== START PUKANG SCRAPER TEST ===");
    try {
        const url = 'https://es.pukangmed.com/medical-trolleys.html';
        console.log(`Fetching category list page: ${url}`);
        const response = await fetch(url, { headers: HEADERS });
        if (!response.ok) {
            throw new Error(`Failed to fetch category page: ${response.status}`);
        }
        const html = await response.text();
        const links = getProductLinks(html);
        console.log(`Found ${links.length} product links on first page:`, links.slice(0, 3));
        
        if (links.length > 0) {
            const firstLink = links[0];
            const detailUrl = `https://es.pukangmed.com${firstLink}`;
            console.log(`Fetching product detail page: ${detailUrl}`);
            
            const detailResponse = await fetch(detailUrl, { headers: HEADERS });
            if (!detailResponse.ok) {
                throw new Error(`Failed to fetch detail page: ${detailResponse.status}`);
            }
            const detailHtml = await detailResponse.text();
            
            // Title
            const titleMatch = detailHtml.match(/<h1 class="prob-title[^"]*">([\s\S]*?)<\/h1>/);
            const rawTitle = titleMatch ? titleMatch[1] : '';
            const decodedTitle = cleanHtml(rawTitle);
            console.log(`Parsed Title: "${decodedTitle}"`);
            
            // Category
            const breadcrumbMatch = detailHtml.match(/<div class="m-crm[\s\S]*?<span class="active"[^>]*>([\s\S]*?)<\/span>/);
            const resolvedCategory = breadcrumbMatch ? cleanHtml(breadcrumbMatch[1]) : '';
            console.log(`Parsed Category: "${resolvedCategory}"`);
            
            // Description snippet
            const descMatch = detailHtml.match(/<div class="bitem-desc m-desc">([\s\S]*?)<\/div>/);
            const descClean = descMatch ? cleanHtml(descMatch[1]) : '';
            console.log(`Parsed Description Snippet: "${descClean.substring(0, 150)}..."`);
            
            // Image
            const bigImgDivMatch = detailHtml.match(/<div class="prob-pic-big-img">([\s\S]*?)<\/div>/);
            let originalImageUrl = '';
            if (bigImgDivMatch) {
                const srcMatch = bigImgDivMatch[1].match(/src="([^"]+)"/);
                if (srcMatch) {
                    originalImageUrl = srcMatch[1];
                }
            }
            if (!originalImageUrl) {
                const ogImageMatch = detailHtml.match(/<meta property="og:image" content="([^"]+)"/);
                if (ogImageMatch) {
                    originalImageUrl = ogImageMatch[1];
                }
            }
            console.log(`Parsed Image URL: "${originalImageUrl}"`);
            
            // SKU / Model
            const model = getModelFromUrl(firstLink);
            const cleanSku = `PUKANG-${model.replace(/[^A-Z0-9-]/g, '')}`;
            console.log(`Parsed Model: "${model}"`);
            console.log(`Generated SKU: "${cleanSku}"`);
        }
        console.log("=== SCRAPER TEST SUCCESS ===");
    } catch (e: any) {
        console.error("Test failed:", e);
    }
}

test();
