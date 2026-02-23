/**
 * ─────────────────────────────────────────────────────────────────
 *  CHURCH KIDS CHECK-IN — Notification Service
 *  Supports: Twilio SMS, Twilio WhatsApp, Meta WhatsApp Cloud API
 * ─────────────────────────────────────────────────────────────────
 */

export interface CheckInNotificationPayload {
  parentName: string;
  parentPhone: string; // E.164 format: +50499991111
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
  provider: "twilio_sms" | "twilio_whatsapp" | "meta_whatsapp";
  messageId?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────
// MESSAGE TEMPLATE
// ─────────────────────────────────────────────────────────────────
function buildMessage(payload: CheckInNotificationPayload): string {
  const church = payload.churchName || "Iglesia Central";
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
    `🔐 *Código de recogida:* \`${payload.securityCode}\`\n` +
    allergyNote +
    `\n\n_Presente este código al retirar a su hijo/a._\n` +
    `_Que Dios bendiga su servicio hoy. 🙏_`
  );
}

// ─────────────────────────────────────────────────────────────────
// OPTION 1 — TWILIO SMS
// ─────────────────────────────────────────────────────────────────
// Cost: ~$0.0079/msg (USA) | $0.02–0.05/msg (Honduras)
// Pros: Delivery guaranteed, no WhatsApp needed, simple setup
// Cons: Plain text, slightly higher cost in LATAM
// Setup: https://console.twilio.com → Get a phone number
// Env vars needed:
//   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   TWILIO_FROM_NUMBER=+15551234567  (your Twilio number)
// ─────────────────────────────────────────────────────────────────
export async function sendTwilioSMS(
  payload: CheckInNotificationPayload
): Promise<NotificationResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;

  // Plain text version for SMS (no markdown)
  const body =
    `✝ ${payload.churchName || "Iglesia Central"} - Kids Check-In\n\n` +
    `Hola ${payload.parentName}! ✅\n` +
    `${payload.kidName} (${payload.kidAge} años) fue registrado.\n` +
    `Salon: ${payload.classroomName}\n` +
    `Maestra/o: ${payload.teacherName}\n` +
    `Hora: ${payload.checkInTime}\n` +
    `Codigo de recogida: ${payload.securityCode}\n` +
    (payload.allergies && payload.allergies !== "Ninguna"
      ? `ALERTA: Alergia a ${payload.allergies}\n`
      : "") +
    `Que Dios bendiga su dia. Bendiciones!`;

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: from,
          To: payload.parentPhone,
          Body: body,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        provider: "twilio_sms",
        error: data.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      provider: "twilio_sms",
      messageId: data.sid,
    };
  } catch (err: any) {
    return { success: false, provider: "twilio_sms", error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────
// OPTION 2 — TWILIO WHATSAPP (Sandbox / Approved Number)
// ─────────────────────────────────────────────────────────────────
// Cost: ~$0.005/msg outbound (conversación de 24h) + Twilio fee
// Pros: WhatsApp nativo, rich text, familiar para padres en LATAM
// Cons: Sandbox requiere opt-in manual; producción requiere aprobación
// Setup: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
// Env vars needed:
//   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  (sandbox) or approved number
// ─────────────────────────────────────────────────────────────────
export async function sendTwilioWhatsApp(
  payload: CheckInNotificationPayload
): Promise<NotificationResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

  const body = buildMessage(payload);

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: from,
          To: `whatsapp:${payload.parentPhone}`,
          Body: body,
        }),
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
  } catch (err: any) {
    return { success: false, provider: "twilio_whatsapp", error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────
// OPTION 3 — META WHATSAPP CLOUD API (Business API oficial)
// ─────────────────────────────────────────────────────────────────
// Cost: GRATIS las primeras 1,000 conversaciones/mes de servicio
//       (check-in counts as "utility" template — ~$0.004/msg después)
// Pros: Oficial de Meta, sin intermediarios, libre de costo inicial,
//       permite templates ricos con botones, imágenes, etc.
// Cons: Requiere aprobación de Meta Business, template pre-aprobado
// Setup: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
// Env vars needed:
//   META_WA_TOKEN=EAAxxxxxxx  (access token permanente)
//   META_WA_PHONE_NUMBER_ID=1234567890  (ID del número en Meta Business)
//   META_WA_TEMPLATE_NAME=kids_checkin_notification  (template aprobado)
//   META_WA_TEMPLATE_LANG=es_MX
// ─────────────────────────────────────────────────────────────────
export async function sendMetaWhatsApp(
  payload: CheckInNotificationPayload
): Promise<NotificationResult> {
  const token = process.env.META_WA_TOKEN!;
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID!;
  const templateName = process.env.META_WA_TEMPLATE_NAME || "kids_checkin_notification";
  const templateLang = process.env.META_WA_TEMPLATE_LANG || "es_MX";

  // Remove formatting chars from phone (Meta needs E.164 without +)
  const toPhone = payload.parentPhone.replace(/[^\d]/g, "");

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: toPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: templateLang },
            components: [
              {
                // Header component (if template has one)
                type: "header",
                parameters: [
                  {
                    type: "text",
                    text: payload.churchName || "Iglesia Central",
                  },
                ],
              },
              {
                // Body with dynamic variables
                // Template body must be pre-approved in Meta Business Manager
                // Example template body:
                // "Hola {{1}}! ✅ *{{2}}* fue registrado en {{3}} (Salón: {{4}}).
                //  Tu código de recogida es: *{{5}}*. Hora: {{6}}. 🙏"
                type: "body",
                parameters: [
                  { type: "text", text: payload.parentName },       // {{1}}
                  { type: "text", text: payload.kidName },           // {{2}}
                  { type: "text", text: payload.classroomName },     // {{3}}
                  { type: "text", text: payload.teacherName },       // {{4}}
                  { type: "text", text: payload.securityCode },      // {{5}}
                  { type: "text", text: payload.checkInTime },       // {{6}}
                ],
              },
            ],
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      return {
        success: false,
        provider: "meta_whatsapp",
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      provider: "meta_whatsapp",
      messageId: data.messages?.[0]?.id,
    };
  } catch (err: any) {
    return { success: false, provider: "meta_whatsapp", error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────
// SMART DISPATCHER — Tries preferred, falls back automatically
// ─────────────────────────────────────────────────────────────────
export type NotificationProvider = "twilio_sms" | "twilio_whatsapp" | "meta_whatsapp";

export async function sendCheckInNotification(
  payload: CheckInNotificationPayload,
  provider: NotificationProvider = "twilio_whatsapp"
): Promise<NotificationResult> {
  switch (provider) {
    case "twilio_sms":
      return sendTwilioSMS(payload);
    case "twilio_whatsapp":
      // Fallback to SMS if WhatsApp fails
      const waResult = await sendTwilioWhatsApp(payload);
      if (!waResult.success) {
        console.warn("[Church CheckIn] WhatsApp failed, falling back to SMS:", waResult.error);
        return sendTwilioSMS(payload);
      }
      return waResult;
    case "meta_whatsapp":
      return sendMetaWhatsApp(payload);
    default:
      return { success: false, provider: "twilio_sms", error: "Unknown provider" };
  }
}
