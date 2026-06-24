const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8'
};

async function main() {
    try {
        let page = 1;
        let allCategories = [];
        let hasMore = true;

        while (hasMore) {
            console.log(`Fetching page ${page}...`);
            const res = await fetch(`https://somamedicalparts.com/wp-json/wc/store/v1/products/categories?per_page=100&page=${page}`, { headers: HEADERS });
            if (!res.ok) {
                break;
            }
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) {
                hasMore = false;
            } else {
                allCategories = allCategories.concat(data);
                if (data.length < 100) {
                    hasMore = false;
                } else {
                    page++;
                }
            }
        }

        console.log(`Fetched ${allCategories.length} categories.`);

        // Build mapping
        const parentMap = new Map();
        const rootCategories = [];

        // First pass: register all
        allCategories.forEach(cat => {
            cat.subcategories = [];
            parentMap.set(cat.id, cat);
        });

        // Second pass: associate children
        allCategories.forEach(cat => {
            if (cat.parent && cat.parent !== 0) {
                const parentCat = parentMap.get(cat.parent);
                if (parentCat) {
                    parentCat.subcategories.push(cat);
                } else {
                    // Parent not found in fetched list, treat as root
                    rootCategories.push(cat);
                }
            } else {
                rootCategories.push(cat);
            }
        });

        // Print final tree structure in a clean JSON format
        const output = rootCategories.map(root => ({
            id: root.id,
            name: root.name,
            slug: root.slug,
            subcategories: root.subcategories.map(sub => ({
                id: sub.id,
                name: sub.name,
                slug: sub.slug
            }))
        }));

        console.log("TREE:");
        console.log(JSON.stringify(output, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}

main();
