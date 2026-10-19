import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { calcularEstadoCuentaClienteCxC } from '@/utils/facturaUtils';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: {
        id: true,
        email: true,
        organizationId: true,
        role: true,
        puedeVerTodasCxC: true,
        accessibleModules: true,
        rutasAsignadas: true,
        customRoleName: true
      }
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const orgId = dbUser.organizationId;
    const { searchParams } = new URL(request.url);
    const vendedorParam = searchParams.get('vendedorId') || '';
    const rutaParam = searchParams.get('ruta') || '';

    const esAdminOGerente =
      dbUser.role === 'SUPER_ADMIN' ||
      dbUser.role === 'GERENTE' ||
      dbUser.role === 'ORG_ADMIN' ||
      dbUser.puedeVerTodasCxC === true ||
      Boolean(dbUser.accessibleModules?.includes('cxc_global')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('ADMIN')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('GERENTE')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('GERENCIA')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('DUEÑ')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('PROPIETARIO')) ||
      dbUser.email === 'dropiando7@gmail.com' ||
      dbUser.email === 'admin@paraisofloral.com';

    let whereCliente: any = { 
      organizationId: orgId,
      nombre: { not: 'CONSUMIDOR FINAL' }
    };

    if (!esAdminOGerente) {
      const allowedRutas = dbUser.rutasAsignadas || [];
      const userConditions: any[] = [
        { vendedorId: dbUser.id }
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

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all clients within user's permitted scope
    const clientes = await prisma.cliente.findMany({
      where: whereCliente,
      select: {
        id: true,
        saldoInicial: true,
        facturas: {
          where: {
            estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] },
            tipoDocumento: { notIn: ['NOTA_CREDITO', 'COTIZACION', 'PRESUPUESTO_REPARACION', 'PRESUPUESTO_MANTENIMIENTO'] }
          },
          select: {
            id: true,
            total: true,
            saldoPendiente: true,
            estadoPago: true,
            estado: true,
            terminosPago: true,
            metodoPago: true,
            fechaEmision: true
          }
        },
        pagos: {
          where: { anulado: false },
          select: {
            monto: true,
            detalles: {
              select: {
                facturaId: true,
                montoAplicado: true
              }
            }
          }
        },
        notasCredito: {
          where: { anulado: false },
          select: { monto: true, facturaId: true }
        }
      }
    });

    // Abonos del mes actual dentro del alcance
    const abonosMes = await prisma.pagoCliente.aggregate({
      where: {
        organizationId: orgId,
        anulado: false,
        fecha: { gte: firstDayOfMonth },
        cliente: whereCliente
      },
      _sum: { monto: true }
    });

    let totalCartera = 0;
    let totalVencido = 0;
    let alDia = 0;
    let porVencer = 0;
    let vencido = 0;
    let enRiesgo = 0;
    let clientesMorososCount = 0;

    clientes.forEach(c => {
      const calc = calcularEstadoCuentaClienteCxC({
        saldoInicial: c.saldoInicial,
        facturas: c.facturas,
        pagos: c.pagos,
        notasCredito: c.notasCredito
      });

      const saldoTotal = Math.max(0, calc.saldoTotal);
      if (saldoTotal <= 0) return; // No debt

      totalCartera += saldoTotal;

      let debtToAllocate = saldoTotal;
      let hasOverdue = false;

      // Sort client's unpaid invoices by age (oldest first)
      const unpaidFacturas = c.facturas
        .map(f => {
          const info = calc.mapaFacturasInfo[f.id];
          const totalFactura = Number(f.total || 0);
          const saldo = info ? info.saldoPendiente : (f.saldoPendiente !== null ? Number(f.saldoPendiente) : totalFactura);
          const estadoPago = info ? info.estadoPago : (f.estadoPago || 'PENDIENTE');
          const diffTime = Math.abs(now.getTime() - new Date(f.fechaEmision).getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return { saldo, estadoPago, diffDays };
        })
        .filter(f => f.estadoPago !== 'PAGADA' && f.saldo > 0.01)
        .sort((a, b) => b.diffDays - a.diffDays);

      unpaidFacturas.forEach(f => {
        if (debtToAllocate <= 0) return;
        const allocated = Math.min(debtToAllocate, f.saldo);
        debtToAllocate -= allocated;

        if (f.diffDays <= 7) {
          alDia += allocated;
        } else if (f.diffDays <= 15) {
          porVencer += allocated;
        } else if (f.diffDays <= 30) {
          vencido += allocated;
          totalVencido += allocated;
          hasOverdue = true;
        } else {
          enRiesgo += allocated;
          totalVencido += allocated;
          hasOverdue = true;
        }
      });

      // Remaining debt represents unpaid initial Excel balance
      if (debtToAllocate > 0) {
        enRiesgo += debtToAllocate;
        totalVencido += debtToAllocate;
        hasOverdue = true;
      }

      if (hasOverdue) {
        clientesMorososCount++;
      }
    });

    return NextResponse.json({
      totalCartera,
      totalVencido,
      cobradoEsteMes: Number(abonosMes._sum.monto || 0),
      clientesMorososCount,
      antiguedad: {
        alDia,
        porVencer,
        vencido,
        enRiesgo
      }
    });
  } catch (error: any) {
    console.error('Error en /api/cxc/resumen:', error);
    return NextResponse.json({ 
      error: 'Error calculando resumen de CxC',
      details: error?.message || String(error),
      stack: error?.stack
    }, { status: 500 });
  }
}
