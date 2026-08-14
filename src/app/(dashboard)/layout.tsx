import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToasterProvider } from "./ToasterProvider";
import { RegisterOneSignal } from "@/components/layout/RegisterOneSignal";
import { VoiceAssistant } from "@/components/assistant/VoiceAssistant";
import { DynamicTabTitle } from "@/components/layout/DynamicTabTitle";


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
    const supabaseAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    
    // Sync to Prisma DB if out of sync
    const updateData: any = {};
    if (supabaseAvatar && dbUser.avatarUrl !== supabaseAvatar) {
        updateData.avatarUrl = supabaseAvatar;
    }
    
    // If name is not populated in DB, try to extract it from Supabase metadata
    if (!dbUser.nombre && !dbUser.apellido) {
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
        if (fullName) {
            const parts = fullName.trim().split(/\s+/);
            updateData.nombre = parts[0] || null;
            updateData.apellido = parts.slice(1).join(" ") || null;
        }
    }
    
    if (Object.keys(updateData).length > 0) {
        try {
            await prisma.user.update({
                where: { id: dbUser.id },
                data: updateData
            });
            Object.assign(dbUser, updateData);
        } catch (syncErr) {
            console.error("Error syncing user data to Prisma in layout.tsx:", syncErr);
        }
    }

    const combinedUser = {
        ...dbUser,
        fullName: `${dbUser.nombre || ""} ${dbUser.apellido || ""}`.trim() || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0],
        avatarUrl: dbUser.avatarUrl || supabaseAvatar,
        authProvider: user.app_metadata?.providers?.[0] || "email",
    };

    const showVoiceAssistant = ((combinedUser as any).enableVoiceAi ?? true) && (combinedUser.role === 'SUPER_ADMIN' || (combinedUser.accessibleModules || []).includes('asistente_voz'));

    return (
        <DashboardLayout dbUser={combinedUser}>
            <DynamicTabTitle orgName={dbUser.organization?.name} />
            <ToasterProvider />
            <RegisterOneSignal dbUser={combinedUser} />
            {showVoiceAssistant && <VoiceAssistant />}
            {children}
        </DashboardLayout>
    );
}
