const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8'
};

async function testUrl(url) {
    try {
        console.log(`Fetching: ${url}`);
        const res = await fetch(url, { headers: HEADERS, redirect: 'manual' });
        console.log(`Status: ${res.status}`);
        console.log(`Location Header: ${res.headers.get('location')}`);
        console.log(`Content-Type: ${res.headers.get('content-type')}`);
        console.log("------------------------");
    } catch (e) {
        console.error(`Fetch failed for ${url}:`, e);
    }
}

async function main() {
    await testUrl('https://somamedicalparts.com/wp-json/wc/store/v1/products?per_page=1');
    await testUrl('https://www.somamedicalparts.com/wp-json/wc/store/v1/products?per_page=1');
}

main();
