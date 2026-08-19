import fs from 'fs';

const content = fs.readFileSync('d:/paraiso-floral/src/app/(dashboard)/inventario/InventarioClient.tsx', 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('StatsCards')) {
    console.log(`Línea ${idx + 1}: ${line.trim()}`);
  }
});
