import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Obtener el organizationId del usuario
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { organizationId: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 403 });
        }

        const orgId = dbUser.organizationId;
        const body = await req.json();
        let { docId } = body;

        if (!docId) {
            return NextResponse.json(
                { error: "Faltan datos obligatorios (docId)" },
                { status: 400 }
            );
        }

        // Fetch full document with items and client
        const doc = await prisma.factura.findUnique({
            where: { id: docId, organizationId: orgId },
            include: {
                detalles: true,
                cliente: true,
                organization: true
            }
        });

        if (!doc) {
            return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
        }

        const invoiceData = {
            documento: { ...doc, cai: doc.numeroCAI },
            organization: doc.organization,
            items: doc.detalles,
            cliente: doc.cliente
        };

        // Crear la entrada en la cola de impresión
        const nuevoTrabajo = await prisma.colaImpresion.create({
            data: {
                organizationId: orgId,
                urlImagen: JSON.stringify(invoiceData),
                estado: "PENDIENTE",
                impresora: "Tickets",
                tamano: "80mm",
            },
        });

        return NextResponse.json({
            success: true,
            message: "Añadido a la cola de impresión",
            trabajoId: nuevoTrabajo.id,
        });

    } catch (error) {
        console.error("[API_IMPRESION_ENCOLAR] Error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor al encolar impresión" },
            { status: 500 }
        );
    }
}
