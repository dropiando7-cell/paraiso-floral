import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { cardId, nombre, empresa, telefono, email, notas } = body;

        if (!cardId) {
            return NextResponse.json({ error: 'cardId is required' }, { status: 400 });
        }

        if (!nombre || nombre.trim() === '') {
            return NextResponse.json({ error: 'nombre is required' }, { status: 400 });
        }

        // Verify card exists
        const cardExists = await prisma.digitalCard.findUnique({
            where: { id: cardId }
        });

        if (!cardExists) {
            return NextResponse.json({ error: 'Digital card not found' }, { status: 404 });
        }

        const newLead = await prisma.cardLead.create({
            data: {
                cardId,
                nombre: nombre.trim(),
                empresa: empresa?.trim() || null,
                telefono: telefono?.trim() || null,
                email: email?.trim() || null,
                notas: notas?.trim() || null,
            }
        });

        return NextResponse.json({ success: true, lead: newLead });
    } catch (error) {
        console.error('Error creating card lead:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
