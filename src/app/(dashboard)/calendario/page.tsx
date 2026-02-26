import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCalendarIntegration, getTasks } from "./actions";
import { CalendarApp } from "@/components/calendario/CalendarApp";
import { LinkCalendarButton } from "@/components/calendario/LinkCalendarButton";

export const metadata = {
    title: "Calendario Centralizado | Sistemas Elim",
    description: "Centro de comando para calendario y tareas",
};

export default async function CalendarioPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email! }
    });

    if (!dbUser || !['SUPER_ADMIN', 'ORG_ADMIN', 'EXECUTIVE_ASSISTANT'].includes(dbUser.role)) {
        redirect("/unauthorized");
    }

    const integration = await getCalendarIntegration();
    const tasks = await getTasks();

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Calendario Centralizado
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Tu centro de comando. Administra el tiempo y las tareas de manera inteligente.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {integration && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Sincronizado con Google
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden p-6">
                {!integration ? (
                    <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center max-w-2xl mx-auto mt-10">
                        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Conecta tu Calendario</h2>
                        <p className="text-slate-500 mb-8 max-w-md">
                            Para habilitar el centro de comando, necesitamos sincronizar tu cuenta de Google. Esto nos permitirá leer y agendar reuniones automáticamente.
                        </p>
                        <LinkCalendarButton />
                        <p className="text-xs text-slate-400 mt-6">
                            Solo solicitaremos acceso al calendario. Tu información es privada y segura.
                        </p>
                    </div>
                ) : (
                    <CalendarApp integration={integration} initialTasks={tasks} />
                )}
            </main>
        </div>
    );
}
