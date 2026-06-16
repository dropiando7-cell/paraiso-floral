'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toggleItemVisibility } from './actions';
import toast from 'react-hot-toast';

interface VisibilityToggleProps {
    id: string;
    type: 'activo' | 'producto';
    initialHidden: boolean;
}

export default function VisibilityToggle({ id, type, initialHidden }: VisibilityToggleProps) {
    const [hidden, setHidden] = useState(initialHidden);
    const [loading, setLoading] = useState(false);

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setLoading(true);
        try {
            const nextState = !hidden;
            // Optimistic update
            setHidden(nextState);

            const res = await toggleItemVisibility(id, type, !nextState); // makeVisible = !nextState
            if (!res.success) {
                // Revert
                setHidden(hidden);
                toast.error(res.error || 'Error al cambiar visibilidad');
            } else {
                toast.success(nextState ? 'Producto ocultado al público' : 'Producto visible al público');
            }
        } catch (err: any) {
            setHidden(hidden);
            toast.error(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={loading}
            className={`p-2 rounded-full backdrop-blur-md transition-all shadow-sm border ${
                hidden 
                    ? 'bg-red-50/90 hover:bg-red-100 text-red-600 border-red-200' 
                    : 'bg-white/90 hover:bg-white text-slate-700 border-slate-200 hover:scale-105'
            } active:scale-95 cursor-pointer flex items-center justify-center`}
            title={hidden ? 'Mostrar al público (Actualmente oculto)' : 'Ocultar al público (Actualmente visible)'}
        >
            {hidden ? (
                <EyeOff size={14} className="shrink-0" />
            ) : (
                <Eye size={14} className="shrink-0" />
            )}
        </button>
    );
}
