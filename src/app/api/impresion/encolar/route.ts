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
        let { activoId, urlImagen } = body;

        // Modo debug envía un ID dummy o vacío
        const isDebug = activoId === "00000000-0000-0000-0000-000000000000" || !activoId;

        if (isDebug) {
            // Para respetar la Foreign Key, buscamos CUALQUIER activo de esta org
            // Si no existe ninguno, creamos uno temporal o lanzamos error
            const unActivo = await prisma.activoFijo.findFirst({
                where: { organizationId: orgId },
                select: { id: true }
            });
            if (!unActivo) {
                return NextResponse.json(
                    { error: "Debes tener al menos 1 activo registrado para poder enviar colas de impresión tipo debug." },
                    { status: 400 }
                );
            }
            activoId = unActivo.id;
        }

        if (!activoId || !urlImagen) {
            return NextResponse.json(
                { error: "Faltan datos obligatorios (urlImagen)" },
                { status: 400 }
            );
        }

        // Crear la entrada en la cola de impresión
        const nuevoTrabajo = await prisma.colaImpresion.create({
            data: {
                organizationId: orgId,
                activoId,
                urlImagen,
                estado: "PENDIENTE",
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
