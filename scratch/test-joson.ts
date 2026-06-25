export {};

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

const JOSON_MAP: Record<string, { label: string; cids: number[] }> = {
    "cama-uci": { label: "Cama de UCI", cids: [508, 509, 510] },
    "cama-hospital": { label: "Cama de hospital", cids: [512, 511] },
    "cama-hospital-manual": { label: "Cama de hospital manual", cids: [503] },
    "camilla-emergencia": { label: "Camilla de emergencia", cids: [513, 514] },
    "cama-pediatrica": { label: "Cama pediátrica", cids: [505] },
    "cama-cuidados-hogar": { label: "Cama de cuidados en el hogar", cids: [515, 516, 517] },
    "equipo-medico-sala": { label: "Equipo médico y de sala", cids: [518, 519, 520, 521, 522] }
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

async function testAll() {
    console.log("=== START JOSON CARE ALL MAP TEST ===");
    try {
        let totalCount = 0;
        for (const key of Object.keys(JOSON_MAP)) {
            const cat = JOSON_MAP[key];
            console.log(`\nCategory: "${cat.label}" (key: ${key})`);
            for (const cid of cat.cids) {
                const url = `https://www.joson-care.com/product.php?lang=es&tb=1&cid=${cid}`;
                const response = await fetch(url, { headers: HEADERS });
                if (!response.ok) {
                    console.error(`  [ERROR] CID ${cid} failed with status: ${response.status}`);
                    continue;
                }
                const html = await response.text();
                const links = getProductLinks(html);
                console.log(`  CID ${cid}: Found ${links.length} product links`);
                totalCount += links.length;
            }
        }
        console.log(`\nTotal products found across all categories: ${totalCount}`);
        console.log("=== ALL MAP TEST SUCCESS ===");
    } catch (e: any) {
        console.error("Test failed:", e);
    }
}

testAll();
