import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// El script de Python consulta este endpoint (cada X segundos) sin autenticación pesada
// Podrías añadir un token estático en los headers si quieres más seguridad.
export async function GET() {
    try {
        // Buscar todos los trabajos pendientes de TODAS las organizaciones
        // Si tuvieran múltiples sedes con múltiples impresoras, habría que filtrar por organizationId
        const trabajosPendientes = await prisma.colaImpresion.findMany({
            where: {
                estado: "PENDIENTE",
            },
            orderBy: {
                createdAt: "asc", // Los más viejos primero (FIFO)
            },
            take: 10, // Limitar a 10 por lote para no saturar
        });

        // Mapear al formato que espera el script Python
        const trabajos = trabajosPendientes.map((job: { id: string; urlImagen: string }) => ({
            id: job.id,
            url_imagen: job.urlImagen,
        }));

        return NextResponse.json({ trabajos });
    } catch (error) {
        console.error("[API_IMPRESION_PENDIENTES] Error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
