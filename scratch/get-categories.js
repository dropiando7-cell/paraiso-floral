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

function formatLabel(slug) {
    return slug
        .split('-')
        .map(word => {
            if (word === 'and') return 'and';
            if (word === 'inc') return 'Inc.';
            if (word === 'llc') return 'LLC';
            if (word === 'co') return 'Co.';
            if (word === 'corp') return 'Corp.';
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

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
        
        // Filter manufacturer category URLs
        const categories = [];
        const seen = new Set();
        
        for (const url of allUrls) {
            const parsed = new URL(url);
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts[0] === 'batteries' && 
                parts[1] === 'medical' && 
                parts.length === 4 && 
                parts[2].length === 1) {
                
                const slug = parts[3];
                if (!seen.has(slug)) {
                    seen.add(slug);
                    categories.push({
                        value: slug,
                        label: formatLabel(slug),
                        path: parsed.pathname // e.g. /batteries/medical/a/abbott-laboratories
                    });
                }
            }
        }
        
        // Sort alphabetically by label
        categories.sort((a, b) => a.label.localeCompare(b.label));
        
        console.log(`Extracted ${categories.length} unique manufacturer categories.`);
        
        // Write to JSON file
        const outPath = path.join(__dirname, 'rd-categories.json');
        fs.writeFileSync(outPath, JSON.stringify(categories, null, 2), 'utf8');
        console.log("Wrote categories to:", outPath);
        
    } catch (e) {
        console.error(e);
    }
}

main();
