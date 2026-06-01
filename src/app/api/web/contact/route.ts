import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, phone, email, message } = body;

        if (!name || !phone || !email || !message) {
            return NextResponse.json({ success: false, error: 'Todos los campos son requeridos.' }, { status: 400 });
        }

        const newContact = await prisma.webContact.create({
            data: {
                nombre: name,
                telefono: phone,
                correo: email,
                mensaje: message,
                estado: 'PENDIENTE'
            }
        });

        return NextResponse.json({ success: true, contact: newContact });
    } catch (e: any) {
        console.error('Error saving contact request:', e);
        return NextResponse.json({ success: false, error: e.message || 'Error del servidor.' }, { status: 500 });
    }
}
