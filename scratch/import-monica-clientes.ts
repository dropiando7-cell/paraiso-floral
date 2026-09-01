import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('No organization found');
    return;
  }
  console.log(`Organización encontrada: ${org.name} (${org.id})`);

  const filePath = path.join(process.cwd(), 'referencias', 'clientes_paraiso_floral_limpio.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

  const header = parseCSVLine(lines[0]);
  console.log('Headers:', header);

  const dataRows = lines.slice(1);
  console.log(`Total filas en CSV: ${dataRows.length}`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const line of dataRows) {
    const cols = parseCSVLine(line);
    if (cols.length < 3) continue;

    const rawNombre = cols[2]?.trim();
    if (!rawNombre) continue;

    const nombre = rawNombre.toUpperCase();
    let rtn = cols[3]?.trim() || null;
    if (rtn && rtn.length < 4) rtn = null;

    const rawDireccion = cols[4]?.trim() || '';
    const ciudad = cols[5]?.trim() || '';
    
    // Extract departamento or city
    let departamento = ciudad;
    let direccion = rawDireccion;

    // Check if direccion contains department / city info
    if (!departamento && rawDireccion.includes(',')) {
      const parts = rawDireccion.split(',');
      departamento = parts[parts.length - 1].trim();
    }

    const telefono = cols[7]?.trim() || null;
    const email = cols[8]?.trim() || null;
    const balanceActual = parseFloat(cols[10]) || 0;
    const creditoMaximo = parseFloat(cols[11]) || 0;

    // Notes with legacy data
    const legacyNotesParts: string[] = [];
    if (cols[0]) legacyNotesParts.push(`ID Mónica: ${cols[0]}`);
    if (cols[1]) legacyNotesParts.push(`Cód Mónica: ${cols[1]}`);
    if (cols[19]) legacyNotesParts.push(`Última Transac: ${cols[19]}`);
    const notas = legacyNotesParts.length > 0 ? legacyNotesParts.join(' | ') : null;

    try {
      const existing = await prisma.cliente.findFirst({
        where: {
          organizationId: org.id,
          nombre: { equals: nombre, mode: 'insensitive' }
        }
      });

      if (existing) {
        // Update details if missing
        await prisma.cliente.update({
          where: { id: existing.id },
          data: {
            rtn: existing.rtn || rtn,
            telefono: existing.telefono || telefono,
            email: existing.email || email,
            direccion: existing.direccion || (direccion || null),
            departamento: existing.departamento || (departamento || null),
            limiteCredito: existing.limiteCredito && Number(existing.limiteCredito) > 0 ? existing.limiteCredito : creditoMaximo,
            saldoInicial: existing.saldoInicial && Number(existing.saldoInicial) > 0 ? existing.saldoInicial : balanceActual,
            notas: existing.notas || notas
          }
        });
        updatedCount++;
      } else {
        await prisma.cliente.create({
          data: {
            organizationId: org.id,
            nombre,
            rtn,
            telefono,
            email,
            direccion: direccion || null,
            departamento: departamento || null,
            limiteCredito: creditoMaximo,
            saldoInicial: balanceActual,
            diasCredito: 15,
            notas
          }
        });
        createdCount++;
      }
    } catch (err: any) {
      console.error(`Error procesando cliente "${nombre}":`, err.message);
      skippedCount++;
    }
  }

  console.log(`=== RESUMEN DE IMPORTACIÓN ===`);
  console.log(`Creados: ${createdCount}`);
  console.log(`Actualizados: ${updatedCount}`);
  console.log(`Omitidos/Errores: ${skippedCount}`);

  const totalInDb = await prisma.cliente.count({ where: { organizationId: org.id } });
  console.log(`Total de clientes en Base de Datos: ${totalInDb}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
