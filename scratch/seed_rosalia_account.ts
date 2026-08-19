import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const clienteId = 'c28c42cf-9a86-4cee-ae19-f7218d150701';
  const organizationId = 'a0287245-6cad-4df5-a32a-f214b7b72e04';

  // 1. Actualizar datos de cliente ROSALIA
  await prisma.cliente.update({
    where: { id: clienteId },
    data: {
      direccion: 'TOCOA, COLON',
      rtn: '0507199403323',
    }
  });

  // Limpiar cualquier registro previo si existiera
  await prisma.pagoDetalleFactura.deleteMany({
    where: { pago: { clienteId } }
  });
  await prisma.pagoCliente.deleteMany({ where: { clienteId } });
  await prisma.notaCreditoCliente.deleteMany({ where: { clienteId } });
  await prisma.factura.deleteMany({ where: { clienteId } });

  console.log('🧹 Limpieza completada para ROSALIA');

  // Helper para generar fechas en UTC
  const makeDate = (day: number, monthStr: string, year: number = 2026) => {
    const months: Record<string, number> = {
      'may': 4,
      'jun': 5,
      'jul': 6,
      'ago': 7
    };
    return new Date(Date.UTC(year, months[monthStr], day, 12, 0, 0));
  };

  // 2. Crear las 7 Facturas
  // Factura 1: 24-may-26 -> L. 4,800.00
  const f1 = await prisma.factura.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'FAC-ROS-001',
      fechaEmision: makeDate(24, 'may'),
      subTotal: 4800,
      total: 4800,
      estado: 'PAGADA',
      tipoDocumento: 'FACTURA',
      notas: 'Venta de flores a crédito'
    }
  });

  // Factura 2: 31-may-26 -> L. 6,420.00
  const f2 = await prisma.factura.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'FAC-ROS-002',
      fechaEmision: makeDate(31, 'may'),
      subTotal: 6420,
      total: 6420,
      estado: 'PAGADA',
      tipoDocumento: 'FACTURA',
      notas: 'Venta de flores a crédito'
    }
  });

  // Factura 3: 3-jun-26 -> L. 3,810.00
  const f3 = await prisma.factura.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'FAC-ROS-003',
      fechaEmision: makeDate(3, 'jun'),
      subTotal: 3810,
      total: 3810,
      estado: 'PAGADA',
      tipoDocumento: 'FACTURA',
      notas: 'Venta de flores a crédito'
    }
  });

  // Factura 4: 7-jun-26 -> L. 7,060.00
  const f4 = await prisma.factura.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'FAC-ROS-004',
      fechaEmision: makeDate(7, 'jun'),
      subTotal: 7060,
      total: 7060,
      estado: 'PAGADA',
      tipoDocumento: 'FACTURA',
      notas: 'Venta de flores a crédito'
    }
  });

  // Factura 5: 10-jun-26 -> L. 5,400.00
  const f5 = await prisma.factura.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'FAC-ROS-005',
      fechaEmision: makeDate(10, 'jun'),
      subTotal: 5400,
      total: 5400,
      estado: 'PAGADA',
      tipoDocumento: 'FACTURA',
      notas: 'Venta de flores a crédito'
    }
  });

  // Factura 6: 14-jun-26 -> L. 5,280.00
  const f6 = await prisma.factura.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'FAC-ROS-006',
      fechaEmision: makeDate(14, 'jun'),
      subTotal: 5280,
      total: 5280,
      estado: 'PAGADA',
      tipoDocumento: 'FACTURA',
      notas: 'Venta de flores a crédito'
    }
  });

  // Factura 7: 17-jun-26 -> L. 7,510.00
  const f7 = await prisma.factura.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'FAC-ROS-007',
      fechaEmision: makeDate(17, 'jun'),
      subTotal: 7510,
      total: 7510,
      estado: 'PAGADA',
      tipoDocumento: 'FACTURA',
      notas: 'Venta de flores a crédito'
    }
  });

  console.log('✅ 7 Facturas creadas');

  // 3. Depósitos (Abonos) & Notas de Crédito
  // 29-may-26: Depósito L. 4,700.00 + Crédito L. 100.00 (para Factura f1 L. 4,800.00)
  const p1 = await prisma.pagoCliente.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'PAGO-ROS-001',
      monto: 4700,
      fecha: makeDate(29, 'may'),
      metodoPago: 'DEPOSITO',
      banco: 'ATLANTIDA',
      referencia: 'DEP-29MAY-4700',
      notas: 'Depósito Banco Atlántida',
      detalles: {
        create: [
          { facturaId: f1.id, montoAplicado: 4700 }
        ]
      }
    }
  });

  const nc1 = await prisma.notaCreditoCliente.create({
    data: {
      organizationId,
      clienteId,
      facturaId: f1.id,
      correlativo: 'NC-ROS-001',
      monto: 100,
      motivo: 'FLOR_DANADA',
      descripcion: 'Flor en mal estado',
      fecha: makeDate(29, 'may')
    }
  });

  // 04-jun-26: Depósito L. 5,770.00 + Crédito L. 650.00 (para Factura f2 L. 6,420.00)
  const p2 = await prisma.pagoCliente.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'PAGO-ROS-002',
      monto: 5770,
      fecha: makeDate(4, 'jun'),
      metodoPago: 'DEPOSITO',
      banco: 'ATLANTIDA',
      referencia: 'DEP-04JUN-5770',
      notas: 'Depósito Banco Atlántida',
      detalles: {
        create: [
          { facturaId: f2.id, montoAplicado: 5770 }
        ]
      }
    }
  });

  const nc2 = await prisma.notaCreditoCliente.create({
    data: {
      organizationId,
      clienteId,
      facturaId: f2.id,
      correlativo: 'NC-ROS-002',
      monto: 650,
      motivo: 'FLOR_DANADA',
      descripcion: 'Flor en mal estado',
      fecha: makeDate(4, 'jun')
    }
  });

  // 10-jun-26: Depósito L. 3,810.00 (para Factura f3 L. 3,810.00)
  const p3 = await prisma.pagoCliente.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'PAGO-ROS-003',
      monto: 3810,
      fecha: makeDate(10, 'jun'),
      metodoPago: 'DEPOSITO',
      banco: 'ATLANTIDA',
      referencia: 'DEP-10JUN-3810',
      notas: 'Depósito Banco Atlántida',
      detalles: {
        create: [
          { facturaId: f3.id, montoAplicado: 3810 }
        ]
      }
    }
  });

  // 10-jun-26: Depósito L. 7,060.00 (para Factura f4 L. 7,060.00)
  const p4 = await prisma.pagoCliente.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'PAGO-ROS-004',
      monto: 7060,
      fecha: makeDate(10, 'jun'),
      metodoPago: 'DEPOSITO',
      banco: 'ATLANTIDA',
      referencia: 'DEP-10JUN-7060',
      notas: 'Depósito Banco Atlántida',
      detalles: {
        create: [
          { facturaId: f4.id, montoAplicado: 7060 }
        ]
      }
    }
  });

  // 17-jun-26: Depósito L. 4,930.00 + Crédito L. 350.00 (para Factura f6 L. 5,280.00)
  const p5 = await prisma.pagoCliente.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'PAGO-ROS-005',
      monto: 4930,
      fecha: makeDate(17, 'jun'),
      metodoPago: 'DEPOSITO',
      banco: 'ATLANTIDA',
      referencia: 'DEP-17JUN-4930',
      notas: 'Depósito Banco Atlántida',
      detalles: {
        create: [
          { facturaId: f6.id, montoAplicado: 4930 }
        ]
      }
    }
  });

  const nc3 = await prisma.notaCreditoCliente.create({
    data: {
      organizationId,
      clienteId,
      facturaId: f6.id,
      correlativo: 'NC-ROS-003',
      monto: 350,
      motivo: 'FLOR_DANADA',
      descripcion: 'Flor en mal estado',
      fecha: makeDate(17, 'jun')
    }
  });

  // 17-jun-26: Depósito L. 4,800.00 + Crédito L. 600.00 (para Factura f5 L. 5,400.00)
  const p6 = await prisma.pagoCliente.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'PAGO-ROS-006',
      monto: 4800,
      fecha: makeDate(17, 'jun'),
      metodoPago: 'DEPOSITO',
      banco: 'ATLANTIDA',
      referencia: 'DEP-17JUN-4800',
      notas: 'Depósito Banco Atlántida',
      detalles: {
        create: [
          { facturaId: f5.id, montoAplicado: 4800 }
        ]
      }
    }
  });

  const nc4 = await prisma.notaCreditoCliente.create({
    data: {
      organizationId,
      clienteId,
      facturaId: f5.id,
      correlativo: 'NC-ROS-004',
      monto: 600,
      motivo: 'FLOR_DANADA',
      descripcion: 'Flor en mal estado',
      fecha: makeDate(17, 'jun')
    }
  });

  // 21-jun-26: Depósito L. 4,660.00 + Crédito L. 2,850.00 (para Factura f7 L. 7,510.00)
  const p7 = await prisma.pagoCliente.create({
    data: {
      organizationId,
      clienteId,
      correlativo: 'PAGO-ROS-007',
      monto: 4660,
      fecha: makeDate(21, 'jun'),
      metodoPago: 'DEPOSITO',
      banco: 'ATLANTIDA',
      referencia: 'DEP-21JUN-4660',
      notas: 'Depósito Banco Atlántida',
      detalles: {
        create: [
          { facturaId: f7.id, montoAplicado: 4660 }
        ]
      }
    }
  });

  const nc5 = await prisma.notaCreditoCliente.create({
    data: {
      organizationId,
      clienteId,
      facturaId: f7.id,
      correlativo: 'NC-ROS-005',
      monto: 2850,
      motivo: 'FLOR_DANADA',
      descripcion: 'Flor en mal estado',
      fecha: makeDate(21, 'jun')
    }
  });

  console.log('✅ 7 Depósitos (Abonos) y 5 Notas de Crédito creadas exitosamente para ROSALIA!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
