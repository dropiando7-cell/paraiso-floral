import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

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
    const clienteId = searchParams.get('clienteId');

    if (!clienteId) {
      return NextResponse.json({ error: 'clienteId es requerido' }, { status: 400 });
    }

    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, organizationId: orgId },
      include: {
        facturas: {
          where: { estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] } },
          include: { detalles: true, creadoPor: { select: { nombre: true, apellido: true } } },
          orderBy: { fechaEmision: 'asc' }
        },
        pagos: {
          where: { anulado: false },
          include: { creadoPor: { select: { nombre: true, apellido: true } } },
          orderBy: { fecha: 'asc' }
        },
        notasCredito: {
          where: { anulado: false },
          include: { creadoPor: { select: { nombre: true, apellido: true } } },
          orderBy: { fecha: 'asc' }
        }
      }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

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

    if (!esAdminOGerente) {
      const allowedRutas = (dbUser.rutasAsignadas || []).map(r => r.toUpperCase());
      const cRuta = (cliente.ruta || '').toUpperCase();
      const cDept = (cliente.departamento || '').toUpperCase();

      const tieneAcceso =
        cliente.vendedorId === dbUser.id ||
        (cRuta && allowedRutas.includes(cRuta)) ||
        (cDept && allowedRutas.includes(cDept));

      if (!tieneAcceso) {
        return NextResponse.json({ error: 'No tienes permiso para ver esta cuenta por cobrar' }, { status: 403 });
      }
    }

    // Construir lista unificada estilo Excel
    const items: Array<{
      id: string;
      originalId: string;
      fecha: string;
      tipo: 'SALDO_INICIAL' | 'FACTURA' | 'PAGO_EFECTIVO' | 'TRANSFERENCIA' | 'AJUSTE_FLOR';
      tipoEtiqueta: string;
      documento: string;
      detalles: string;
      debito: number;
      credito: number;
      saldoAcumulado: number;
      rawDate: Date;
    }> = [];

    // Saldo inicial si existe
    const sInicial = Number(cliente.saldoInicial || 0);
    if (sInicial > 0) {
      items.push({
        id: 's-inicial',
        originalId: cliente.id,
        fecha: cliente.fechaSaldoInicial ? new Date(cliente.fechaSaldoInicial).toISOString() : '2026-01-01T00:00:00.000Z',
        rawDate: cliente.fechaSaldoInicial ? new Date(cliente.fechaSaldoInicial) : new Date('2026-01-01'),
        tipo: 'SALDO_INICIAL',
        tipoEtiqueta: 'SALDO ANTERIOR',
        documento: 'SALDO INICIAL EXCEL',
        detalles: 'Carga inicial o saldo previo de libreta',
        debito: sInicial,
        credito: 0,
        saldoAcumulado: sInicial
      });
    }

    // Facturas
    cliente.facturas.forEach(f => {
      const desc = f.detalles && f.detalles.length > 0
        ? f.detalles.map(d => `${d.cantidad > 1 ? `${d.cantidad}x ` : ''}${d.descripcion}`).join(', ')
        : (f.notas || 'Venta a Crédito Comercial');

      items.push({
        id: `fac-${f.id}`,
        originalId: f.id,
        fecha: new Date(f.fechaEmision).toISOString(),
        rawDate: new Date(f.fechaEmision),
        tipo: 'FACTURA',
        tipoEtiqueta: 'FACTURA',
        documento: f.correlativo || 'FACTURA',
        detalles: desc,
        debito: Number(f.total || 0),
        credito: 0,
        saldoAcumulado: 0
      });
    });

    // Pagos
    cliente.pagos.forEach(p => {
      const esEfectivo = p.metodoPago === 'EFECTIVO';
      const desc = `${p.metodoPago}${p.banco ? ` en ${p.banco}` : ''}${p.referencia ? ` Ref: ${p.referencia}` : ''}${p.notas ? ` (${p.notas})` : ''}`;

      items.push({
        id: `pago-${p.id}`,
        originalId: p.id,
        fecha: new Date(p.fecha).toISOString(),
        rawDate: new Date(p.fecha),
        tipo: esEfectivo ? 'PAGO_EFECTIVO' : 'TRANSFERENCIA',
        tipoEtiqueta: esEfectivo ? 'PAGO EFECTIVO' : 'ABONO TRANSFERENCIA',
        documento: p.correlativo || 'RECIBO PAGO',
        detalles: desc,
        debito: 0,
        credito: Number(p.monto || 0),
        saldoAcumulado: 0
      });
    });

    // Notas de crédito
    cliente.notasCredito.forEach(nc => {
      items.push({
        id: `nc-${nc.id}`,
        originalId: nc.id,
        fecha: new Date(nc.fecha).toISOString(),
        rawDate: new Date(nc.fecha),
        tipo: 'AJUSTE_FLOR',
        tipoEtiqueta: 'AJUSTE FLOR DAÑADA',
        documento: nc.correlativo || 'NOTA CRÉDITO',
        detalles: nc.descripcion || 'Ajuste / Merma por flor dañada',
        debito: 0,
        credito: Number(nc.monto || 0),
        saldoAcumulado: 0
      });
    });

    // Ordenar cronológicamente (más antiguo al más nuevo)
    items.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    // Calcular saldos acumulados fila a fila
    let balance = 0;
    const movimientosCalculados = items.map(it => {
      balance = balance + it.debito - it.credito;
      return {
        ...it,
        saldoAcumulado: balance
      };
    });

    return NextResponse.json({
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        departamento: cliente.departamento,
        limiteCredito: Number(cliente.limiteCredito || 0),
        saldoTotal: balance
      },
      movimientos: movimientosCalculados
    });
  } catch (error: any) {
    console.error('Error obteniendo movimientos para Excel Live:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, organizationId: true }
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const orgId = dbUser.organizationId;
    const body = await request.json();

    const {
      clienteId,
      fecha,
      tipo, // 'FACTURA', 'PAGO_EFECTIVO', 'TRANSFERENCIA', 'AJUSTE_FLOR'
      documento,
      detalles,
      debito,
      credito,
      banco,
      referencia
    } = body;

    if (!clienteId) {
      return NextResponse.json({ error: 'clienteId es obligatorio' }, { status: 400 });
    }

    const fechaMov = fecha ? new Date(fecha) : new Date();

    if (tipo === 'FACTURA' || (Number(debito) > 0 && !tipo)) {
      const monto = Number(debito);
      if (isNaN(monto) || monto <= 0) {
        return NextResponse.json({ error: 'El monto de la factura debe ser mayor a 0' }, { status: 400 });
      }

      let correlativo = documento ? String(documento).trim().toUpperCase() : '';
      if (!correlativo) {
        const count = await prisma.factura.count({ where: { organizationId: orgId } });
        correlativo = `FAC-${String(count + 1).padStart(5, '0')}`;
      }

      const fac = await prisma.factura.create({
        data: {
          organizationId: orgId,
          clienteId,
          correlativo,
          fechaEmision: fechaMov,
          fechaVencimiento: new Date(fechaMov.getTime() + 15 * 24 * 60 * 60 * 1000),
          subTotal: monto,
          total: monto,
          saldoPendiente: monto,
          estado: 'EMITIDA',
          estadoPago: 'PENDIENTE',
          metodoPago: 'CREDITO',
          notas: detalles || 'Venta a Crédito Comercial',
          creadoPorId: dbUser.id,
          detalles: {
            create: [
              {
                descripcion: detalles || 'Venta a Crédito Comercial',
                cantidad: 1,
                precioUnitario: monto,
                totalLinea: monto
              }
            ]
          }
        }
      });

      return NextResponse.json({ success: true, movimiento: fac, tipoCreado: 'FACTURA' });
    } else if (tipo === 'AJUSTE_FLOR') {
      const monto = Number(credito);
      if (isNaN(monto) || monto <= 0) {
        return NextResponse.json({ error: 'El monto del ajuste debe ser mayor a 0' }, { status: 400 });
      }

      const count = await prisma.notaCreditoCliente.count({ where: { organizationId: orgId } });
      const correlativo = documento || `NC-${String(count + 1).padStart(5, '0')}`;

      const nc = await prisma.notaCreditoCliente.create({
        data: {
          organizationId: orgId,
          clienteId,
          correlativo,
          monto,
          motivo: 'FLOR_DANADA',
          descripcion: detalles || 'Ajuste de merma por flor dañada',
          fecha: fechaMov,
          creadoPorId: dbUser.id
        }
      });

      return NextResponse.json({ success: true, movimiento: nc, tipoCreado: 'AJUSTE_FLOR' });
    } else {
      // Es un PAGO o ABONO
      const monto = Number(credito);
      if (isNaN(monto) || monto <= 0) {
        return NextResponse.json({ error: 'El monto del abono debe ser mayor a 0' }, { status: 400 });
      }

      const count = await prisma.pagoCliente.count({ where: { organizationId: orgId } });
      const correlativo = documento || `AB-${String(count + 1).padStart(5, '0')}`;
      const metodo = tipo === 'PAGO_EFECTIVO' ? 'EFECTIVO' : (tipo === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : 'EFECTIVO');

      const pago = await prisma.pagoCliente.create({
        data: {
          organizationId: orgId,
          clienteId,
          correlativo,
          monto,
          fecha: fechaMov,
          metodoPago: metodo,
          banco: banco || null,
          referencia: referencia || null,
          notas: detalles || null,
          creadoPorId: dbUser.id
        }
      });

      return NextResponse.json({ success: true, movimiento: pago, tipoCreado: 'PAGO' });
    }
  } catch (error: any) {
    console.error('Error creando movimiento en Excel Live:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tipo = searchParams.get('tipo'); // 'FACTURA', 'PAGO', 'AJUSTE_FLOR'

    if (!id || !tipo) {
      return NextResponse.json({ error: 'id y tipo son requeridos' }, { status: 400 });
    }

    if (tipo === 'FACTURA') {
      await prisma.factura.update({
        where: { id },
        data: { estado: 'ANULADA' }
      });
    } else if (tipo === 'PAGO' || tipo === 'PAGO_EFECTIVO' || tipo === 'TRANSFERENCIA') {
      await prisma.pagoCliente.update({
        where: { id },
        data: { anulado: true, anuladoAt: new Date() }
      });
    } else if (tipo === 'AJUSTE_FLOR' || tipo === 'NOTA_CREDITO') {
      await prisma.notaCreditoCliente.update({
        where: { id },
        data: { anulado: true, anuladoAt: new Date() }
      });
    }

    return NextResponse.json({ success: true, message: 'Movimiento anulado correctamente' });
  } catch (error: any) {
    console.error('Error anulando movimiento:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
