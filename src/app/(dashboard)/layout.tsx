import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToasterProvider } from "./ToasterProvider";

export default async function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // Middleware already protects this, but we double-check for safety
    if (error || !user) {
        redirect("/login");
    }

    // 1. Prisma Security Wall (Allow-List)
    // Check if the user's email exists in our database
    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { organization: true }
    });

    if (!dbUser) {
        console.log('layout.tsx: dbUser not found in Prisma. Redirecting to unauthorized. Supabase user.email:', user.email);
        // If authenticated via Google but not in Prisma DB -> Kick out
        redirect("/unauthorized");
    }

    // Combine Prisma DB user with Supabase Auth Metadata (from Google)
    const combinedUser = {
        ...dbUser,
        fullName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        authProvider: user.app_metadata?.providers?.[0] || 'email',
    };

    return (
        <DashboardLayout dbUser={combinedUser}>
            <ToasterProvider />
            {children}
        </DashboardLayout>
    );
}
