const fs = require('fs');
const content = fs.readFileSync('D:/bioelectronica-app/bioelectronica-app/referencias/productos_bioelectronica_odoo.csv', 'utf8');

const lines = content.split('\n');
console.log('Total lines:', lines.length);

console.log('Header:', lines[0]);

console.log('\n--- First 20 items ---');
for(let i=1; i<=20; i++) {
   if(!lines[i]) continue;
   const cols = lines[i].split(',');
   console.log(`Row ${i}: ID=${cols[0]} | Name=${cols[1]} | Ref=${cols[8]}`);
}

// Find any row containing MASIMO
console.log('\n--- Searching MASIMO ---');
lines.forEach((line, idx) => {
   if (line.toLowerCase().includes('masimo')) {
       console.log(`Found MASIMO at line ${idx+1}: ${line.substring(0, 100)}...`);
   }
});
// Find any row containing oximetr
console.log('\n--- Searching oximetr ---');
lines.forEach((line, idx) => {
   if (line.toLowerCase().includes('oximetr')) {
       console.log(`Found oximetr at line ${idx+1}: ${line.substring(0, 100)}...`);
   }
});
