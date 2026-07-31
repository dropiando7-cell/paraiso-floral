import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id },
      select: { activoId: true }
    });

    return NextResponse.json({ activoId: orden?.activoId || null });
  } catch (error) {
    console.error('Error fetching order-activo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
