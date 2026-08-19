import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cliente = await prisma.cliente.findFirst({
    where: { nombre: { contains: 'ROSALIA', mode: 'insensitive' } },
    include: {
      facturas: true,
      pagos: {
        include: { detalles: true }
      },
      notasCredito: true
    }
  });

  if (!cliente) return console.log('No cliente');

  const totalFacturado = cliente.facturas.reduce((sum, f) => sum + Number(f.total), 0);
  const totalPagado = cliente.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
  const totalNotasCredito = cliente.notasCredito.reduce((sum, nc) => sum + Number(nc.monto), 0);
  const saldoPendiente = totalFacturado - totalPagado - totalNotasCredito;

  console.log('--- RESUMEN FINANCIERO ROSALIA ---');
  console.log('Cliente:', cliente.nombre, '| RTN:', cliente.rtn, '| Dirección:', cliente.direccion);
  console.log('Total Facturado:', totalFacturado);
  console.log('Total Depósitos (Abonos):', totalPagado);
  console.log('Total Notas Crédito (Flor dañada):', totalNotasCredito);
  console.log('Saldo Pendiente Final:', saldoPendiente);
  console.log('Total Movimientos:', cliente.facturas.length + cliente.pagos.length + cliente.notasCredito.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
