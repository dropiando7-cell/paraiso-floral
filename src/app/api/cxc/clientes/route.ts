import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { isCredito, calcularFechaVencimiento, calcularEstadoCuentaClienteCxC } from '@/utils/facturaUtils';

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
    const query = searchParams.get('q') || '';
    const filtro = searchParams.get('filtro') || 'CON_SALDO'; // CON_SALDO, TODOS, TOP_DEUDORES, MOROSOS, AL_DIA, POR_VENCER, VENCIDO, RIESGO
    const departamento = searchParams.get('departamento') || '';
    const vendedorParam = searchParams.get('vendedorId') || '';
    const rutaParam = searchParams.get('ruta') || '';
    const pageParam = parseInt(searchParams.get('page') || '0', 10);
    const limitParam = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const compactParam = searchParams.get('compact') === '1';

    // Permisos: Admin/Gerente/Dueño ve todas las cuentas. Vendedor solo ve las suyas/sus rutas.
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

    // Obtener clientes de la organización (excluyendo CONSUMIDOR FINAL)
    let whereCliente: any = { 
      organizationId: orgId,
      nombre: { not: 'CONSUMIDOR FINAL' }
    };

    if (!esAdminOGerente) {
      // Filtrar estrictamente a los clientes del vendedor o de sus rutas asignadas
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
      // Para admin / gerencia, aplicar filtros opcionales de vendedor o ruta
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
        { alias: { contains: query.trim(), mode: 'insensitive' } },
        { telefono: { contains: query.trim(), mode: 'insensitive' } },
        { rtn: { contains: query.trim(), mode: 'insensitive' } },
        { departamento: { contains: query.trim(), mode: 'insensitive' } },
        { ruta: { contains: query.trim(), mode: 'insensitive' } },
        { facturas: { some: { correlativo: { contains: query.trim(), mode: 'insensitive' } } } }
      ];
    } else if (['CON_SALDO', 'TOP_DEUDORES', 'MOROSOS', 'POR_VENCER', 'VENCIDO', 'RIESGO'].includes(filtro)) {
      // Pre-filtro en BD: descartar clientes sin saldo inicial ni facturas activas
      whereCliente.AND = [
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
      ];
    }

    const clientes = await prisma.cliente.findMany({
      where: whereCliente,
      select: {
        id: true,
        nombre: true,
        alias: true,
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
            estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] },
            tipoDocumento: { notIn: ['NOTA_CREDITO', 'COTIZACION', 'PRESUPUESTO_REPARACION', 'PRESUPUESTO_MANTENIMIENTO'] }
          },
          select: {
            id: true,
            correlativo: true,
            total: true,
            saldoPendiente: true,
            estadoPago: true,
            estado: true,
            metodoPago: true,
            fechaEmision: true,
            fechaVencimiento: true,
            terminosPago: true,
            validezDias: true
          },
          orderBy: { fechaEmision: 'desc' }
        },
        pagos: {
          where: { anulado: false },
          select: {
            id: true,
            monto: true,
            fecha: true,
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
      },
      orderBy: { nombre: 'asc' }
    });

    const now = new Date();

    const resultado = clientes.map(c => {
      const {
        sInicial,
        saldoInicialPendiente,
        saldoTotal,
        mapaFacturasInfo: mapaSaldoFactura
      } = calcularEstadoCuentaClienteCxC({
        saldoInicial: c.saldoInicial,
        facturas: c.facturas,
        pagos: c.pagos,
        notasCredito: c.notasCredito
      });

      let saldoVencido = 0;
      let maxDiasMora = 0;

      c.facturas.forEach(f => {
        const totalFactura = Number(f.total || 0);
        const info = mapaSaldoFactura[f.id];
        const saldo = info ? info.saldoPendiente : (f.saldoPendiente !== null ? Number(f.saldoPendiente) : totalFactura);

        if ((info ? info.estadoPago === 'PAGADA' : f.estadoPago === 'PAGADA') || saldo <= 0) return;

        let fechaVenc: Date | null = f.fechaVencimiento ? new Date(f.fechaVencimiento) : null;
        if (!fechaVenc && isCredito(f.terminosPago)) {
          fechaVenc = calcularFechaVencimiento(f.fechaEmision, f.terminosPago, f.validezDias || c.diasCredito || 30);
        }
        if (!fechaVenc) {
          const dias = c.diasCredito || 15;
          fechaVenc = new Date(new Date(f.fechaEmision).getTime() + dias * 24 * 60 * 60 * 1000);
        }

        const diffTime = now.getTime() - fechaVenc.getTime();
        if (diffTime > 0) {
          const diasMora = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diasMora > maxDiasMora) {
            maxDiasMora = diasMora;
          }
          saldoVencido += saldo;
        }
      });

      // Construir el desglose de facturas pendientes (ordenadas de más reciente a más antigua)
      const facturasPendientes: Array<{
        id: string;
        correlativo: string;
        fechaEmision: Date | string | null;
        total: number;
        saldoPendiente: number;
        estadoPago: string;
        esSaldoInicial?: boolean;
      }> = c.facturas
        .map(f => {
          const total = Number(f.total || 0);
          const info = mapaSaldoFactura[f.id] || { saldoPendiente: total, estadoPago: 'PENDIENTE' };
          return {
            id: f.id,
            correlativo: f.correlativo,
            fechaEmision: f.fechaEmision,
            total,
            saldoPendiente: info.saldoPendiente,
            estadoPago: info.estadoPago
          };
        })
        .filter(f => f.saldoPendiente > 0.01);

      if (saldoInicialPendiente > 0.01) {
        facturasPendientes.push({
          id: 'saldo-inicial',
          correlativo: 'SALDO ANT.',
          fechaEmision: c.fechaSaldoInicial || null,
          total: sInicial,
          saldoPendiente: Number(saldoInicialPendiente.toFixed(2)),
          estadoPago: saldoInicialPendiente < sInicial - 0.01 ? 'PARCIAL' : 'PENDIENTE',
          esSaldoInicial: true
        });
      }

      const facturasPendientesCount = facturasPendientes.length;

      const sortedPagos = [...c.pagos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      const ultimoPago = sortedPagos[0] || null;

      return {
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono,
        email: c.email,
        direccion: c.direccion,
        departamento: c.departamento,
        ruta: c.ruta || 'Ruta Occidente',
        alias: c.alias,
        vendedorId: c.vendedorId,
        vendedorNombre: c.vendedor?.nombre ? `${c.vendedor.nombre} ${c.vendedor.apellido || ''}`.trim() : null,
        rtn: c.rtn,
        notas: c.notas,
        limiteCredito: Number(c.limiteCredito || 0),
        saldoInicial: sInicial,
        fechaSaldoInicial: c.fechaSaldoInicial,
        diasCredito: c.diasCredito || 15,
        saldoTotal,
        saldoVencido,
        facturasPendientesCount,
        ...(compactParam ? {} : { facturasPendientes }),
        maxDiasMora,
        ultimoPago: ultimoPago ? {
          monto: Number(ultimoPago.monto),
          fecha: ultimoPago.fecha
        } : null
      };
    });

    // Aplicar filtro de saldo / antigüedad / morosidad
    let resultadoFiltrado = resultado;
    
    if (query.trim()) {
      // Si el usuario está buscando un cliente específico por nombre, mostrarlo sin importar si su saldo es 0
      if (filtro === 'MOROSOS') {
        resultadoFiltrado = resultado.filter(c => c.saldoTotal > 0 && (c.saldoVencido > 0 || c.maxDiasMora > 15));
      } else if (filtro === 'RIESGO') {
        resultadoFiltrado = resultado.filter(c => c.saldoTotal > 0 && c.maxDiasMora > 30);
      }
    } else {
      // Sin búsqueda de texto, aplicar los filtros de pestaña normales
      if (filtro === 'CON_SALDO') {
        resultadoFiltrado = resultado.filter(c => c.saldoTotal > 0);
      } else if (filtro === 'TOP_DEUDORES') {
        resultadoFiltrado = resultado.filter(c => c.saldoTotal > 0);
        resultadoFiltrado.sort((a, b) => b.saldoTotal - a.saldoTotal);
      } else if (filtro === 'MOROSOS') {
        resultadoFiltrado = resultado.filter(c => c.saldoTotal > 0 && (c.saldoVencido > 0 || c.maxDiasMora > 15));
      } else if (filtro === 'AL_DIA') {
        resultadoFiltrado = resultado.filter(c => c.saldoTotal <= 0 || c.maxDiasMora <= 7);
      } else if (filtro === 'POR_VENCER') {
        resultadoFiltrado = resultado.filter(c => c.saldoTotal > 0 && c.maxDiasMora > 7 && c.maxDiasMora <= 15);
      } else if (filtro === 'VENCIDO') {
        resultadoFiltrado = resultado.filter(c => c.saldoTotal > 0 && c.maxDiasMora > 15 && c.maxDiasMora <= 30);
      } else if (filtro === 'RIESGO') {
        resultadoFiltrado = resultado.filter(c => c.saldoTotal > 0 && c.maxDiasMora > 30);
      }
    }

    // Por defecto ordenar de mayor saldo pendiente a menor, y luego alfabéticamente
    if (filtro !== 'TOP_DEUDORES') {
      resultadoFiltrado.sort((a, b) => {
        if (b.saldoTotal !== a.saldoTotal) {
          return b.saldoTotal - a.saldoTotal;
        }
        return a.nombre.localeCompare(b.nombre);
      });
    }

    if (pageParam > 0) {
      const total = resultadoFiltrado.length;
      const totalPages = Math.max(1, Math.ceil(total / limitParam));
      const safePage = Math.min(Math.max(1, pageParam), totalPages);
      const startIdx = (safePage - 1) * limitParam;
      const items = resultadoFiltrado.slice(startIdx, startIdx + limitParam);

      return NextResponse.json({
        items,
        total,
        page: safePage,
        limit: limitParam,
        totalPages
      });
    }

    return NextResponse.json(resultadoFiltrado);
  } catch (error: any) {
    console.error('Error en /api/cxc/clientes:', error);
    return NextResponse.json({ 
      error: 'Error cargando lista de cuentas por cobrar',
      details: error?.message || String(error),
      stack: error?.stack
    }, { status: 500 });
  }
}
