// src/app/(dashboard)/checkin/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { ChurchCheckInApp } from "@/components/checkin/ChurchCheckInApp";

export const metadata = {
    title: "Checkin Kids | Sistemas Elim",
    description: "Sistema de control de niños — Misión Cristiana Elim Honduras",
};

export default async function CheckinKidsPage() {
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

    // Solo pueden acceder: CHECKIN_KIDS, ORG_ADMIN, SUPER_ADMIN
    const allowedRoles = ["CHECKIN_KIDS", "ORG_ADMIN", "SUPER_ADMIN"];
    if (!allowedRoles.includes(dbUser.role)) {
        redirect("/unauthorized");
    }

    return <ChurchCheckInApp />;
}
