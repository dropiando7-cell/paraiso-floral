// src/app/(dashboard)/checkin/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { ChurchCheckInApp } from "@/components/checkin/ChurchCheckInApp";
import { getCheckinData } from "./actions";

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

    // Fetch initial data on the server
    const initialData = await getCheckinData();
    // Inject userRole into initialData
    const dataWithRole = { ...initialData, userRole: dbUser.role };

    return <ChurchCheckInApp initialData={dataWithRole} />;
}
