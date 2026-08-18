import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export default async function CxCLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, accessibleModules: true }
    });

    if (!dbUser) redirect('/unauthorized');

    const allowed = dbUser.role === 'SUPER_ADMIN' || 
                    dbUser.role === 'ORG_ADMIN' || 
                    (dbUser.accessibleModules || []).includes('/cxc');

    if (!allowed) {
        redirect('/unauthorized');
    }

    return <>{children}</>;
}
