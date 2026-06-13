import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import AvancesClient from "./AvancesClient";

export const metadata = {
    title: "Avances del Desarrollo ERP | Bioelectrónica",
    description: "Métricas de progreso y usabilidad del ERP de Bioelectrónica para la gerencia general.",
};

export default async function AvancesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { organization: true }
    });

    if (!dbUser) {
        redirect("/unauthorized");
    }

    // Permitir a SUPER_ADMIN, ORG_ADMIN, GERENTE o EXECUTIVE_ASSISTANT acceder a esta página
    const allowedRoles = ["SUPER_ADMIN", "ORG_ADMIN", "GERENTE", "EXECUTIVE_ASSISTANT"];
    if (!allowedRoles.includes(dbUser.role)) {
        redirect("/");
    }

    return (
        <div className="w-full">
            <AvancesClient dbUser={dbUser} />
        </div>
    );
}
