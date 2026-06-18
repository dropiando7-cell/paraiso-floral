'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Trash2, HeartPulse, Loader2, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import VisibilityToggle from './VisibilityToggle';
import DeleteButton from './DeleteButton';
import { bulkToggleItemVisibility, bulkDeleteLandingItems } from './actions';

interface ProductItem {
    id: string;
    name: string;
    brand: string;
    model: string;
    code: string;
    imageUrl: string | null;
    type: 'activo' | 'producto';
    typeName: string;
    category: string;
    hidden: boolean;
}

interface ProductGridClientProps {
    items: ProductItem[];
    isAdmin: boolean;
}

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

export default function ProductGridClient({ items, isAdmin }: ProductGridClientProps) {
    const [selectedItems, setSelectedItems] = useState<{ id: string; type: 'activo' | 'producto' }[]>([]);
    const [loading, setLoading] = useState(false);

    // Reset selection when items prop changes (e.g. search or filter is applied)
    useEffect(() => {
        setSelectedItems([]);
    }, [items]);

    const handleSelectToggle = (id: string, type: 'activo' | 'producto') => {
        setSelectedItems(prev => {
            const exists = prev.some(item => item.id === id);
            if (exists) {
                return prev.filter(item => item.id !== id);
            } else {
                return [...prev, { id, type }];
            }
        });
    };

    const handleSelectAllToggle = () => {
        if (selectedItems.length === items.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(items.map(item => ({ id: item.id, type: item.type })));
        }
    };

    const handleBulkVisibility = async (makeVisible: boolean) => {
        if (selectedItems.length === 0) return;
        setLoading(true);
        try {
            const res = await bulkToggleItemVisibility(selectedItems, makeVisible);
            if (res.success) {
                toast.success(
                    makeVisible 
                        ? `${selectedItems.length} productos marcados como visibles` 
                        : `${selectedItems.length} productos ocultados con éxito`
                );
                setSelectedItems([]);
            } else {
                toast.error(res.error || 'Error al actualizar productos');
            }
        } catch (err: unknown) {
            const error = err as Error;
            toast.error(error.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) return;
        const confirmMsg = `¿Estás seguro de eliminar ${selectedItems.length} productos seleccionados?\nEsta acción es irreversible o marcará los activos/productos como inactivos en base de datos.`;
        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const res = await bulkDeleteLandingItems(selectedItems);
            if (res.success) {
                toast.success(`${selectedItems.length} productos eliminados con éxito`);
                setSelectedItems([]);
            } else {
                toast.error(res.error || 'Error al eliminar productos');
            }
        } catch (err: unknown) {
            const error = err as Error;
            toast.error(error.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="border border-slate-200 border-dashed rounded-3xl p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
                <HeartPulse size={36} className="text-slate-350 stroke-[1.2]" />
                <span>No se encontraron equipos para los filtros aplicados.</span>
            </div>
        );
    }

    const allSelected = selectedItems.length === items.length;

    return (
        <div className="space-y-4">
            {/* Bulk Actions Header Bar */}
            {isAdmin && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-250 animate-out fade-out">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSelectAllToggle}
                            className="text-slate-600 hover:text-slate-800 transition-colors flex items-center gap-2 text-xs font-bold focus:outline-none cursor-pointer"
                        >
                            {allSelected ? (
                                <CheckSquare size={18} className="text-cyan-600" />
                            ) : (
                                <Square size={18} className="text-slate-400" />
                            )}
                            <span>Seleccionar Todos ({items.length})</span>
                        </button>
                        
                        {selectedItems.length > 0 && (
                            <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full">
                                {selectedItems.length} seleccionado{selectedItems.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {selectedItems.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleBulkVisibility(true)}
                                className="flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                                <span>Mostrar</span>
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleBulkVisibility(false)}
                                className="flex items-center gap-1 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? <Loader2 size={13} className="animate-spin" /> : <EyeOff size={13} />}
                                <span>Ocultar</span>
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleBulkDelete}
                                className="flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                <span>Eliminar</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map(item => {
                    const isSelected = selectedItems.some(si => si.id === item.id);
                    return (
                        <div 
                            key={item.id} 
                            onClick={() => isAdmin && handleSelectToggle(item.id, item.type)}
                            className={`group bg-white border rounded-3xl overflow-hidden hover:shadow-lg transition-all flex flex-col relative duration-300 cursor-pointer ${
                                item.hidden 
                                    ? 'opacity-65 bg-slate-50 border-dashed border-red-200/80' 
                                    : 'border-slate-200/80 hover:border-slate-350 hover:border-[#00a8cc]'
                            } ${isSelected ? 'ring-2 ring-[#00a8cc] border-[#00a8cc] bg-cyan-50/10' : ''}`}
                        >
                            {/* Checkbox Overlay for Admin */}
                            {isAdmin && (
                                <div 
                                    className="absolute top-3.5 left-3 z-30 flex items-center justify-center bg-white rounded-md shadow-sm p-0.5 border border-slate-200"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleSelectToggle(item.id, item.type)}
                                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 cursor-pointer bg-white"
                                    />
                                </div>
                            )}

                            {/* Type badge */}
                            <div className={`absolute top-3 bg-slate-100/90 backdrop-blur text-[8px] font-extrabold text-slate-550 px-2 py-0.5 rounded-full uppercase tracking-wider border border-slate-200 z-10 ${
                                isAdmin ? 'left-10' : 'left-3'
                            }`}>
                                {item.typeName}
                            </div>

                            {/* Visibility indicator for Admin */}
                            {isAdmin && item.hidden && (
                                <div className="absolute top-3 left-36 bg-red-100/90 backdrop-blur text-[8px] font-black text-red-700 px-2 py-0.5 rounded-full uppercase tracking-wider border border-red-200 z-10 flex items-center gap-1 shadow-sm">
                                    <EyeOff size={8} />
                                    <span>Oculto</span>
                                </div>
                            )}

                            {/* Admin Actions (Visibility & Delete) - Stopped propagation to prevent select toggle */}
                            {isAdmin && (
                                <div 
                                    className="absolute top-3 right-3 z-20 flex items-center gap-1.5"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <VisibilityToggle 
                                        id={item.id} 
                                        type={item.type} 
                                        initialHidden={item.hidden} 
                                    />
                                    <DeleteButton 
                                        id={item.id} 
                                        type={item.type} 
                                        name={item.name}
                                    />
                                </div>
                            )}

                            {/* Image */}
                            <div className="aspect-[4/3] w-full bg-slate-50 flex items-center justify-center border-b border-slate-200/60 relative overflow-hidden">
                                {item.imageUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.name} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <HeartPulse className="text-slate-300 w-12 h-12 stroke-[1.2]" />
                                )}
                            </div>

                            {/* Body */}
                            <div className="p-5 flex-1 flex flex-col gap-4 text-xs font-semibold" onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1.5 flex-1 text-left">
                                    <span className="text-[8px] font-black bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                                        {item.brand}
                                    </span>
                                    <h3 className="font-extrabold text-slate-850 leading-snug line-clamp-2">{item.name}</h3>
                                    {item.model && (
                                        <p className="text-[10px] text-slate-400 font-mono font-medium">Modelo: {item.model}</p>
                                    )}
                                </div>

                                <div className="flex gap-2 text-[10px] font-bold">
                                    <Link
                                        href={`/productos/${slugify(item.category || 'equipos')}/${item.id}-${slugify(item.name || '')}`}
                                        className="flex-1 text-center bg-slate-50 hover:bg-slate-100 text-slate-700 py-2.5 rounded-xl border border-slate-200 transition-colors"
                                    >
                                        Ver Ficha
                                    </Link>
                                    <Link
                                        href={`/productos/${slugify(item.category || 'equipos')}/${item.id}-${slugify(item.name || '')}?cotizar=true`}
                                        className="flex-1 text-center bg-[#00a8cc] hover:bg-[#00b4d8] text-white py-2.5 rounded-xl transition-colors shadow-sm shadow-cyan-500/10 cursor-pointer"
                                    >
                                        Cotizar
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
