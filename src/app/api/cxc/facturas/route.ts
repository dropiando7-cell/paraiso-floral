import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

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
      correlativo,
      fechaEmision,
      monto,
      diasCredito = 15,
      descripcion = 'Venta a Crédito Comercial',
      items
    } = body;

    const montoNum = Number(monto);
    if (!clienteId || isNaN(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: 'Cliente y un monto mayor a 0 son obligatorios' }, { status: 400 });
    }

    // Verificar cliente
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, organizationId: orgId }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Determinar correlativo
    let nroFactura = correlativo ? String(correlativo).trim().toUpperCase() : '';
    if (!nroFactura) {
      const countFacturas = await prisma.factura.count({
        where: { organizationId: orgId }
      });
      nroFactura = `FAC-${String(countFacturas + 1).padStart(5, '0')}`;
    }

    // Verificar si ya existe el correlativo
    const existe = await prisma.factura.findFirst({
      where: { organizationId: orgId, correlativo: nroFactura }
    });

    if (existe) {
      nroFactura = `${nroFactura}-${Date.now().toString().slice(-4)}`;
    }

    const fechaDoc = fechaEmision ? new Date(fechaEmision) : new Date();
    const dias = Number(diasCredito) || cliente.diasCredito || 15;
    const fechaVenc = new Date(fechaDoc.getTime() + dias * 24 * 60 * 60 * 1000);

    // Crear la Factura con detalle
    const nuevaFactura = await prisma.factura.create({
      data: {
        organizationId: orgId,
        clienteId,
        correlativo: nroFactura,
        fechaEmision: fechaDoc,
        fechaVencimiento: fechaVenc,
        subTotal: montoNum,
        total: montoNum,
        saldoPendiente: montoNum,
        estado: 'EMITIDA',
        estadoPago: 'PENDIENTE',
        metodoPago: 'CREDITO',
        notas: descripcion,
        creadoPorId: dbUser.id,
        detalles: {
          create: Array.isArray(items) && items.length > 0 ? items.map((it: any) => ({
            descripcion: it.descripcion || descripcion,
            cantidad: Number(it.cantidad) || 1,
            precioUnitario: Number(it.precioUnitario) || (Number(it.totalLinea) || montoNum),
            totalLinea: Number(it.totalLinea) || (Number(it.precioUnitario) || montoNum)
          })) : [
            {
              descripcion: descripcion,
              cantidad: 1,
              precioUnitario: montoNum,
              totalLinea: montoNum
            }
          ]
        }
      },
      include: {
        detalles: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Factura ${nroFactura} registrada exitosamente`,
      factura: nuevaFactura
    });
  } catch (error: any) {
    console.error('Error registrando factura en CxC:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
