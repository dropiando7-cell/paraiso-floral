import fs from 'fs';

const content = fs.readFileSync('d:/paraiso-floral/src/app/(dashboard)/cxc/page.tsx', 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('Abonar') || line.includes('Ajuste') || line.includes('Excel') || line.includes('WApp') || line.includes('ACCIONES')) {
    console.log(`Línea ${idx + 1}: ${line.trim()}`);
  }
});
