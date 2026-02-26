"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import twilio from "twilio";
import { revalidatePath } from "next/cache";

export async function getCheckinData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Unauthorized" };
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });

    if (!dbUser) {
        return { error: "Organization not found" };
    }

    const classrooms = await prisma.classroom.findMany({
        where: { organizationId: dbUser.organizationId },
        orderBy: { createdAt: "asc" }
    });

    const kids = await prisma.kid.findMany({
        where: { organizationId: dbUser.organizationId },
        orderBy: { name: "asc" }
    });

    // Get today's active checkins (checkedOut = false)
    const activeCheckins = await prisma.checkIn.findMany({
        where: {
            organizationId: dbUser.organizationId,
            checkedOut: false
        },
    });

    return { classrooms, kids, activeCheckins, organizationId: dbUser.organizationId };
}

export async function addKid(data: { name: string, age: number, classroomId: string, allergies: string, parentName: string, parentPhone: string, photoEmoji: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });
    if (!dbUser) return { error: "Organization not found" };

    // Format phone number to start with +, standard E164 handling
    let phone = data.parentPhone.trim();
    if (phone && !phone.startsWith('+')) {
        // Assume Honduras code +504 if none is specified, could extract to an org setting later
        phone = `+504${phone.replace(/\D/g, '')}`;
    }

    const newKid = await prisma.kid.create({
        data: {
            organizationId: dbUser.organizationId,
            name: data.name,
            age: data.age,
            classroomId: data.classroomId || null,
            allergies: data.allergies || "Ninguna",
            parentName: data.parentName,
            parentPhone: phone,
            photoEmoji: data.photoEmoji,
        }
    });

    revalidatePath("/checkin");
    return { success: true, kid: newKid };
}

export async function doCheckIn(kidId: string, securityCode: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });
    if (!dbUser) return { error: "Organization not found" };

    const kid = await prisma.kid.findUnique({
        where: { id: kidId, organizationId: dbUser.organizationId }
    });

    if (!kid) return { error: "Kid not found" };

    // Create CheckIn record
    const checkInRecord = await prisma.checkIn.create({
        data: {
            organizationId: dbUser.organizationId,
            kidId: kid.id,
            securityCode,
            checkedOut: false,
        }
    });

    // Send WhatsApp notification using Twilio
    let notifSent = false;
    let notifError = null;

    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., 'whatsapp:+14155238886'

        if (accountSid && authToken && twilioWhatsApp && kid.parentPhone) {
            const client = twilio(accountSid, authToken);

            // Format phone to WhatsApp compatible format
            const targetPhone = `whatsapp:${kid.parentPhone.replace(/\s/g, '')}`;

            // Prepare exactly like the Meta/Twilio sandbox requires
            await client.messages.create({
                from: twilioWhatsApp,
                to: targetPhone,
                body: `✅ Hola ${kid.parentName}, ${kid.name} ha sido registrado(a) en Kids Check-in.
Su código de seguridad es: *${securityCode}*.
Guarde este código para presentarlo a la hora de la salida.`
            });
            notifSent = true;
        } else {
            console.log("Twilio no configurado o teléfono faltante", { accountSid: !!accountSid, twilioWhatsApp: !!twilioWhatsApp, phone: kid.parentPhone });
        }
    } catch (e: any) {
        console.error("Twilio WhatsApp Error: ", e);
        notifError = e.message;
    }

    // Update CheckIn record with notification status
    await prisma.checkIn.update({
        where: { id: checkInRecord.id },
        data: {
            parentNotified: notifSent,
            notifProvider: notifSent ? "twilio_whatsapp" : null,
        }
    });

    revalidatePath("/checkin");
    return {
        success: true,
        checkIn: checkInRecord,
        notification: {
            sent: notifSent,
            error: notifError,
            provider: "twilio_whatsapp"
        }
    };
}

export async function doCheckOut(kidId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });
    if (!dbUser) return { error: "Organization not found" };

    // Find active checkin
    const activeCheckIn = await prisma.checkIn.findFirst({
        where: {
            kidId,
            organizationId: dbUser.organizationId,
            checkedOut: false
        }
    });

    if (activeCheckIn) {
        await prisma.checkIn.update({
            where: { id: activeCheckIn.id },
            data: {
                checkedOut: true,
                checkOutTime: new Date()
            }
        });
        revalidatePath("/checkin");
        return { success: true };
    }

    return { error: "Activo no encontrado" };
}

// =======================
// CLASSROOMS
// =======================
export async function addClassroom(data: { name: string, ageRange: string, teacher: string, capacity: number, color?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });
    if (!dbUser) return { error: "Organization not found" };

    const newClassroom = await prisma.classroom.create({
        data: {
            organizationId: dbUser.organizationId,
            name: data.name,
            ageRange: data.ageRange,
            teacher: data.teacher,
            capacity: data.capacity,
            color: data.color || "bg-brand-100 text-brand-700 border-brand-200"
        }
    });

    revalidatePath("/checkin");
    return { success: true, classroom: newClassroom };
}

export async function updateClassroom(id: string, data: { name: string, ageRange: string, teacher: string, capacity: number, color?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });
    if (!dbUser) return { error: "Organization not found" };

    const updated = await prisma.classroom.update({
        where: { id, organizationId: dbUser.organizationId },
        data: {
            name: data.name,
            ageRange: data.ageRange,
            teacher: data.teacher,
            capacity: data.capacity,
            color: data.color,
        }
    });

    revalidatePath("/checkin");
    return { success: true, classroom: updated };
}

