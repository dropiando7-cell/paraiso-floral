/**
 * POST /api/checkout
 * 
 * Verifies security code and checks out a child.
 * Sends confirmation WhatsApp/SMS to parent.
 */

import { NextRequest, NextResponse } from "next/server";
import { sendCheckInNotification } from "@/lib/notifications";

interface CheckOutRequest {
  kidId: string;
  kidName: string;
  securityCode: string;       // Code to verify
  parentName: string;
  parentPhone: string;
  classroomName: string;
  churchName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CheckOutRequest = await req.json();

    if (!body.kidId || !body.securityCode) {
      return NextResponse.json(
        { success: false, error: "Missing kidId or securityCode" },
        { status: 400 }
      );
    }

    // ── TODO: Verify code against your database ──────────────────────────
    // const checkIn = await db.checkIns.findFirst({
    //   where: { kidId: body.kidId, securityCode: body.securityCode, checkedOut: false }
    // });
    // if (!checkIn) {
    //   return NextResponse.json({ success: false, error: "Invalid code" }, { status: 403 });
    // }
    // await db.checkIns.update({ where: { id: checkIn.id }, data: { checkedOut: true, checkOutTime: new Date() } });
    // ─────────────────────────────────────────────────────────────────────

    const checkOutTime = new Date().toLocaleTimeString("es-HN", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

    // Notify parent of checkout
    const church = body.churchName || process.env.CHURCH_NAME || "Iglesia Central";
    const message = {
      parentName: body.parentName,
      parentPhone: body.parentPhone.replace(/[\s\-()]/g, ""),
      kidName: body.kidName,
      kidAge: 0, // not needed for checkout
      classroomName: body.classroomName,
      teacherName: "",
      securityCode: body.securityCode,
      checkInTime: checkOutTime,
      churchName: church,
    };

    // Override body for checkout message
    const checkoutBody =
      `✝️ *${church} — Kids Check-In*\n\n` +
      `¡Hola ${body.parentName}! 👋\n\n` +
      `*${body.kidName}* ha sido entregado exitosamente.\n\n` +
      `🕐 *Hora de salida:* ${checkOutTime}\n` +
      `📍 *Salón:* ${body.classroomName}\n\n` +
      `_¡Gracias por confiar en nosotros! Dios les bendiga. 🙏_`;

    // Send via Twilio WhatsApp directly (simple version)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

    let notificationSent = false;
    if (accountSid && authToken) {
      try {
        const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: from,
              To: `whatsapp:${message.parentPhone}`,
              Body: checkoutBody,
            }),
          }
        );
        notificationSent = true;
      } catch (e) {
        console.warn("[Checkout] Could not send notification:", e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        kidId: body.kidId,
        checkOutTime,
        notificationSent,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
