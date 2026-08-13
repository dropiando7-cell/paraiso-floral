import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID de cliente no proporcionado' }, { status: 400 });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        rtn: true,
        telefono: true,
        email: true,
        direccion: true,
        nombreContacto: true,
        telefonoContacto: true,
        firmaDigitalUrl: true,
        firmaDigitalNombre: true,
        firmaDigitalFecha: true,
        organization: {
          select: {
            name: true,
            logoUrl: true
          }
        }
      }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, cliente });
  } catch (error: any) {
    console.error('Error fetching cliente for firma:', error);
    return NextResponse.json({ error: 'Error al consultar la información del cliente' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID de cliente no proporcionado' }, { status: 400 });
    }

    const body = await req.json();
    const { firmaDataUrl, firmaNombre } = body;

    if (!firmaDataUrl) {
      return NextResponse.json({ error: 'La firma digital es requerida' }, { status: 400 });
    }

    const clienteExistente = await prisma.cliente.findUnique({
      where: { id }
    });

    if (!clienteExistente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const clienteActualizado = await prisma.cliente.update({
      where: { id },
      data: {
        firmaDigitalUrl: firmaDataUrl,
        firmaDigitalNombre: firmaNombre || clienteExistente.nombreContacto || clienteExistente.nombre,
        firmaDigitalFecha: new Date()
      } as any
    });

    return NextResponse.json({
      success: true,
      message: 'Firma digital registrada exitosamente',
      cliente: {
        id: clienteActualizado.id,
        nombre: clienteActualizado.nombre,
        firmaDigitalUrl: clienteActualizado.firmaDigitalUrl,
        firmaDigitalNombre: clienteActualizado.firmaDigitalNombre,
        firmaDigitalFecha: (clienteActualizado as any).firmaDigitalFecha
      }
    });
  } catch (error: any) {
    console.error('Error saving cliente signature:', error);
    return NextResponse.json({ error: error.message || 'Error al guardar la firma digital' }, { status: 500 });
  }
}
