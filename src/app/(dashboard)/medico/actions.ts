"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getMedicalData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });
    if (!dbUser) return { error: "Organization not found" };

    const patients = await prisma.medicalPatient.findMany({
        where: { organizationId: dbUser.organizationId },
        include: {
            records: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        },
        orderBy: { updatedAt: "desc" }
    });

    // Map Prisma models to frontend expected shape
    const mappedPatients = patients.map(p => {
        // Calculate age from dateOfBirth
        const age = p.dateOfBirth ? Math.abs(new Date(Date.now() - p.dateOfBirth.getTime()).getUTCFullYear() - 1970) : 0;

        return {
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            age: age,
            bloodType: p.bloodType,
            allergies: p.allergies || p.chronicConditions,
            phone: p.phone,
            status: p.records?.length > 0 && new Date(p.records[0].createdAt).toDateString() === new Date().toDateString() ? "COMPLETED" : "PENDING",
            lastVisit: p.records?.length > 0 ? new Date(p.records[0].createdAt).toLocaleDateString("es-HN", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Nunca"
        };
    });

    return { patients: mappedPatients };
}

export async function addPatient(data: { firstName: string, lastName: string, age: number, bloodType?: string, allergies?: string, phone?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { organizationId: true },
    });
    if (!dbUser) return { error: "Organization not found" };

    // Approximation of date of birth based on age provided over form
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - data.age);

    const newPatient = await prisma.medicalPatient.create({
        data: {
            organizationId: dbUser.organizationId,
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: dob,
            gender: "Not Specified",
            bloodType: data.bloodType || null,
            allergies: data.allergies || "Ninguna",
            phone: data.phone || null,
        }
    });

    revalidatePath("/medico");
    return { success: true, patient: newPatient };
}

export async function addMedicalRecord(patientId: string, data: { reason: string, notes?: string, bloodPressure?: string, temperature?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true },
    });
    if (!dbUser) return { error: "Organization not found" };

    const record = await prisma.medicalRecord.create({
        data: {
            patientId,
            attendedById: dbUser.id,
            reasonForVisit: data.reason,
            notes: data.notes || null,
            vitals: {
                bloodPressure: data.bloodPressure || "",
                temperature: data.temperature || ""
            }
        }
    });

    // Update patient's updatedAt timestamp to bubble them up
    await prisma.medicalPatient.update({
        where: { id: patientId },
        data: { updatedAt: new Date() }
    });

    revalidatePath("/medico");
    return { success: true, record };
}
