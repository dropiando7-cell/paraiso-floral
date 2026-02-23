/**
 * POST /api/checkout
 * Verifica el código de seguridad, registra el check-out en Prisma,
 * y envía confirmación por WhatsApp al padre.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendCheckOutNotification } from "@/lib/checkin-notifications";

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

        if (!dbUser) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 403 });
        }

        const allowedRoles = ["SUPER_ADMIN", "ORG_ADMIN", "CHECKIN_KIDS"];
        if (!allowedRoles.includes(dbUser.role)) {
            return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
        }

        const body = await req.json();
        const { kidId, kidName, securityCode, parentName, parentPhone, classroomName, churchName } = body;

        if (!kidId || !securityCode) {
            return NextResponse.json(
                { success: false, error: "Faltan kidId o securityCode" },
                { status: 400 }
            );
        }

        // — Verificar el código de seguridad contra la base de datos
        const checkInRecord = await prisma.checkIn.findFirst({
            where: {
                kidId,
                securityCode,
                checkedOut: false,
                organizationId: dbUser.organizationId,
            },
        });

        if (!checkInRecord) {
            return NextResponse.json(
                { success: false, error: "Código inválido o el niño ya fue entregado" },
                { status: 403 }
            );
        }

        const now = new Date();
        const checkOutTime = now.toLocaleTimeString("es-HN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        // — Marcar como entregado en la BD
        await prisma.checkIn.update({
            where: { id: checkInRecord.id },
            data: { checkedOut: true, checkOutTime: now },
        });

        // — Notificar al padre por WhatsApp
        const church = churchName || process.env.NEXT_PUBLIC_CHURCH_NAME || "Misión Cristiana Elim Honduras";
        const cleanPhone = (parentPhone || "").replace(/[\s\-()]/g, "");

        let notificationSent = false;
        if (cleanPhone) {
            const result = await sendCheckOutNotification(
                parentName,
                cleanPhone,
                kidName,
                classroomName,
                checkOutTime,
                church
            );
            notificationSent = result.success;
            if (!result.success) {
                console.warn("[CheckOut] Notificación falló:", result.error);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                kidId,
                checkOutTime,
                notificationSent,
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[CheckOut API] Error:", message);
        return NextResponse.json(
            { success: false, error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
