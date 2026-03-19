const fs = require('fs');
const content = fs.readFileSync('D:/bioelectronica-app/bioelectronica-app/referencias/productos_bioelectronica_odoo.csv', 'utf8');

const lines = content.split('\n');
let out = '';

// Find any row containing MASIMO
out += '\n--- Searching MASIMO ---\n';
lines.forEach((line, idx) => {
   if (line.toLowerCase().includes('masimo')) {
       out += `Found ${idx+1}: ${line}\n`;
   }
});

// Find any row containing oximetr
out += '\n--- Searching oximetr ---\n';
lines.forEach((line, idx) => {
   if (line.toLowerCase().includes('oximetr')) {
       out += `Found ${idx+1}: ${line}\n`;
   }
});

fs.writeFileSync('D:/bioelectronica-app/bioelectronica-app/referencias/search_results.txt', out);
