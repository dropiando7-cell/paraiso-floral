import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Se requiere el ID del trabajo a completar" },
                { status: 400 }
            );
        }

        // Actualizar estado a COMPLETADO
        await prisma.colaImpresion.update({
            where: {
                id,
            },
            data: {
                estado: "COMPLETADO",
            },
        });

        return NextResponse.json({ success: true, message: "Trabajo marcado como completado" });
    } catch (error) {
        console.error("[API_IMPRESION_COMPLETAR] Error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor al completar impresión" },
            { status: 500 }
        );
    }
}
