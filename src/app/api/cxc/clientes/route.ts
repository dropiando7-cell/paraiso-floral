import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { isCredito, calcularFechaVencimiento } from '@/utils/facturaUtils';

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

    // Permisos: Admin/Gerente/Dueño ve todas las cuentas. Vendedor solo ve las suyas/sus rutas.
    const esAdminOGerente =
      dbUser.role === 'SUPER_ADMIN' ||
      dbUser.role === 'GERENTE' ||
      dbUser.role === 'ORG_ADMIN' ||
      dbUser.puedeVerTodasCxC === true ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('ADMIN')) ||
      Boolean(dbUser.customRoleName?.toUpperCase().includes('GERENTE')) ||
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
        { telefono: { contains: query.trim(), mode: 'insensitive' } },
        { rtn: { contains: query.trim(), mode: 'insensitive' } },
        { departamento: { contains: query.trim(), mode: 'insensitive' } },
        { ruta: { contains: query.trim(), mode: 'insensitive' } }
      ];
    }

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
            fechaVencimiento: true,
            terminosPago: true,
            validezDias: true
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

    const now = new Date();

    const resultado = clientes.map(c => {
      const sInicial = Number(c.saldoInicial || 0);
      const totalAbonado = c.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
      const totalNotasCredito = c.notasCredito.reduce((sum, n) => sum + Number(n.monto), 0);

      let totalFacturado = sInicial;
      let saldoVencido = 0;
      let maxDiasMora = 0;

      c.facturas.forEach(f => {
        const totalFactura = Number(f.total || 0);
        const saldo = f.saldoPendiente !== null ? Number(f.saldoPendiente) : totalFactura;
        totalFacturado += totalFactura;

        if (f.estadoPago === 'PAGADA' || saldo <= 0) return;

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

      const saldoTotal = totalFacturado - totalAbonado - totalNotasCredito;

      let facturasPendientesCount = c.facturas.filter(f => {
        const saldo = f.saldoPendiente !== null ? Number(f.saldoPendiente) : Number(f.total);
        return f.estadoPago !== 'PAGADA' && saldo > 0;
      }).length;

      if (sInicial > 0 && saldoTotal > 0 && c.facturas.length === 0) {
        facturasPendientesCount = 1;
      }

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
