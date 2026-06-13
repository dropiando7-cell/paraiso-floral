import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { 
    getDigitalCards, 
    getCardLeads, 
    getOrganizationUsers 
} from './actions';
import TarjetasClient from './TarjetasClient';

export const dynamic = 'force-dynamic';

export default async function TarjetasAdminPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, accessibleModules: true }
    });

    if (!dbUser) {
        redirect("/unauthorized");
    }

    const hasAccess = (dbUser.accessibleModules || []).includes('/admin/tarjetas-digitales');
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN' && !hasAccess) {
        redirect("/unauthorized");
    }

    // Fetch initial server data
    const [cards, leads, users] = await Promise.all([
        getDigitalCards(),
        getCardLeads(),
        getOrganizationUsers()
    ]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                        Tarjetas de Presentación Digitales
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Crea, edita y administra los perfiles de contacto digital e intercambios de leads de tus ingenieros y técnicos.
                    </p>
                </div>
            </div>

            <TarjetasClient 
                initialCards={cards}
                initialLeads={leads}
                organizationUsers={users}
            />
        </div>
    );
}
