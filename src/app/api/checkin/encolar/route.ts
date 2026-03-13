import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { organizationId: true, role: true },
    });

    if (!dbUser || !dbUser.organizationId) {
      return NextResponse.json({ error: 'Usuario sin organización asignada' }, { status: 401 });
    }

    const { ticketData, impresora = 'TSC TE200' } = await req.json();

    if (!ticketData) {
      return NextResponse.json({ error: 'Se requieren los datos de la etiqueta' }, { status: 400 });
    }

    const colaItem = await prisma.colaImpresionCheckin.create({
      data: {
        organizationId: dbUser.organizationId,
        datosEtiqueta: ticketData,
        estado: 'PENDIENTE',
        impresora: impresora
      }
    });

    return NextResponse.json({ success: true, colaId: colaItem.id });
  } catch (error: any) {
    console.error('Error al encolar impresión:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
