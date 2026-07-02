const fs = require('fs');
const path = require('path');

const sitemaps = [
    'https://www.rdbatteries.com/media/sitemap-1-1.xml',
    'https://www.rdbatteries.com/media/sitemap-1-2.xml',
    'https://www.rdbatteries.com/media/sitemap-1-3.xml'
];

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function main() {
    try {
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
        
        // Filter depth 1
        const depth1 = allUrls.filter(url => {
            const parsed = new URL(url);
            const pathParts = parsed.pathname.split('/').filter(Boolean);
            return pathParts.length === 1;
        });
        
        console.log(`Found ${depth1.length} Depth 1 URLs.`);
        console.log("\nSample Depth 1 URLs (first 100):");
        console.log(depth1.slice(0, 100));
        
    } catch (e) {
        console.error(e);
    }
}

main();
