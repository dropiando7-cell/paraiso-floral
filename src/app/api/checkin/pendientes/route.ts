import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const trabajosPendientes = await prisma.colaImpresionCheckin.findMany({
            where: {
                estado: "PENDIENTE",
            },
            orderBy: {
                createdAt: "asc", 
            },
            take: 5,
        });

        const trabajos = trabajosPendientes.map(job => ({
            id: job.id,
            datosObjeto: job.datosEtiqueta,
            impresora: job.impresora
        }));

        return NextResponse.json({ trabajos });
    } catch (error) {
        console.error("[API_CHECKIN_PENDIENTES] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
