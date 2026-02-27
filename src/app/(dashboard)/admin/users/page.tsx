import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { UserManagement } from "./UserManagement";

export const metadata = {
    title: 'Gestión de Usuarios | Sistemas Elim',
};

export default async function AdminUsersPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { organization: true }
    });

    if (dbUser?.role !== 'SUPER_ADMIN') {
        redirect("/");
    }

    const allUsers = await prisma.user.findMany({
        include: { organization: true },
        orderBy: { createdAt: 'desc' }
    });

    const organizations = await prisma.organization.findMany({
        orderBy: { name: 'asc' }
    });

    const roleTemplates = await prisma.roleTemplate.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out flex flex-col gap-6">
            <UserManagement
                initialUsers={allUsers}
                organizations={organizations}
                roleTemplates={roleTemplates}
                currentUserId={dbUser.id}
            />
        </div>
    );
}
