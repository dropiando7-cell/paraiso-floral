"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import twilio from "twilio";
import { revalidatePath } from "next/cache";
import { sendCheckInNotification, sendCheckOutNotification } from "@/lib/checkin-notifications";

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
        orderBy: { createdAt: "desc" }
    });

    // Get today's active checkins (checkedOut = false)
    const activeCheckins = await prisma.checkIn.findMany({
        where: {
            organizationId: dbUser.organizationId,
            checkedOut: false
        },
        include: { kid: true }
    });

    return { classrooms, kids, activeCheckins, organizationId: dbUser.organizationId };
}

export async function addKid(data: { name: string, age: number, gender: string, classroomId: string, allergies: string, parentName: string, parentPhone: string, photoEmoji: string }) {
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
            gender: data.gender || "No Especificado",
            classroomId: data.classroomId && data.classroomId !== "" ? data.classroomId : null,
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
        where: { id: kidId, organizationId: dbUser.organizationId },
        include: { classroom: true }
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
        const checkInTimeStr = new Date().toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });
        const result = await sendCheckInNotification({
            parentName: kid.parentName,
            parentPhone: kid.parentPhone,
            kidName: kid.name,
            kidAge: kid.age,
            classroomName: kid.classroom?.name || "Elim",
            teacherName: "Maestro(a)",
            securityCode: securityCode,
            checkInTime: checkInTimeStr,
            allergies: kid.allergies || "Ninguna"
        });

        if (result.success) {
            notifSent = true;
        } else {
            console.error("Twilio WhatsApp Error: ", result.error);
            notifError = result.error;
        }
    } catch (e: any) {
        console.error("Twilio WhatsApp Exception: ", e);
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
        },
        include: { kid: true }
    });

    if (activeCheckIn) {
        await prisma.checkIn.update({
            where: { id: activeCheckIn.id },
            data: {
                checkedOut: true,
                checkOutTime: new Date()
            }
        });

        // Send checkout notification
        if (activeCheckIn.kid.parentPhone) {
            const checkOutTimeStr = new Date().toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });
            await sendCheckOutNotification(
                activeCheckIn.kid.parentName,
                activeCheckIn.kid.parentPhone,
                activeCheckIn.kid.name,
                "Elim", // Placeholder classroom
                checkOutTimeStr,
                "Misión Cristiana Elim"
            );
        }

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
}

// =======================
// MOCK DATA GENERATION
// =======================
export async function generateMockKids(count: number = 50) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });
    if (!dbUser) return { error: "Organization not found" };

    const classrooms = await prisma.classroom.findMany({
        where: { organizationId: dbUser.organizationId }
    });

    // Fallback if no classrooms exist
    if (classrooms.length === 0) return { error: "Debe crear al menos 1 salón antes." };

    const names = ["Mateo", "Sofía", "Santiago", "Valentina", "Sebastián", "Isabella", "Matías", "Camila", "Leonardo", "Valeria", "Diego", "Emma", "Daniel", "Luciana", "Joaquín", "Victoria", "Samuel", "Martina", "Lucas", "Elena"];
    const lastNames = ["García", "Rodríguez", "Martínez", "Hernández", "López", "González", "Pérez", "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Díaz", "Gómez", "Cruz", "Morales", "Ortiz", "Gutiérrez", "Chávez", "Ramos"];

    let createdCount = 0;

    for (let i = 0; i < count; i++) {
        const name = `${names[Math.floor(Math.random() * names.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const parentName = `${names[Math.floor(Math.random() * names.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const age = Math.floor(Math.random() * 12) + 1;
        const phone = `+5049999${Math.floor(1000 + Math.random() * 9000)}`;
        const photo = age <= 3 ? "👧" : age <= 7 ? "🧒" : "👦";

        // Random classroom
        const cls = classrooms[Math.floor(Math.random() * classrooms.length)];

        const newKid = await prisma.kid.create({
            data: {
                organizationId: dbUser.organizationId,
                name,
                age,
                gender: photo === "👦" ? "Masculino" : photo === "👧" ? "Femenino" : "No Especificado",
                classroomId: cls.id,
                allergies: Math.random() > 0.8 ? "Maní" : "Ninguna",
                parentName,
                parentPhone: phone,
                photoEmoji: photo
            }
        });

        // 80% chance to also check them in right away
        if (Math.random() > 0.2) {
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            let code = "";
            for (let j = 0; j < 6; j++) code += chars[Math.floor(Math.random() * chars.length)];

            await prisma.checkIn.create({
                data: {
                    organizationId: dbUser.organizationId,
                    kidId: newKid.id,
                    securityCode: code,
                    checkedOut: false
                }
            });
        }

        createdCount++;
    }

    revalidatePath("/checkin");
    return { success: true, message: `${createdCount} niños generados.` };
}

