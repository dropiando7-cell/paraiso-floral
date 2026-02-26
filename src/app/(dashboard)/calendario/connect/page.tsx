"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { saveGoogleTokens } from "../actions";
import { ShieldCheck, Loader2, XCircle } from "lucide-react";

export default function ConnectCalendarPage() {
    const router = useRouter();
    const [status, setStatus] = useState("Procesando credenciales de Google...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const processTokens = async () => {
            const supabase = createClient();

            // Wait for Supabase to parse the URL hash from the Google redirect
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                setError("No se pudo obtener la sesión segura. Por favor, inicia sesión nuevamente.");
                return;
            }

            const providerToken = session.provider_token;
            const providerRefreshToken = session.provider_refresh_token;

            if (!providerToken) {
                setError("Google no proporcionó los permisos necesarios del calendario (provider_token vacío). Intenta de nuevo validando los accesos.");
                return;
            }

            // Guardar en la base de datos
            const res = await saveGoogleTokens(
                providerToken,
                providerRefreshToken || "",
                session.user.email || ""
            );

            if (res.error) {
                setError(res.error);
            } else {
                setStatus("¡Google Calendar vinculado con éxito!");
                setTimeout(() => router.replace("/calendario"), 1500);
            }
        };

        processTokens();
    }, [router]);

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-sm border border-slate-200 text-center">
                {error ? (
                    <>
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Error de Vinculación</h2>
                        <p className="text-sm text-slate-500 mb-6">{error}</p>
                        <button
                            onClick={() => router.replace("/calendario")}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold"
                        >
                            Volver al Calendario
                        </button>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            {status.includes("éxito") ? (
                                <ShieldCheck className="w-8 h-8" />
                            ) : (
                                <Loader2 className="w-8 h-8 animate-spin" />
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Conectando...</h2>
                        <p className="text-sm text-slate-500">{status}</p>
                    </>
                )}
            </div>
        </div>
    );
}
