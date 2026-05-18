import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const renta = await prisma.rentaEquipo.findUnique({
            where: { id },
            select: { estado: true, firmaUrl: true }
        });

        if (!renta) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json(renta);
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
