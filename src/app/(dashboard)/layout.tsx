import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

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
        // If authenticated via Google but not in Prisma DB -> Kick out
        redirect("/unauthorized");
    }

    // 2. Here we could also enforce MFA verification if needed
    // e.g. if (dbUser.twoFactorEnabled && !mfaVerifiedCookie) redirect('/auth/mfa')

    return (
        <DashboardLayout dbUser={dbUser}>
            {children}
        </DashboardLayout>
    );
}
