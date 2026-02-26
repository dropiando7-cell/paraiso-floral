"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Calendar } from "lucide-react";

export function LinkCalendarButton() {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleLink = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/calendar',
                redirectTo: `${window.location.origin}/auth/callback?next=/calendario/connect`,
            },
        });

        if (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleLink}
            disabled={loading}
            className="flex items-center gap-3 px-6 py-4 bg-[#0A192F] hover:bg-[#0d213f] text-white font-semibold rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-50 mx-auto"
        >
            <Calendar className="w-5 h-5" />
            {loading ? "Conectando..." : "Vincular Google Calendar"}
        </button>
    );
}
