import { prisma } from '../src/lib/prisma';

async function testApiQuery() {
  const userEmail = 'master@superapp.com';
  const dbUser = await prisma.user.findUnique({
    where: { email: userEmail },
    select: {
      id: true,
      email: true,
      organizationId: true,
      role: true,
      puedeVerTodasCxC: true,
      rutasAsignadas: true,
      customRoleName: true
    }
  });

  console.log('dbUser:', dbUser);

  const esAdminOGerente =
    dbUser?.role === 'SUPER_ADMIN' ||
    dbUser?.role === 'GERENTE' ||
    dbUser?.role === 'ORG_ADMIN' ||
    dbUser?.puedeVerTodasCxC === true;

  console.log('esAdminOGerente:', esAdminOGerente);

  const orgId = dbUser?.organizationId!;

  let whereCliente: any = { 
    organizationId: orgId,
    nombre: { not: 'CONSUMIDOR FINAL' }
  };

  const clientes = await prisma.cliente.findMany({
    where: whereCliente,
    select: {
      id: true,
      nombre: true,
      ruta: true,
      vendedorId: true,
      saldoInicial: true,
      facturas: {
        where: { estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] } },
        select: { total: true, saldoPendiente: true, estadoPago: true, fechaEmision: true }
      },
      pagos: {
        where: { anulado: false },
        select: { monto: true }
      },
      notasCredito: {
        where: { anulado: false },
        select: { monto: true }
      }
    }
  });

  console.log('Total clientes fetched in query:', clientes.length);

  let conSaldoCount = 0;
  let totalCartera = 0;

  clientes.forEach(c => {
    const sInicial = Number(c.saldoInicial || 0);
    const totalAbonado = c.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
    const totalNotasCredito = c.notasCredito.reduce((sum, n) => sum + Number(n.monto), 0);
    let totalFacturado = sInicial;
    c.facturas.forEach(f => {
      totalFacturado += Number(f.total || 0);
    });
    const saldoTotal = totalFacturado - totalAbonado - totalNotasCredito;
    if (saldoTotal > 0) {
      conSaldoCount++;
      totalCartera += saldoTotal;
    }
  });

  console.log('Clientes con saldoTotal > 0:', conSaldoCount);
  console.log('Total cartera calculado:', totalCartera);
}

testApiQuery()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
