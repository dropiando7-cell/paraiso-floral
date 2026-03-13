import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { id, error } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "No ID proporcionado" }, { status: 400 });
        }

        await prisma.colaImpresionCheckin.update({
            where: { id },
            data: { estado: error ? "ERROR" : "COMPLETADO" }
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[API_CHECKIN_COMPLETAR] Error:", err);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
