import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendEventualityWhatsApp } from "@/lib/checkin-notifications";

export async function POST(req: NextRequest) {
    try {
        // — Autenticación
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { organizationId: true, role: true },
        });

        if (!dbUser || !["SUPER_ADMIN", "ORG_ADMIN", "CHECKIN_KIDS", "CHECKIN_KIDS_ADMIN"].includes(dbUser.role)) {
            return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
        }

        const body = await req.json();
        const { kidIds, context, message, type } = body;

        // Security Check: Only Admins can send 'mass' messages
        if (type === 'mass' && !["SUPER_ADMIN", "ORG_ADMIN", "CHECKIN_KIDS_ADMIN"].includes(dbUser.role)) {
            return NextResponse.json(
                { success: false, error: "No tienes permisos para enviar mensajes masivos." },
                { status: 403 }
            );
        }

        if (!kidIds || !Array.isArray(kidIds) || kidIds.length === 0 || !context || !message) {
            return NextResponse.json(
                { success: false, error: "Faltan campos requeridos o son inválidos" },
                { status: 400 }
            );
        }

        // Fetch kids data to get parent names and phones
        const kids = await prisma.kid.findMany({
            where: {
                id: { in: kidIds },
                organizationId: dbUser.organizationId
            },
            select: {
                id: true,
                parentName: true,
                parentPhone: true
            }
        });

        if (kids.length === 0) {
            return NextResponse.json({ success: false, error: "No se encontraron los niños especificados" }, { status: 404 });
        }

        // Deduplicate phones (in case of siblings, we only want to send 1 message to the parent)
        const uniqueParents = new Map<string, string>(); // phone -> parentName
        kids.forEach(kid => {
            if (kid.parentPhone) {
                uniqueParents.set(kid.parentPhone, kid.parentName);
            }
        });

        let sentCount = 0;
        let errors = [];

        // Send messages
        for (const [phone, parentName] of uniqueParents.entries()) {
            const result = await sendEventualityWhatsApp(phone, context, message);
            if (result.success) {
                sentCount++;
            } else {
                errors.push({ phone, error: result.error });
            }
        }

        return NextResponse.json({
            success: true,
            sentCount,
            totalAttempted: uniqueParents.size,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[CheckIn Message API] Error:", message);
        return NextResponse.json(
            { success: false, error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
