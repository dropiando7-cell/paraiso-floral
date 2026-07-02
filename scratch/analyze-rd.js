const fs = require('fs');
const path = require('path');

const URL = 'https://www.rdbatteries.com/batteries/medical/a/abbott-laboratories';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

async function main() {
    try {
        const res = await fetch(URL, { headers: HEADERS });
        const html = await res.text();
        
        let idx = -1;
        let count = 0;
        while ((idx = html.toLowerCase().indexOf('apikey', idx + 1)) !== -1) {
            console.log(`\n--- apikey occurrence ${++count} ---`);
            console.log(html.substring(idx - 150, idx + 250).replace(/\s+/g, ' ').trim());
        }
    } catch (e) {
        console.error(e);
    }
}

main();
