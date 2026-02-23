/**
 * POST /api/checkin
 * 
 * Registers a child check-in, generates security code,
 * and sends WhatsApp/SMS notification to parent.
 * 
 * Compatible with: Next.js 14 App Router (Route Handlers)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sendCheckInNotification,
  type CheckInNotificationPayload,
  type NotificationProvider,
} from "@/lib/notifications";

// ── Types ──────────────────────────────────────────────────────────────────
interface CheckInRequest {
  kidId: string;
  kidName: string;
  kidAge: number;
  classroomId: string;
  classroomName: string;
  teacherName: string;
  parentName: string;
  parentPhone: string;       // E.164: +50499991111
  allergies?: string;
  churchName?: string;
  notificationProvider?: NotificationProvider; // optional override
}

// ── Security Code Generator ────────────────────────────────────────────────
function generateSecurityCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── Rate limit map (simple in-memory, replace with Redis in prod) ──────────
const recentCheckIns = new Map<string, number>();

// ── POST Handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: CheckInRequest = await req.json();

    // Basic validation
    if (!body.kidId || !body.parentPhone || !body.classroomId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: kidId, parentPhone, classroomId" },
        { status: 400 }
      );
    }

    // Validate phone format (E.164)
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    const cleanPhone = body.parentPhone.replace(/[\s\-()]/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { success: false, error: "Invalid phone format. Use E.164 (e.g. +50499991111)" },
        { status: 400 }
      );
    }

    // Prevent duplicate check-ins within 5 minutes
    const lastCheckIn = recentCheckIns.get(body.kidId);
    if (lastCheckIn && Date.now() - lastCheckIn < 5 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: "Child was recently checked in. Please wait 5 minutes." },
        { status: 429 }
      );
    }

    // Generate security code
    const securityCode = generateSecurityCode();
    const checkInTime = new Date().toLocaleTimeString("es-HN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const checkInDate = new Date().toISOString();

    // ── TODO: Save to your database here ──────────────────────────────────
    // await db.checkIns.create({
    //   data: {
    //     kidId: body.kidId,
    //     classroomId: body.classroomId,
    //     securityCode,
    //     checkInTime: new Date(),
    //     parentNotified: false,
    //   }
    // });
    // ─────────────────────────────────────────────────────────────────────

    // Build notification payload
    const notificationPayload: CheckInNotificationPayload = {
      parentName: body.parentName,
      parentPhone: cleanPhone,
      kidName: body.kidName,
      kidAge: body.kidAge,
      classroomName: body.classroomName,
      teacherName: body.teacherName,
      securityCode,
      checkInTime,
      allergies: body.allergies,
      churchName: body.churchName || process.env.CHURCH_NAME || "Iglesia Central",
    };

    // Determine provider (env var default, overridable per-request)
    const provider: NotificationProvider =
      body.notificationProvider ||
      (process.env.NOTIFICATION_PROVIDER as NotificationProvider) ||
      "twilio_whatsapp";

    // Send notification (non-blocking — don't fail check-in if SMS fails)
    const notificationResult = await sendCheckInNotification(notificationPayload, provider);

    if (!notificationResult.success) {
      console.error("[Church CheckIn] Notification failed:", notificationResult.error);
      // Still mark check-in as successful, just log notification failure
    }

    // Mark in rate-limit map
    recentCheckIns.set(body.kidId, Date.now());
    // Clean up old entries every 100 check-ins
    if (recentCheckIns.size > 100) {
      const cutoff = Date.now() - 10 * 60 * 1000;
      for (const [k, v] of recentCheckIns) {
        if (v < cutoff) recentCheckIns.delete(k);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        kidId: body.kidId,
        securityCode,
        checkInTime,
        checkInDate,
        qrValue: `IGLESIA:${body.kidId}:${securityCode}:${Date.now()}`,
        notification: {
          sent: notificationResult.success,
          provider: notificationResult.provider,
          messageId: notificationResult.messageId,
          error: notificationResult.error,
        },
      },
    });
  } catch (err: any) {
    console.error("[Church CheckIn] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── GET — Health check / active check-ins count ───────────────────────────
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Church Kids Check-In API",
    activeCheckIns: recentCheckIns.size,
    timestamp: new Date().toISOString(),
  });
}
