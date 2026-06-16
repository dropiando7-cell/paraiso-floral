'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteLandingItem } from './actions';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface DeleteButtonProps {
    id: string;
    type: 'activo' | 'producto';
    name: string;
}

export default function DeleteButton({ id, type, name }: DeleteButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el producto "${name}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Eliminando producto...');
        try {
            const res = await deleteLandingItem(id, type);
            if (!res.success) {
                toast.error(res.error || 'Error al eliminar el producto', { id: toastId });
            } else {
                toast.success('Producto eliminado con éxito', { id: toastId });
                // Force a full window reload so the UI updates instantly
                window.location.reload();
            }
        } catch (err: any) {
            toast.error(err.message || 'Error de conexión', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="p-2 rounded-full backdrop-blur-md bg-white/90 hover:bg-red-50 text-slate-700 hover:text-red-650 border border-slate-200 hover:border-red-200 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-sm"
            title="Eliminar permanentemente"
        >
            <Trash2 size={14} className="shrink-0" />
        </button>
    );
}
