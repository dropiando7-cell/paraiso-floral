const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8'
};

async function main() {
    try {
        console.log("Fetching sample product from Soma Medical Parts...");
        const res = await fetch('https://somamedicalparts.com/wp-json/wc/store/v1/products?per_page=1', { headers: HEADERS });
        console.log("Response status:", res.status);
        if (!res.ok) {
            const txt = await res.text();
            console.log("Error body:", txt.substring(0, 500));
        } else {
            const data = await res.json();
            console.log("Success! Product fetched:", data[0]?.name);
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

main();
