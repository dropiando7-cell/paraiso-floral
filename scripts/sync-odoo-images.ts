import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== Iniciando Sincronización Optimizada de Imágenes ===");

  // 1. Cargar todos los ProductoOdoo en memoria
  console.log("Cargando referencias de Odoo en memoria...");
  const odooProducts = await prisma.productoOdoo.findMany({
    where: {
      imagenUrl: {
        not: null
      }
    },
    select: {
      odooId: true,
      imagenUrl: true
    }
  });

  const odooMap = new Map<string, string>();
  for (const p of odooProducts) {
    if (p.odooId && p.imagenUrl) {
      odooMap.set(p.odooId, p.imagenUrl);
    }
  }
  console.log(`Se cargaron ${odooMap.size} referencias con imagen en memoria.`);

  // 2. Obtener registros históricos sin imagen con observaciones de Odoo
  const historicos = await prisma.inventarioHistorico.findMany({
    where: {
      imagenUrl: null,
      observaciones: {
        contains: 'Migrado de Odoo'
      }
    },
    select: {
      id: true,
      observaciones: true
    }
  });

  console.log(`Se encontraron ${historicos.length} registros históricos sin imagen y con observaciones de Odoo.`);

  // 3. Preparar las operaciones de actualización
  const updates: any[] = [];
  let noEncontrados = 0;

  for (const item of historicos) {
    const match = item.observaciones?.match(/ODOO-(\d+)/);
    if (!match) continue;

    const odooId = match[1];
    const imagenUrl = odooMap.get(odooId);

    if (imagenUrl) {
      updates.push({
        where: { id: item.id },
        data: { imagenUrl }
      });
    } else {
      noEncontrados++;
    }
  }

  console.log(`Preparadas ${updates.length} actualizaciones. (No encontrados/sin imagen en Odoo: ${noEncontrados})`);

  // 4. Ejecutar actualizaciones en lotes paralelos de 50
  const batchSize = 50;
  let completados = 0;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map(op => prisma.inventarioHistorico.update(op))
    );
    completados += batch.length;
    console.log(`Progreso: ${completados} de ${updates.length} registros actualizados...`);
  }

  console.log("\n=== Sincronización Optimizada Completada ===");
  console.log(`- Total de actualizaciones realizadas: ${completados}`);
  console.log("===========================================");
}

main()
  .catch((e) => {
    console.error("Error durante la sincronización:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
