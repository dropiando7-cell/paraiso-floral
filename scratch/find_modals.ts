import fs from 'fs';

const content = fs.readFileSync('d:/paraiso-floral/src/app/(dashboard)/cxc/cliente/[id]/page.tsx', 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('Monto a Descontar') || line.includes('Abonar') || line.includes('Registrar Abono') || line.includes('motivo') || line.includes('fecha')) {
    console.log(`Línea ${idx + 1}: ${line.trim()}`);
  }
});
