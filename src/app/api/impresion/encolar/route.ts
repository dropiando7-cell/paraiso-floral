import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { generarYRegistrarEtiquetasSeriales } from "@/lib/etiquetaSerialServer";

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
        let { activoId, urlImagen, impresora, tamano } = body;

        // Modo debug envía un ID dummy explícito
        const isDebug = activoId === "00000000-0000-0000-0000-000000000000";

        if (!urlImagen) {
            return NextResponse.json(
                { error: "Faltan datos obligatorios (urlImagen)" },
                { status: 400 }
            );
        }

        let finalUrlImagen = urlImagen;

        // Si es una etiqueta de producto/activo normal (generar-etiqueta y no debug), asignar serial único
        if (!isDebug && typeof urlImagen === "string" && urlImagen.includes("/api/impresion/generar-etiqueta?")) {
            try {
                const parsed = new URL(urlImagen, "https://paraiso-floral.vercel.app");
                const qIdQr = parsed.searchParams.get("idQr") || "";
                const qBarcode = parsed.searchParams.get("codigoBarras") || qIdQr;
                const qDesc = parsed.searchParams.get("descripcion") || "Producto";

                if (qBarcode && !/-\d{4,}$/.test(qBarcode)) {
                    const seriales = await generarYRegistrarEtiquetasSeriales({
                        organizationId: orgId,
                        codigoPadre: qBarcode.replace(/^PF-/i, ""),
                        descripcion: qDesc,
                        cantidad: 1,
                        activoFijoId: activoId || null,
                    });
                    if (seriales[0]) {
                        parsed.searchParams.set("codigoBarras", seriales[0]);
                        finalUrlImagen = urlImagen.startsWith("http")
                            ? parsed.toString()
                            : `${parsed.pathname}${parsed.search}`;
                    }
                }
            } catch {
                // Continuar con urlImagen original si no se pudo parsear
            }
        }

        // Crear la entrada en la cola de impresión
        const nuevoTrabajo = await prisma.colaImpresion.create({
            data: {
                organizationId: orgId,
                activoId: isDebug ? undefined : (activoId || undefined),
                urlImagen: finalUrlImagen,
                estado: "PENDIENTE",
                impresora: impresora || "Vorttek",
                tamano: tamano || "50x25",
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
