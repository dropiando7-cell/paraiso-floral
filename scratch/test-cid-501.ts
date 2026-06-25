import { NextRequest } from 'next/server';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

const getProductLinks = (html: string): string[] => {
    const regex = /href="([^"]*product_d\.php\?lang=es&amp;tb=1&amp;id=\d+[^"]*)"/g;
    const rawLinks: string[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        rawLinks.push(match[1]);
    }
    const regex2 = /href="([^"]*product_d\.php\?lang=es&tb=1&id=\d+[^"]*)"/g;
    while ((match = regex2.exec(html)) !== null) {
        rawLinks.push(match[1]);
    }
    return Array.from(new Set(rawLinks)).map(link => {
        let clean = link.replace(/&amp;/g, '&');
        if (clean.startsWith('//')) clean = 'https:' + clean;
        else if (clean.startsWith('/')) clean = 'https://www.joson-care.com' + clean;
        else if (!clean.startsWith('http')) clean = 'https://www.joson-care.com/' + clean;
        return clean;
    });
};

async function testCid501() {
    console.log("=== FETCHING CID 501 ===");
    try {
        const url = 'https://www.joson-care.com/product.php?lang=es&tb=1&cid=501';
        const response = await fetch(url, { headers: HEADERS });
        console.log("Status:", response.status);
        const html = await response.text();
        
        // Find title of page
        const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
        console.log("Page Title:", titleMatch ? titleMatch[1].trim() : 'Unknown');

        // Check if there are product links
        const links = getProductLinks(html);
        console.log(`Found ${links.length} product links:`);
        links.forEach(l => console.log(" -", l));

        // Let's search for subcategory links or menu links in the HTML
        console.log("\nSearching for other cid= links in HTML...");
        const cidRegex = /href="[^"]*cid=(\d+)[^"]*"/g;
        const cids: string[] = [];
        let match;
        while ((match = cidRegex.exec(html)) !== null) {
            cids.push(match[1]);
        }
        console.log("Found CIDs in links:", Array.from(new Set(cids)));

    } catch (e: any) {
        console.error("Error:", e);
    }
}

testCid501();
export {};
