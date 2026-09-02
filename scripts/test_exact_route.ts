import { prisma } from '../src/lib/prisma';

async function testExactRoute() {
  const user = { email: 'master@superapp.com' };

  console.log('Testing exact route logic...');
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
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

    console.log('1. dbUser:', dbUser?.id, dbUser?.email);

    const orgId = dbUser?.organizationId!;
    const searchParams = new URLSearchParams('filtro=CON_SALDO');
    const query = searchParams.get('q') || '';
    const filtro = searchParams.get('filtro') || 'CON_SALDO';
    const departamento = searchParams.get('departamento') || '';
    const vendedorParam = searchParams.get('vendedorId') || '';
    const rutaParam = searchParams.get('ruta') || '';

    const esAdminOGerente =
      dbUser?.role === 'SUPER_ADMIN' ||
      dbUser?.role === 'GERENTE' ||
      dbUser?.role === 'ORG_ADMIN' ||
      dbUser?.puedeVerTodasCxC === true ||
      Boolean(dbUser?.customRoleName?.toUpperCase().includes('ADMIN')) ||
      Boolean(dbUser?.customRoleName?.toUpperCase().includes('GERENTE')) ||
      Boolean(dbUser?.customRoleName?.toUpperCase().includes('DUEÑ')) ||
      Boolean(dbUser?.customRoleName?.toUpperCase().includes('PROPIETARIO')) ||
      dbUser?.email === 'dropiando7@gmail.com' ||
      dbUser?.email === 'admin@paraisofloral.com';

    console.log('2. esAdminOGerente:', esAdminOGerente);

    let whereCliente: any = { 
      organizationId: orgId,
      nombre: { not: 'CONSUMIDOR FINAL' }
    };

    if (!esAdminOGerente) {
      const allowedRutas = dbUser?.rutasAsignadas || [];
      const userConditions: any[] = [
        { vendedorId: dbUser?.id }
      ];
      if (allowedRutas.length > 0) {
        userConditions.push({ ruta: { in: allowedRutas, mode: 'insensitive' } });
        userConditions.push({ departamento: { in: allowedRutas, mode: 'insensitive' } });
      }
      whereCliente.AND = [
        { OR: userConditions }
      ];
    } else {
      if (vendedorParam && vendedorParam !== 'TODOS') {
        whereCliente.vendedorId = vendedorParam;
      }
      if (rutaParam && rutaParam !== 'TODOS') {
        whereCliente.ruta = { equals: rutaParam, mode: 'insensitive' };
      }
    }

    if (departamento.trim()) {
      whereCliente.departamento = { equals: departamento.trim(), mode: 'insensitive' };
    }

    if (query.trim()) {
      whereCliente.OR = [
        { nombre: { contains: query.trim(), mode: 'insensitive' } },
        { telefono: { contains: query.trim(), mode: 'insensitive' } },
        { rtn: { contains: query.trim(), mode: 'insensitive' } },
        { departamento: { contains: query.trim(), mode: 'insensitive' } },
        { ruta: { contains: query.trim(), mode: 'insensitive' } }
      ];
    }

    console.log('3. whereCliente:', JSON.stringify(whereCliente));

    // TEST CLIENTES QUERY
    const clientes = await prisma.cliente.findMany({
      where: whereCliente,
      select: {
        id: true,
        nombre: true,
        telefono: true,
        email: true,
        direccion: true,
        departamento: true,
        ruta: true,
        vendedorId: true,
        vendedor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            puesto: true
          }
        },
        rtn: true,
        notas: true,
        limiteCredito: true,
        saldoInicial: true,
        fechaSaldoInicial: true,
        diasCredito: true,
        facturas: {
          where: {
            estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] }
          },
          select: {
            id: true,
            correlativo: true,
            total: true,
            saldoPendiente: true,
            estadoPago: true,
            fechaEmision: true,
            fechaVencimiento: true
          },
          orderBy: { fechaEmision: 'desc' }
        },
        pagos: {
          where: { anulado: false },
          select: { id: true, monto: true, fecha: true }
        },
        notasCredito: {
          where: { anulado: false },
          select: { monto: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    console.log('4. Clientes query SUCCESS, count:', clientes.length);

    // TEST RESUMEN QUERY
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const abonosMes = await prisma.pagoCliente.aggregate({
      where: {
        organizationId: orgId,
        anulado: false,
        fecha: { gte: firstDayOfMonth },
        cliente: whereCliente
      },
      _sum: { monto: true }
    });

    console.log('5. Resumen abonosMes query SUCCESS:', abonosMes);

  } catch (err) {
    console.error('ERROR EN QUERY EXACTA:', err);
  }
}

testExactRoute()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
