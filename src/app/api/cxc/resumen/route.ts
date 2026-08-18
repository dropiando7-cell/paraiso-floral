import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { organizationId: true }
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const orgId = dbUser.organizationId;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Obtener todas las facturas vigentes no anuladas
    const facturas = await prisma.factura.findMany({
      where: {
        organizationId: orgId,
        estado: { notIn: ['ANULADA', 'CANCELADA', 'BORRADOR'] }
      },
      select: {
        id: true,
        clienteId: true,
        total: true,
        saldoPendiente: true,
        estadoPago: true,
        fechaEmision: true,
        fechaVencimiento: true
      }
    });

    // Abonos del mes actual
    const abonosMes = await prisma.pagoCliente.aggregate({
      where: {
        organizationId: orgId,
        anulado: false,
        fecha: { gte: firstDayOfMonth }
      },
      _sum: { monto: true }
    });

    let totalCartera = 0;
    let totalVencido = 0;
    let alDia = 0; // 0-7 días
    let porVencer = 0; // 8-15 días
    let vencido = 0; // 16-30 días
    let enRiesgo = 0; // >30 días

    const clientesMorososMap = new Set<string>();

    facturas.forEach(f => {
      const totalFactura = Number(f.total || 0);
      const saldo = f.saldoPendiente !== null ? Number(f.saldoPendiente) : totalFactura;

      if (f.estadoPago === 'PAGADA' || saldo <= 0) return;

      totalCartera += saldo;

      const diffTime = Math.abs(now.getTime() - new Date(f.fechaEmision).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        alDia += saldo;
      } else if (diffDays <= 15) {
        porVencer += saldo;
      } else if (diffDays <= 30) {
        vencido += saldo;
        totalVencido += saldo;
        clientesMorososMap.add(f.clienteId);
      } else {
        enRiesgo += saldo;
        totalVencido += saldo;
        clientesMorososMap.add(f.clienteId);
      }
    });

    return NextResponse.json({
      totalCartera,
      totalVencido,
      cobradoEsteMes: Number(abonosMes._sum.monto || 0),
      clientesMorososCount: clientesMorososMap.size,
      antiguedad: {
        alDia,
        porVencer,
        vencido,
        enRiesgo
      }
    });
  } catch (error: any) {
    console.error('Error en /api/cxc/resumen:', error);
    return NextResponse.json({ error: 'Error calculando resumen de CxC' }, { status: 500 });
  }
}
