import { prisma } from '../src/lib/prisma';
import XLSX from 'xlsx';

const ORG_ID = 'a0287245-6cad-4df5-a32a-f214b7b72e04'; // Paraíso Floral

function excelDateToDate(excelDate: any): Date | null {
  if (typeof excelDate === 'number') {
    const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof excelDate === 'string' && excelDate.trim()) {
    const parts = excelDate.trim().split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1;
      const day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    const date = new Date(excelDate);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

async function runImportHistorialCompleto() {
  console.log('🚀 Iniciando proceso de importación del HISTORIAL COMPLETO de CxC (José Méndez)...');

  const fileUri = 'referencias/CUENTAS POR COBRAR JOSE MENDEZ AGOSTO 2026.xlsx';
  const wb = XLSX.readFile(fileUri, { raw: true });

  const dbClients = await prisma.cliente.findMany({
    where: { organizationId: ORG_ID },
  });

  const adminUser = await prisma.user.findFirst({
    where: { organizationId: ORG_ID }
  });

  console.log(`📋 Clientes en BD para Paraíso Floral: ${dbClients.length}`);

  let totalFacturasCreadas = 0;
  let totalPagosCreados = 0;
  let totalMontoFacturado = 0;
  let totalMontoAbonado = 0;

  let sheetIdx = 0;

  for (const sheetName of wb.SheetNames) {
    if (['Hoja2', 'Hoja3', 'RESUMIDO'].includes(sheetName.trim())) continue;
    sheetIdx++;

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    let clientNameInHeader = sheetName.trim();
    let locationInHeader = '';
    let headerRowIndex = -1;

    for (let r = 0; r < Math.min(10, rows.length); r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim().toUpperCase();
        if (val.includes('CLIENTE') && row[c + 1]) clientNameInHeader = String(row[c + 1]).trim();
        if (val.includes('LUGAR') && row[c + 1]) locationInHeader = String(row[c + 1]).trim();
        if (val.includes('FECHA') || val.includes('FACTURA')) headerRowIndex = r;
      }
    }

    const cleanSheet = sheetName.trim().toUpperCase();
    const cleanHeader = clientNameInHeader.trim().toUpperCase();

    // Match client
    let targetDbClient = null;
    if (cleanSheet === 'YOLANI ANY') {
      targetDbClient = dbClients.find(c => c.nombre.toUpperCase() === 'FLORISTERIA YOLANY ANY') ||
                       dbClients.find(c => c.nombre.toUpperCase() === 'ANY');
    } else if (cleanSheet === 'DANIA DUBON') {
      targetDbClient = dbClients.find(c => c.nombre.toUpperCase().includes('DANIA GISSELL DUBON'));
    } else if (cleanSheet === 'LEFRUITT') {
      targetDbClient = dbClients.find(c => c.nombre.toUpperCase().includes('LEFRUITT'));
    } else if (cleanSheet === 'MANOS CREATIVAS') {
      targetDbClient = dbClients.find(c => c.nombre.toUpperCase() === 'MANOS CREATIVAS') ||
                       dbClients.find(c => c.nombre.toUpperCase() === 'INVERSIONES MANOS CREATIVAS');
    } else if (cleanSheet === 'DPETALOS') {
      targetDbClient = dbClients.find(c => c.nombre.toUpperCase() === 'FLORISTERIA D PETALOS');
    } else {
      targetDbClient = dbClients.find(c => {
        const dbName = c.nombre.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();
        const sheetCleanName = cleanSheet.replace(/[^A-Z0-9 ]/g, '').trim();
        const headerCleanName = cleanHeader.replace(/[^A-Z0-9 ]/g, '').trim();
        return dbName === sheetCleanName || dbName === headerCleanName;
      });
    }

    const deptText = locationInHeader.trim().toUpperCase() || 'OCCIDENTE';
    let clienteId: string;

    if (targetDbClient) {
      clienteId = targetDbClient.id;
      // Reset saldoInicial to 0 since we will populate the actual historical records
      await prisma.cliente.update({
        where: { id: clienteId },
        data: {
          saldoInicial: 0,
          departamento: targetDbClient.departamento || deptText
        }
      });
    } else {
      const created = await prisma.cliente.create({
        data: {
          organizationId: ORG_ID,
          nombre: cleanHeader || cleanSheet,
          departamento: deptText,
          limiteCredito: 0,
          saldoInicial: 0,
          diasCredito: 15,
          notas: 'Creado desde importador de historial CxC Excel'
        }
      });
      clienteId = created.id;
    }

    // Clean any previously imported batch for this client to prevent duplication
    await prisma.factura.deleteMany({
      where: {
        clienteId,
        correlativo: { startsWith: `FAC-JM-${sheetIdx}-` }
      }
    });

    await prisma.pagoCliente.deleteMany({
      where: {
        clienteId,
        correlativo: { startsWith: `AB-JM-${sheetIdx}-` }
      }
    });

    let clientFacturasCount = 0;
    let clientPagosCount = 0;
    let lastCalculatedBalance = 0;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const fechaRaw = row[0];
      const descRaw = row[1];
      const cantRaw = row[2];
      const totalRaw = row[3];

      if (fechaRaw === undefined && descRaw === undefined && cantRaw === undefined) continue;

      const desc = descRaw !== undefined && descRaw !== null ? String(descRaw).trim() : '';
      const cant = typeof cantRaw === 'number' ? cantRaw : parseFloat(String(cantRaw || '').replace(/,/g, ''));
      const totalExcel = typeof totalRaw === 'number' ? totalRaw : parseFloat(String(totalRaw || '').replace(/,/g, ''));

      if (isNaN(cant) && !desc) continue;

      const fechaTx = excelDateToDate(fechaRaw) || new Date('2026-08-01');

      if (!isNaN(cant) && cant !== 0) {
        if (cant > 0) {
          // Es un Cargo / Factura / Saldo Anterior
          const montoFac = Number(cant.toFixed(2));
          const corrFac = `FAC-JM-${sheetIdx}-${r}`;

          await prisma.factura.create({
            data: {
              organizationId: ORG_ID,
              clienteId,
              correlativo: corrFac,
              fechaEmision: fechaTx,
              fechaVencimiento: new Date(fechaTx.getTime() + 15 * 24 * 60 * 60 * 1000),
              subTotal: montoFac,
              total: montoFac,
              saldoPendiente: montoFac,
              estado: 'EMITIDA',
              estadoPago: 'PENDIENTE',
              metodoPago: 'CREDITO',
              notas: desc ? `Excel: ${desc}` : 'Venta a Crédito Comercial',
              creadoPorId: adminUser?.id,
              detalles: {
                create: [
                  {
                    descripcion: desc || 'Venta de Flor a Crédito',
                    cantidad: 1,
                    precioUnitario: montoFac,
                    totalLinea: montoFac
                  }
                ]
              }
            }
          });

          clientFacturasCount++;
          totalFacturasCreadas++;
          totalMontoFacturado += montoFac;
          lastCalculatedBalance += montoFac;
        } else {
          // Es un Abono / Pago en Efectivo / Transferencia (monto negativo en excel)
          const montoPago = Number(Math.abs(cant).toFixed(2));
          const corrPago = `AB-JM-${sheetIdx}-${r}`;
          const metodo = desc.toUpperCase().includes('TRANS') ? 'TRANSFERENCIA' : 'EFECTIVO';

          await prisma.pagoCliente.create({
            data: {
              organizationId: ORG_ID,
              clienteId,
              correlativo: corrPago,
              monto: montoPago,
              fecha: fechaTx,
              metodoPago: metodo,
              notas: desc ? `Excel: ${desc}` : 'Abono recibido',
              creadoPorId: adminUser?.id
            }
          });

          clientPagosCount++;
          totalPagosCreados++;
          totalMontoAbonado += montoPago;
          lastCalculatedBalance -= montoPago;
        }
      }
    }

    console.log(`  📄 [${sheetName}] => Facturas: ${clientFacturasCount}, Pagos: ${clientPagosCount} | Saldo Resultante: L. ${lastCalculatedBalance.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`);
  }

  console.log('\n=============================================');
  console.log('🎉 HISTORIAL COMPLETO IMPORTADO EXITOSAMENTE');
  console.log('=============================================');
  console.log(`Total Facturas Creadas: ${totalFacturasCreadas} (Monto: L. ${totalMontoFacturado.toLocaleString('es-HN', { minimumFractionDigits: 2 })})`);
  console.log(`Total Pagos Creados: ${totalPagosCreados} (Monto: L. ${totalMontoAbonado.toLocaleString('es-HN', { minimumFractionDigits: 2 })})`);
  console.log(`Saldo Neto Total Cartera: L. ${(totalMontoFacturado - totalMontoAbonado).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`);
}

runImportHistorialCompleto()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('❌ Error durante la importación:', err);
    prisma.$disconnect();
    process.exit(1);
  });
