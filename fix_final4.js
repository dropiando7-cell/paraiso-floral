const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

content = content.replace(/setForm\(\(prev\) => \(\{/g, 'setForm((prev: any) => ({');

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);
