/**
 * POST /api/checkin
 * Registra el check-in de un niño, guarda en Prisma, y notifica al padre por WhatsApp.
 * GET  /api/checkin → health check
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendCheckInNotification } from "@/lib/checkin-notifications";
import { generateSecurityCode } from "@/lib/checkin-constants";

// Rate-limit simple en memoria (evitar check-ins duplicados en 5 min)
const recentCheckIns = new Map<string, number>();

export async function POST(req: NextRequest) {
    try {
        // — Autenticación
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // — Obtener el organizationId del usuario desde Prisma
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
        const {
            kidId,
            kidName,
            kidAge,
            classroomId,
            classroomName,
            teacherName,
            parentName,
            parentPhone,
            allergies,
        } = body;

        // — Validación básica
        if (!kidId || !parentPhone || !classroomId) {
            return NextResponse.json(
                { success: false, error: "Faltan campos requeridos: kidId, parentPhone, classroomId" },
                { status: 400 }
            );
        }

        // — Validar formato de teléfono E.164
        const cleanPhone = parentPhone.replace(/[\s\-()]/g, "");
        if (!/^\+[1-9]\d{6,14}$/.test(cleanPhone)) {
            return NextResponse.json(
                { success: false, error: "Formato de teléfono inválido. Use E.164 (ej. +50499991111)" },
                { status: 400 }
            );
        }

        // — Rate limit: evitar check-ins duplicados en 5 minutos
        const lastCheckIn = recentCheckIns.get(kidId);
        if (lastCheckIn && Date.now() - lastCheckIn < 5 * 60 * 1000) {
            return NextResponse.json(
                { success: false, error: "El niño ya fue registrado recientemente. Espere 5 minutos." },
                { status: 429 }
            );
        }

        const securityCode = generateSecurityCode();
        const now = new Date();
        const checkInTime = now.toLocaleTimeString("es-HN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
        const checkInDate = now.toISOString();

        // — Verificar si el niño ya existe en la BD o buscar por kidId
        // El kidId del frontend puede ser un id temporal (k + timestamp) para niños nuevos
        // o un UUID real de la BD para niños ya registrados.
        let dbKidId = kidId;

        // Si el ID es un UUID real, intentar encontrar al niño
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(kidId);

        if (!isUUID) {
            // ID temporal del frontend → buscar por nombre + padre o crear nuevo
            let kid = await prisma.kid.findFirst({
                where: {
                    organizationId: dbUser.organizationId,
                    name: kidName,
                    parentPhone: cleanPhone,
                },
            });

            if (!kid) {
                kid = await prisma.kid.create({
                    data: {
                        organizationId: dbUser.organizationId,
                        name: kidName,
                        age: kidAge,
                        classroomId,
                        classroomName,
                        allergies: allergies || "Ninguna",
                        parentName,
                        parentPhone: cleanPhone,
                        photoEmoji: kidAge <= 3 ? "👧" : kidAge <= 7 ? "🧒" : "👦",
                    },
                });
            }
            dbKidId = kid.id;
        }

        // — Guardar el check-in en la base de datos
        const checkInRecord = await prisma.checkIn.create({
            data: {
                organizationId: dbUser.organizationId,
                kidId: dbKidId,
                securityCode,
                checkInTime: now,
            },
        });

        // — Enviar notificación WhatsApp al padre
        const church =
            process.env.NEXT_PUBLIC_CHURCH_NAME || "Misión Cristiana Elim Honduras";

        const notificationResult = await sendCheckInNotification({
            parentName,
            parentPhone: cleanPhone,
            kidName,
            kidAge,
            classroomName,
            teacherName,
            securityCode,
            checkInTime,
            allergies: allergies || "Ninguna",
            churchName: church,
        });

        // — Actualizar flag de notificación en la BD
        if (notificationResult.success) {
            await prisma.checkIn.update({
                where: { id: checkInRecord.id },
                data: {
                    parentNotified: true,
                    notifProvider: notificationResult.provider,
                    notifMessageId: notificationResult.messageId,
                },
            });
        } else {
            console.error("[CheckIn] Notificación falló:", notificationResult.error);
        }

        // — Rate limit
        recentCheckIns.set(kidId, Date.now());
        if (recentCheckIns.size > 200) {
            const cutoff = Date.now() - 10 * 60 * 1000;
            for (const [k, v] of recentCheckIns) {
                if (v < cutoff) recentCheckIns.delete(k);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                kidId: dbKidId,
                securityCode,
                checkInTime,
                checkInDate,
                qrValue: `ELIM-CHECKIN:${dbKidId}:${securityCode}:${Date.now()}`,
                notification: {
                    sent: notificationResult.success,
                    provider: notificationResult.provider,
                    messageId: notificationResult.messageId,
                    error: notificationResult.error,
                },
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[CheckIn API] Error:", message);
        return NextResponse.json(
            { success: false, error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        status: "ok",
        service: "Elim Kids Check-In API",
        timestamp: new Date().toISOString(),
    });
}
