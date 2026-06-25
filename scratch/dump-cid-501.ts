import * as fs from 'fs';
import * as path from 'path';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

async function dump() {
    try {
        const url = 'https://www.joson-care.com/product.php?lang=es&tb=1&cid=501';
        const res = await fetch(url, { headers: HEADERS });
        const html = await res.text();
        fs.writeFileSync(path.join(__dirname, 'cid-501.html'), html);
        console.log("Dumped html to scratch/cid-501.html, size:", html.length);
    } catch (e) {
        console.error(e);
    }
}

dump();
export {};
