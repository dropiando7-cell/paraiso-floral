'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <button
            onClick={handleLogout}
            disabled={loading}
            className="text-white bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
        >
            {loading ? 'Cerrando sesión...' : 'Cerrar sesión y volver a intentar'}
        </button>
    );
}
