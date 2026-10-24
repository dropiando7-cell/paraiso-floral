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

    const buildVendedorWhereCondition = (rawVendedor: string) => {
      const clean = rawVendedor.trim();
      const norm = clean
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

      const variants = new Set<string>([clean]);
      if (norm.includes('jose') || norm.includes('mendez')) {
        variants.add('Jose Mendez');
        variants.add('José Méndez');
        variants.add('Jose Méndez');
        variants.add('José Mendez');
      } else if (norm.includes('isamara') || norm.includes('vigil')) {
        variants.add('Isamara Vigil');
      } else if (norm.includes('erick') || norm.includes('saavedra')) {
        variants.add('Erick Saavedra');
      } else if (norm.includes('francis') || norm.includes('carias')) {
        variants.add('Francis Carias');
        variants.add('Francis Carías');
      } else if (norm.includes('lucio') || norm.includes('barahona')) {
        variants.add('Lucio Barahona');
      }

      const nameParts = clean.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || clean;

      const orConditions: any[] = [
        {
          facturas: {
            some: {
              estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] },
              tipoDocumento: { notIn: ['NOTA_CREDITO', 'COTIZACION', 'PRESUPUESTO_REPARACION', 'PRESUPUESTO_MANTENIMIENTO'] },
              OR: [
                ...Array.from(variants).map(v => ({
                  vendedorNombre: { equals: v, mode: 'insensitive' as const }
                })),
                { vendedorNombre: { contains: firstName, mode: 'insensitive' as const } }
              ]
            }
          }
        },
        {
          vendedor: {
            nombre: { contains: firstName, mode: 'insensitive' as const }
          }
        }
      ];

      if (isUuid) {
        orConditions.push({ vendedorId: clean });
      }

      return { OR: orConditions };
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
        whereCliente.AND = [
          ...(whereCliente.AND || []),
          buildVendedorWhereCondition(vendedorParam)
        ];
      }
      if (rutaParam && rutaParam !== 'TODOS') {
        whereCliente.ruta = { equals: rutaParam, mode: 'insensitive' };
      }
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const whereClienteConMovimientos = {
      ...whereCliente,
      AND: [
        ...(whereCliente.AND || []),
        {
          OR: [
            { saldoInicial: { gt: 0 } },
            {
              facturas: {
                some: {
                  estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] },
                  tipoDocumento: { notIn: ['NOTA_CREDITO', 'COTIZACION', 'PRESUPUESTO_REPARACION', 'PRESUPUESTO_MANTENIMIENTO'] }
                }
              }
            }
          ]
        }
      ]
    };

    // Fetch clients with potential balance and current month payments in parallel
    const [clientes, abonosMes] = await Promise.all([
      prisma.cliente.findMany({
        where: whereClienteConMovimientos,
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
              metodoPago: true,
              notas: true,
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
      }),
      prisma.pagoCliente.aggregate({
        where: {
          organizationId: orgId,
          anulado: false,
          fecha: { gte: firstDayOfMonth },
          cliente: whereCliente
        },
        _sum: { monto: true }
      })
    ]);

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
