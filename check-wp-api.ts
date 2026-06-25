const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function testUrl(url: string) {
    console.log(`\nTesting URL: ${url}`);
    try {
        const res = await fetch(url, { headers: HEADERS });
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                console.log(`Response is array of length: ${data.length}`);
                if (data.length > 0) {
                    console.log("Keys in first item:", Object.keys(data[0]));
                    console.log("Sample title:", data[0].title?.rendered || data[0].title || data[0].name);
                }
            } else {
                console.log(`Response is object. Keys:`, Object.keys(data));
            }
        } else {
            console.log("Failed. Text:", (await res.text()).substring(0, 200));
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

async function main() {
    await testUrl('https://amcaremed.com/wp-json/wp/v2/product?per_page=5&lang=es');
    await testUrl('https://amcaremed.com/wp-json/wp/v2/product_cat?per_page=100&lang=es');
    await testUrl('https://amcaremed.com/wp-json/wp/v2/product-category?per_page=5&lang=es');
    await testUrl('https://amcaremed.com/wp-json/wp/v2/posts?per_page=5&lang=es');
    await testUrl('https://amcaremed.com/wp-json/wp/v2/types');
}

main().catch(console.error);
