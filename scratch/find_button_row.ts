import fs from 'fs';

const content = fs.readFileSync('d:/paraiso-floral/src/app/(dashboard)/inventario/InventarioClient.tsx', 'utf-8');
const lines = content.split('\n');

console.log(`Total de líneas en InventarioClient.tsx: ${lines.length}`);

lines.forEach((line, idx) => {
  if (line.includes('Limpiar Cola') || line.includes('Debug Impr') || line.includes('Vista Etiqueta') || line.includes('Nuevo Producto') || line.includes('Cargar CSV') || line.includes('Consultar') || line.includes('Imprimir Lote') || line.includes('Exportar Excel') || line.includes('Toma Física')) {
    console.log(`Línea ${idx + 1}: ${line.trim()}`);
  }
});
