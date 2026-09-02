import { prisma } from '../src/lib/prisma';

async function testConSaldo() {
  const occClients = await prisma.cliente.findMany({
    where: { ruta: 'Ruta Occidente' },
    include: {
      facturas: { where: { estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] } } },
      pagos: { where: { anulado: false } },
      notasCredito: { where: { anulado: false } }
    }
  });

  const list = occClients.map(c => {
    const sInicial = Number(c.saldoInicial || 0);
    const totF = c.facturas.reduce((s, f) => s + Number(f.total), 0);
    const totP = c.pagos.reduce((s, p) => s + Number(p.monto), 0);
    const totNC = c.notasCredito.reduce((s, n) => s + Number(n.monto), 0);
    const saldo = sInicial + totF - totP - totNC;
    return {
      nombre: c.nombre,
      lugar: c.departamento,
      facturas: c.facturas.length,
      pagos: c.pagos.length,
      saldo
    };
  });

  const conSaldo = list.filter(c => c.saldo > 0);
  console.log('Total clientes de Ruta Occidente:', occClients.length);
  console.log('Clientes con saldo > 0:', conSaldo.length);
  console.log('Total cartera neta: L.', conSaldo.reduce((s, c) => s + c.saldo, 0).toLocaleString('es-HN', { minimumFractionDigits: 2 }));
  console.table(conSaldo);
}

testConSaldo()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
