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
export async function sendTwilioWhatsApp(
    to: string,
    contentSid: string,
    contentVariables: Record<string, string>
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

    // Template SID de Meta ya aprobado con imagen variable: checkin_pase_recogidav8
    const sid = "HXbbd437cb6c585ea474a41418a64cf4cc";

    // URL dinámica que genera la imagen con QR y Barras
    const domain = process.env.NEXT_PUBLIC_APP_URL || "https://bioelectronicahn.vercel.app";
    const mediaUrl = `${domain}/api/checkin/pass?name=${encodeURIComponent(payload.kidName)}&room=${encodeURIComponent(payload.classroomName)}&code=${encodeURIComponent(payload.securityCode)}`;

    // La plantilla checkin_pase_recogidav8 usa {{1}} para texto y {{2}} para media
    const detalleUnificado = `${payload.kidName} · Salón: ${payload.classroomName} · Código: ${payload.securityCode}`;

    // === Verificación Previa (Pre-flight) ===
    // Forzamos a Vercel a generar (y cachear) la imagen dinámica ANTES de que Twilio la pida.
    // Twilio da timeout muy rápido (error 63019) si la imagen tarda en generarse.
    try {
        const preflight = await fetch(mediaUrl, { method: 'GET' });
        if (!preflight.ok) {
            // Si hubo un error o Vercel todavía la está procesando, esperamos 500ms e intentamos de nuevo.
            await new Promise((resolve) => setTimeout(resolve, 800));
            await fetch(mediaUrl, { method: 'GET' });
        }
    } catch (error) {
        console.warn('Error en pre-flight fetch de la imagen:', error);
        // Continuamos de igual forma para que Twilio lo reintente.
    }

    return sendTwilioWhatsApp(
        cleanPhone,
        sid,
        {
            "1": detalleUnificado,
            "2": mediaUrl
        }
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

/** 
 * Envía notificación de eventualidad o mensaje directo al padre/madre por WhatsApp 
 * Requiere una plantilla aprobada con 2 variables, ej:
 * "Bendiciones. De parte de {{1}} queremos notificarte lo siguiente: {{2}}. Quedamos atentos a tu llegada al salón asignado para asistirte. Saludos."
 */
export async function sendEventualityWhatsApp(
    parentPhone: string,
    context: string,
    message: string,
): Promise<NotificationResult> {
    const cleanPhone = parentPhone.replace(/[\s\-()]/g, "");

    // Template enviar_msg_padres1 SID
    const sid = process.env.TWILIO_EVENTUALITY_TEMPLATE_SID || "HXa363e371108b8cd13811d22b75ccbc74";

    return sendTwilioWhatsApp(cleanPhone, sid, {
        "1": context,
        "2": message
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SOPORTE Y REPARACIONES
// ─────────────────────────────────────────────────────────────────────────────

export async function sendSoporteRecepcion(
    clienteNombre: string,
    clienteTelefono: string,
    ordenCodigo: string,
    equipoDescripcion: string,
    numeroSerie: string,
    tecnicoAsignado: string
): Promise<NotificationResult> {
    if (!clienteTelefono) return { success: false, provider: "twilio_whatsapp", error: "Sin teléfono" };
    const cleanPhone = clienteTelefono.replace(/[\s\-()]/g, "");
    
    // SID: recepcion_del_equipo
    const sid = "HXbcb3979eddda4b77766b46c8ea51e849";
    const domain = process.env.NEXT_PUBLIC_APP_URL || "https://bioelectronicahn.vercel.app";
    const mediaUrl = `${domain}/api/soporte/pass?code=${encodeURIComponent(ordenCodigo)}&equipo=${encodeURIComponent(equipoDescripcion)}`;

    try {
        const preflight = await fetch(mediaUrl, { method: 'GET' });
        if (!preflight.ok) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            await fetch(mediaUrl, { method: 'GET' });
        }
    } catch (error) {
        console.warn('Error en pre-flight fetch de la imagen de soporte:', error);
    }

    const variables: Record<string, string> = {
        "1": mediaUrl,
        "2": clienteNombre,
        "3": ordenCodigo,
        "4": equipoDescripcion,
        "5": numeroSerie || "No especificado",
        "6": tecnicoAsignado || "Por asignar"
    };

    return sendTwilioWhatsApp(cleanPhone, sid, variables);
}

export async function sendSoporteDiagnostico(
    clienteNombre: string,
    clienteTelefono: string,
    equipoDescripcion: string,
    ordenCodigo: string,
    fechaEstimada: string
): Promise<NotificationResult> {
    if (!clienteTelefono) return { success: false, provider: "twilio_whatsapp", error: "Sin teléfono" };
    const cleanPhone = clienteTelefono.replace(/[\s\-()]/g, "");
    
    // SID: diagnostico_en_curso
    const sid = "HXba0f9917a004d43530fa18525b98be88";
    const variables: Record<string, string> = {
        "1": clienteNombre,
        "2": equipoDescripcion,
        "3": ordenCodigo,
        "4": fechaEstimada
    };

    return sendTwilioWhatsApp(cleanPhone, sid, variables);
}

export async function sendSoportePresupuesto(
    clienteNombre: string,
    clienteTelefono: string,
    equipoDescripcion: string,
    ordenCodigo: string,
    fallaEncontrada: string,
    costoTotal: number,
    facturaId: string
): Promise<NotificationResult> {
    if (!clienteTelefono) return { success: false, provider: "twilio_whatsapp", error: "Sin teléfono" };
    const cleanPhone = clienteTelefono.replace(/[\s\-()]/g, "");
    
    // SID: presupuesto_aprobacion
    const sid = "HXc0be41cec35b484f162077113a970e04";
    const variables: Record<string, string> = {
        "1": clienteNombre,
        "2": equipoDescripcion,
        "3": ordenCodigo,
        "4": fallaEncontrada,
        "5": costoTotal.toFixed(2),
        "6": facturaId
    };

    return sendTwilioWhatsApp(cleanPhone, sid, variables);
}

export async function sendSoporteReparacionIniciada(
    clienteNombre: string,
    clienteTelefono: string,
    equipoDescripcion: string,
    ordenCodigo: string,
    tecnicoAsignado: string,
    entregaEstimada: string,
    trabajoARealizar: string
): Promise<NotificationResult> {
    if (!clienteTelefono) return { success: false, provider: "twilio_whatsapp", error: "Sin teléfono" };
    const cleanPhone = clienteTelefono.replace(/[\s\-()]/g, "");
    
    // SID: reparacion_iniciada
    const sid = "HXaa7d2b1ae59dced812cb143e38246e0a";
    const variables: Record<string, string> = {
        "1": clienteNombre,
        "2": equipoDescripcion,
        "3": ordenCodigo,
        "4": tecnicoAsignado || "Equipo Técnico",
        "5": entregaEstimada,
        "6": trabajoARealizar
    };

    return sendTwilioWhatsApp(cleanPhone, sid, variables);
}

export async function sendSoporteEquipoListo(
    clienteNombre: string,
    clienteTelefono: string,
    equipoDescripcion: string,
    ordenCodigo: string,
    montoAPagar: number,
    diasHabiles: number = 5,
    cargoAlmacenaje: number = 50.00
): Promise<NotificationResult> {
    if (!clienteTelefono) return { success: false, provider: "twilio_whatsapp", error: "Sin teléfono" };
    const cleanPhone = clienteTelefono.replace(/[\s\-()]/g, "");
    
    // SID: equipo_listo_retiro
    const sid = "HXfdb98386354dbed017dd06788784e060";
    const domain = process.env.NEXT_PUBLIC_APP_URL || "https://bioelectronicahn.vercel.app";
    const mediaUrl = `${domain}/api/soporte/pass?code=${encodeURIComponent(ordenCodigo)}&equipo=${encodeURIComponent(equipoDescripcion)}`;

    try {
        const preflight = await fetch(mediaUrl, { method: 'GET' });
        if (!preflight.ok) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            await fetch(mediaUrl, { method: 'GET' });
        }
    } catch (error) {
        console.warn('Error en pre-flight fetch de la imagen de equipo listo:', error);
    }

    const variables: Record<string, string> = {
        "1": mediaUrl,
        "2": clienteNombre,
        "3": equipoDescripcion,
        "4": ordenCodigo,
        "5": montoAPagar.toFixed(2),
        "6": diasHabiles.toString(),
        "7": (diasHabiles + 1).toString(), // ej. A partir del día 6
        "8": cargoAlmacenaje.toFixed(2)
    };

    return sendTwilioWhatsApp(cleanPhone, sid, variables);
}

