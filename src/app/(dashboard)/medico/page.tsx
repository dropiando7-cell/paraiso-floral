import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { MedicalApp } from "@/components/medico/MedicalApp";

export const metadata = {
    title: "Asistencia Médica | Sistemas Elim",
    description: "Módulo de Asistencia Médica — Misión Cristiana Elim Honduras",
};

export default async function MedicoPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, organizationId: true },
    });

    if (!dbUser) {
        redirect("/unauthorized");
    }

    // Role verification specifically for Medical Module
    const allowedRoles = ["MEDICAL_STAFF", "ORG_ADMIN", "SUPER_ADMIN"];
    if (!allowedRoles.includes(dbUser.role)) {
        redirect("/unauthorized");
    }

    // Pass the user information to the frontend application if necessary
    const currentUser = {
        id: user.id,
        role: dbUser.role,
        organizationId: dbUser.organizationId
    };

    return <MedicalApp currentUser={currentUser} />;
}
