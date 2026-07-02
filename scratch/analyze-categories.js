const fs = require('fs');
const path = require('path');

const sitemaps = [
    'https://www.rdbatteries.com/media/sitemap-1-1.xml',
    'https://www.rdbatteries.com/media/sitemap-1-2.xml',
    'https://www.rdbatteries.com/media/sitemap-1-3.xml'
];

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

const GRAPHQL_HEADERS = {
    'Content-Type': 'application/json',
    'x-api-key': 'c5412744e3264ed39d928d73cbb0c729',
    'magento-environment-id': '95267588-3a4b-4f03-ab99-424c48ed4f4c',
    'magento-website-code': 'base',
    'magento-store-code': 'main_website_store',
    'magento-store-view-code': 'default'
};

const countQuery = `
query GetCategoryProductCount($categoryId: String!) {
  productSearch(
    phrase: ""
    filter: [
      {
        attribute: "categoryIds"
        eq: $categoryId
      }
    ]
  ) {
    total_count
  }
}
`;

async function main() {
    try {
        console.log("Downloading sitemaps...");
        let allUrls = [];
        for (const url of sitemaps) {
            const res = await fetch(url, { headers: HEADERS });
            if (!res.ok) continue;
            const xml = await res.text();
            const locRegex = /<loc>([^<]+)<\/loc>/gi;
            let match;
            while ((match = locRegex.exec(xml)) !== null) {
                allUrls.push(match[1]);
            }
        }
        
        console.log(`Loaded ${allUrls.length} total URLs.`);
        
        // Filter manufacturer category URLs
        // Format: https://www.rdbatteries.com/batteries/medical/a/abbott-laboratories
        // So path parts should be batteries -> medical -> [letter] -> [manufacturer]
        const manufacturerUrls = allUrls.filter(url => {
            const parsed = new URL(url);
            const parts = parsed.pathname.split('/').filter(Boolean);
            return parts[0] === 'batteries' && 
                   parts[1] === 'medical' && 
                   parts.length === 4 && 
                   parts[2].length === 1; // e.g. 'a', 'b', 'c'
        });
        
        console.log(`Found ${manufacturerUrls.length} manufacturer category URLs.`);
        
        // Let's take the first 5 manufacturers as sample
        const samples = manufacturerUrls.slice(0, 5);
        console.log("Analyzing first 5 samples:");
        
        for (const url of samples) {
            console.log(`\nCategory URL: ${url}`);
            const res = await fetch(url, { headers: HEADERS });
            if (!res.ok) {
                console.log(`  Failed to fetch page, status: ${res.status}`);
                continue;
            }
            const html = await res.text();
            
            // Extract category ID
            // Format: data-category-id="820"
            const catIdMatch = html.match(/data-category-id="(\d+)"/i);
            if (!catIdMatch) {
                console.log("  Could not find data-category-id on this page.");
                continue;
            }
            const categoryId = catIdMatch[1];
            console.log(`  Extracted Category ID: ${categoryId}`);
            
            // Query GraphQL count
            const gqlRes = await fetch('https://catalog-service.adobe.io/graphql', {
                method: 'POST',
                headers: GRAPHQL_HEADERS,
                body: JSON.stringify({
                    query: countQuery,
                    variables: { categoryId }
                })
            });
            
            if (gqlRes.ok) {
                const data = await gqlRes.json();
                const totalCount = data.data?.productSearch?.total_count;
                console.log(`  Product count in Live Search: ${totalCount}`);
            } else {
                console.log(`  GraphQL request failed with status: ${gqlRes.status}`);
            }
            
            // Respectful sleep
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
    } catch (e) {
        console.error(e);
    }
}

main();
