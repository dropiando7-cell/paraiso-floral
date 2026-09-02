import { prisma } from '../src/lib/prisma';

async function diagnose() {
  console.log('=== 1. ORGANIZATIONS ===');
  const orgs = await prisma.organization.findMany();
  console.table(orgs);

  console.log('=== 2. ALL USERS ===');
  const users = await prisma.user.findMany({
    select: { id: true, email: true, nombre: true, apellido: true, role: true, organizationId: true, puedeVerTodasCxC: true, customRoleName: true }
  });
  console.table(users);

  console.log('=== 3. CLIENTES COUNT PER ORG ===');
  for (const org of orgs) {
    const totalClientes = await prisma.cliente.count({ where: { organizationId: org.id } });
    const clientesConSaldo = await prisma.cliente.count({ where: { organizationId: org.id, saldoInicial: { gt: 0 } } });
    console.log('Org:', org.id, org.name, 'Total Clientes:', totalClientes, 'Con saldoInicial > 0:', clientesConSaldo);
  }

  console.log('=== 4. FACTURAS COUNT ===');
  const facturasCount = await prisma.factura.count();
  const pagosCount = await prisma.pagoCliente.count();
  console.log('Total facturas en DB:', facturasCount, 'Total pagos en DB:', pagosCount);

  console.log('=== 5. OCCIDENTE CLIENTS & FACTURAS ===');
  const occ = await prisma.cliente.findMany({
    where: { ruta: 'Ruta Occidente' },
    select: {
      id: true,
      nombre: true,
      organizationId: true,
      vendedorId: true,
      saldoInicial: true,
      facturas: { select: { id: true, correlativo: true, total: true, saldoPendiente: true, estado: true } },
      pagos: { select: { id: true, monto: true } }
    }
  });
  console.log('Total Occidente clients:', occ.length);
  occ.slice(0, 10).forEach(c => {
    const fTot = c.facturas.reduce((s, f) => s + Number(f.total), 0);
    const pTot = c.pagos.reduce((s, p) => s + Number(p.monto), 0);
    console.log(c.nombre, '| SaldoInicial:', Number(c.saldoInicial), '| Facturas:', c.facturas.length, '(Total L.', fTot, ') | Pagos:', c.pagos.length, '(L.', pTot, ') | SaldoNeto:', Number(c.saldoInicial) + fTot - pTot);
  });
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
