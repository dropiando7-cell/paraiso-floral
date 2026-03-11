import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Higher-Order function to protect Server Components (pages) based on DB Roles
 * @param requiredModulePath The base path of the module (e.g. '/conciliacion')
 * @param WrappedComponent The page component to render if allowed
 */
export function withRoleGuard(
    requiredModulePath: string,
    WrappedComponent: React.ComponentType<any>
) {
    return async function ProtectedPage(props: any) {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !user.email) {
            redirect("/login");
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email }
        });

        if (!dbUser) {
            redirect("/unauthorized");
        }

        // SUPER_ADMIN always has access to everything
        if (dbUser.role === 'SUPER_ADMIN') {
            return <WrappedComponent {...props} />;
        }

        // Check against dynamic role template modules or specific role hardcoded paths
        const allowedModules = dbUser.accessibleModules || [];

        // Exact match or sub-path match (parent allowing child, or child allowing parent layout to render)
        const hasAccess = allowedModules.some(m =>
            m === requiredModulePath ||
            (requiredModulePath.startsWith(m + '/') && m !== '/') ||
            (m.startsWith(requiredModulePath + '/') && requiredModulePath !== '/')
        );

        if (!hasAccess) {
            redirect("/unauthorized");
        }

        return <WrappedComponent {...props} />;
    };
}
