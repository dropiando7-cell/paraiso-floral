const fs = require('fs');
const path = require('path');

const categories = require('../src/app/(dashboard)/admin/gestion-web/rd-categories.json');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, y Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function fetchCategoryId(category) {
    const url = `https://www.rdbatteries.com${category.path}`;
    try {
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return null;
        const html = await res.text();
        const match = html.match(/data-category-id="(\d+)"/i);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

async function main() {
    console.log(`Starting to fetch category IDs for ${categories.length} manufacturers...`);
    const mapping = {};
    const concurrency = 20; // Run 20 requests in parallel
    
    for (let i = 0; i < categories.length; i += concurrency) {
        const chunk = categories.slice(i, i + concurrency);
        console.log(`Processing chunk ${i} to ${i + chunk.length}...`);
        
        await Promise.all(chunk.map(async (cat) => {
            const catId = await fetchCategoryId(cat);
            if (catId) {
                mapping[cat.value] = catId;
            } else {
                console.log(`  Failed for: ${cat.value}`);
            }
        }));
        
        // Short pause between chunks
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`Finished. Successfully mapped ${Object.keys(mapping).length} out of ${categories.length} categories.`);
    
    const outPath = path.join(__dirname, '../src/app/(dashboard)/admin/gestion-web/rd-category-ids.json');
    fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2), 'utf8');
    console.log("Wrote mapping to:", outPath);
}

main();
