/**
 * src/lib/checkin-notifications.ts
 * Servicio de notificaciones para el módulo Kids Check-In
 * Solo Twilio WhatsApp (SMS desactivado por decisión del equipo)
 */

export interface CheckInNotificationPayload {
    parentName: string;
    parentPhone: string; // E.164: +50499991111
    kidName: string;
    kidAge: number;
    classroomName: string;
    teacherName: string;
    securityCode: string;
    checkInTime: string;
    allergies?: string;
    churchName?: string;
}

export interface NotificationResult {
    success: boolean;
    provider: "twilio_whatsapp";
    messageId?: string;
    error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plantilla de mensaje de CHECK-IN
// ─────────────────────────────────────────────────────────────────────────────
function buildCheckInMessage(payload: CheckInNotificationPayload): string {
    const church = payload.churchName || "Misión Cristiana Elim Honduras";
    const allergyNote =
        payload.allergies && payload.allergies !== "Ninguna"
            ? `\n⚠️ *Nota médica:* ${payload.allergies}`
            : "";

    return (
        `✝️ *${church} — Kids Check-In*\n\n` +
        `¡Hola ${payload.parentName}! ✅\n\n` +
        `*${payload.kidName}* (${payload.kidAge} años) ha sido registrado exitosamente.\n\n` +
        `📍 *Salón:* ${payload.classroomName}\n` +
        `👩‍🏫 *Maestra/o:* ${payload.teacherName}\n` +
        `🕐 *Hora de entrada:* ${payload.checkInTime}\n` +
        `🔐 *Código de recogida:* \`${payload.securityCode}\`` +
        allergyNote +
        `\n\n_Presente este código al retirar a su hijo/a._\n` +
        `_Que Dios bendiga su servicio hoy. 🙏_`
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Plantilla de mensaje de CHECK-OUT
// ─────────────────────────────────────────────────────────────────────────────
function buildCheckOutMessage(
    parentName: string,
    kidName: string,
    classroomName: string,
    checkOutTime: string,
    churchName: string
): string {
    return (
        `✝️ *${churchName} — Kids Check-In*\n\n` +
        `¡Hola ${parentName}! 👋\n\n` +
        `*${kidName}* ha sido entregado exitosamente.\n\n` +
        `🕐 *Hora de salida:* ${checkOutTime}\n` +
        `📍 *Salón:* ${classroomName}\n\n` +
        `_¡Gracias por confiar en nosotros! Dios les bendiga. 🙏_`
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Twilio WhatsApp — Envío de notificación
// Env vars requeridas:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_FROM  (número sandbox: whatsapp:+14155238886)
// ─────────────────────────────────────────────────────────────────────────────
async function sendTwilioWhatsApp(
    to: string,
    contentSid: string,
    contentVariables: Record<string, string>,
    mediaUrl?: string
): Promise<NotificationResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

    if (!accountSid || !authToken) {
        return {
            success: false,
            provider: "twilio_whatsapp",
            error: "Missing Twilio credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)",
        };
    }

    try {
        const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

        // When using Twilio Content API (Templates), we must pass ContentSid and ContentVariables
        const bodyParams = new URLSearchParams();
        bodyParams.append("From", from);
        bodyParams.append("To", `whatsapp:${to}`);
        bodyParams.append("ContentSid", contentSid);
        bodyParams.append("ContentVariables", JSON.stringify(contentVariables));

        if (mediaUrl) {
            bodyParams.append("MediaUrl", mediaUrl);
        }

        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
                method: "POST",
                headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: bodyParams,
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                provider: "twilio_whatsapp",
                error: data.message || `HTTP ${response.status}`,
            };
        }

        return {
            success: true,
            provider: "twilio_whatsapp",
            messageId: data.sid,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return { success: false, provider: "twilio_whatsapp", error: message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exportaciones públicas
// ─────────────────────────────────────────────────────────────────────────────

/** Envía notificación de check-in al padre/madre por WhatsApp */
export async function sendCheckInNotification(
    payload: CheckInNotificationPayload
): Promise<NotificationResult> {
    const cleanPhone = payload.parentPhone.replace(/[\s\-()]/g, "");

    // Template SID de Meta ya aprobado con imagen variable: checkin_pase_recogidav7
    const sid = "HXb5454650e9b4c3ae537b72b8cc121cb8";

    // URL dinámica que genera la imagen con QR y Barras
    const domain = process.env.NEXT_PUBLIC_APP_URL || "https://sistemaselim.app";
    const mediaUrl = `${domain}/api/checkin/pass?name=${encodeURIComponent(payload.kidName)}&room=${encodeURIComponent(payload.classroomName)}&code=${encodeURIComponent(payload.securityCode)}`;

    // La plantilla checkin_pase_recogidav7 usa {{1}} para texto
    const detalleUnificado = `Niño: ${payload.kidName} · Salón: ${payload.classroomName} · Código: ${payload.securityCode}`;

    return sendTwilioWhatsApp(
        cleanPhone,
        sid,
        { "1": detalleUnificado },
        mediaUrl
    );
}

/** Envía notificación de check-out al padre/madre por WhatsApp */
export async function sendCheckOutNotification(
    parentName: string,
    parentPhone: string,
    kidName: string,
    classroomName: string,
    checkOutTime: string,
    churchName: string
): Promise<NotificationResult> {
    const cleanPhone = parentPhone.replace(/[\s\-()]/g, "");

    // Check-out Template SID: HX793f54fea92578ecd912245a4bc80aac
    // Variable {{1}}: nombre del nino

    return sendTwilioWhatsApp(cleanPhone, "HX793f54fea92578ecd912245a4bc80aac", {
        "1": kidName
    });
}
