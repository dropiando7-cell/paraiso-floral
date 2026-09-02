import { prisma } from '../src/lib/prisma';
import XLSX from 'xlsx';

function parseExcelDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const str = String(val).trim();
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    let day = parseInt(match[1]);
    let month = parseInt(match[2]) - 1;
    let year = parseInt(match[3]);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

async function syncJoseMendezOnly() {
  console.log('🚀 INICIANDO SINCRONIZACIÓN EXCLUSIVA DE LA RUTA DE OCCIDENTE (JOSÉ MÉNDEZ)...');

  const org = await prisma.organization.findFirst();
  if (!org) throw new Error('Organización no encontrada');
  const orgId = org.id;

  // 1. Obtener usuario José Méndez
  let joseMendez = await prisma.user.findFirst({
    where: { email: 'jose.mendez@paraisofloral.com' }
  });
  if (!joseMendez) {
    joseMendez = await prisma.user.create({
      data: {
        email: 'jose.mendez@paraisofloral.com',
        nombre: 'José',
        apellido: 'Méndez',
        puesto: 'Vendedor de Ruta Occidente',
        role: 'USER',
        customRoleName: 'Vendedor',
        organizationId: orgId,
        accessibleModules: ['/cxc', '/inventario-ventas/rutas/pos-movil', '/inventario-ventas/pedidos', '/contactos'],
        rutasAsignadas: ['Ruta Occidente'],
        puedeVerTodasCxC: false
      }
    });
  }

  console.log('👤 Vendedor José Méndez ID:', joseMendez.id);

  // 2. Limpiar todos los movimientos previos importados de prueba
  console.log('🧹 Eliminando facturas y pagos antiguos...');
  await prisma.pagoDetalleFactura.deleteMany({
    where: { factura: { organizationId: orgId } }
  });
  await prisma.notaCreditoCliente.deleteMany({
    where: { organizationId: orgId }
  });
  await prisma.pagoCliente.deleteMany({
    where: { organizationId: orgId }
  });
  await prisma.detalleFactura.deleteMany({
    where: { factura: { organizationId: orgId } }
  });
  await prisma.factura.deleteMany({
    where: { organizationId: orgId }
  });

  // 3. Resetear saldoInicial, ruta y vendedor de TODOS los clientes
  console.log('🧹 Reseteando saldoInicial y rutas de todos los clientes a 0...');
  await prisma.cliente.updateMany({
    where: { organizationId: orgId },
    data: {
      saldoInicial: 0,
      fechaSaldoInicial: null,
      ruta: null,
      vendedorId: null
    }
  });

  // 4. Leer EXCLUSIVAMENTE el archivo de José Méndez
  const wb = XLSX.readFile('referencias/CUENTAS POR COBRAR JOSE MENDEZ AGOSTO 2026.xlsx', { raw: true });
  console.log('📊 Total de hojas en archivo Excel de José Méndez:', wb.SheetNames.length);

  let clientesProcesados = 0;
  let totalFacturasCreadas = 0;
  let totalPagosCreados = 0;
  let totalCarteraFinal = 0;

  for (let sIdx = 0; sIdx < wb.SheetNames.length; sIdx++) {
    const sheetName = wb.SheetNames[sIdx];
    if (['Hoja2', 'Hoja3', 'RESUMIDO'].includes(sheetName.trim())) continue;

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    if (!rows || rows.length === 0) continue;

    let headerCliente = '';
    let headerLugar = '';

    for (let r = 0; r < Math.min(6, rows.length); r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').toUpperCase();
        if (val.includes('CLIENTE')) {
          headerCliente = String(row[c + 1] || row[c]).replace(/CLIENTE:?/i, '').trim();
        }
        if (val.includes('LUGAR')) {
          headerLugar = String(row[c + 1] || row[c]).replace(/LUGAR:?/i, '').trim();
        }
      }
    }

    const nombreCliente = (headerCliente || sheetName).trim().toUpperCase();
    const lugar = headerLugar.trim() || 'Santa Rosa De Copan';

    // Buscar o crear cliente
    let cliente = await prisma.cliente.findFirst({
      where: {
        organizationId: orgId,
        nombre: { equals: nombreCliente, mode: 'insensitive' }
      }
    });

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          organizationId: orgId,
          nombre: nombreCliente,
          departamento: lugar,
          ruta: 'Ruta Occidente',
          vendedorId: joseMendez.id,
          saldoInicial: 0
        }
      });
    } else {
      cliente = await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          ruta: 'Ruta Occidente',
          vendedorId: joseMendez.id,
          departamento: lugar || cliente.departamento || 'Santa Rosa De Copan',
          saldoInicial: 0
        }
      });
    }

    clientesProcesados++;

    // Extraer transacciones
    let runningSaldo = 0;
    let txNum = 0;

    for (let r = 4; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;

      const [rawFecha, rawDesc, rawCant, rawTot] = row;
      if (rawFecha === undefined && !rawDesc && rawCant === undefined && rawTot === undefined) continue;

      txNum++;
      const fecha = parseExcelDate(rawFecha);
      const desc = String(rawDesc || '').trim();
      const cant = typeof rawCant === 'number' ? rawCant : parseFloat(String(rawCant || '0').replace(/[^0-9.-]/g, '')) || 0;
      const tot = typeof rawTot === 'number' ? rawTot : parseFloat(String(rawTot || '0').replace(/[^0-9.-]/g, '')) || 0;

      // Determinar si es Cargo (Factura) o Abono (Pago)
      const isAbono =
        desc.toUpperCase().includes('ABONO') ||
        desc.toUpperCase().includes('PAGO') ||
        desc.toUpperCase().includes('DEPOSITO') ||
        desc.toUpperCase().includes('TRANSFERENCIA') ||
        desc.toUpperCase().includes('AJUSTE');

      if (isAbono) {
        // Registrar Pago
        const montoPago = Math.abs(cant);
        if (montoPago > 0) {
          await prisma.pagoCliente.create({
            data: {
              organizationId: orgId,
              clienteId: cliente.id,
              monto: montoPago,
              metodoPago: desc.toUpperCase().includes('TRANSFER') ? 'TRANSFERENCIA' : 'EFECTIVO',
              referencia: `ABONO EXCEL #${txNum}`,
              notas: desc || 'Abono registrado en Excel',
              fecha: fecha,
              creadoPorId: joseMendez.id
            }
          });
          totalPagosCreados++;
        }
      } else {
        // Registrar Factura / Cargo
        const montoFactura = Math.abs(cant);
        if (montoFactura > 0) {
          const correlativo = `FAC-OCC-${sIdx + 1}-${txNum}`;
          await prisma.factura.create({
            data: {
              organizationId: orgId,
              clienteId: cliente.id,
              correlativo: correlativo,
              total: montoFactura,
              subTotal: montoFactura,
              saldoPendiente: montoFactura,
              estado: 'EMITIDA',
              estadoPago: 'PENDIENTE',
              tipoDocumento: 'FACTURA',
              notas: desc || 'Venta de flor / mercadería',
              fechaEmision: fecha,
              creadoPorId: joseMendez.id
            }
          });
          totalFacturasCreadas++;
        }
      }

      if (typeof tot === 'number') {
        runningSaldo = tot;
      }
    }

    totalCarteraFinal += runningSaldo;
    console.log(`[${clientesProcesados}] ${nombreCliente} (${lugar}) -> Saldo final Excel: L. ${runningSaldo.toFixed(2)}`);
  }

  console.log('\n=============================================');
  console.log(`✅ SINCRONIZACIÓN EXITOSA:`);
  console.log(`   - Clientes de Ruta Occidente procesados: ${clientesProcesados}`);
  console.log(`   - Facturas creadas: ${totalFacturasCreadas}`);
  console.log(`   - Pagos / Abonos creados: ${totalPagosCreados}`);
  console.log(`   - Total cartera calculada: L. ${totalCarteraFinal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`);
  console.log('=============================================\n');
}

syncJoseMendezOnly()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
