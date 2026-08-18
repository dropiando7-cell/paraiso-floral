'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Users, Plus, Search, Building2, 
    Mail, Phone, MapPin, 
    Pencil, Trash2, FileBadge,
    User, CreditCard, Clock
} from 'lucide-react';
import { fetchContactos, deleteContacto } from './actions';
import ContactoModal, { ClienteFormData } from '@/components/contactos/ContactoModal';
export { default as ContactoModal } from '@/components/contactos/ContactoModal';

type Cliente = {
    id: string;
    nombre: string;
    rtn?: string | null;
    email?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    departamento?: string | null;
    nombreContacto?: string | null;
    telefonoContacto?: string | null;
    emailsCC?: string | null;
    limiteCredito?: number | null;
    diasCredito?: number | null;
    notas?: string | null;
    createdAt: Date;
};

export default function ContactosClient({ initialData }: { initialData: Cliente[] }) {
    const [contactos, setContactos] = useState<Cliente[]>(initialData);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(initialData.length);

    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [currentContacto, setCurrentContacto] = useState<Partial<ClienteFormData>>({});

    const searchParams = useSearchParams();

    useEffect(() => {
        const modal = searchParams?.get('modal');
        const nuevo = searchParams?.get('nuevo');
        if (modal === 'nuevo' || nuevo === 'true') {
            setModalMode('create');
            const initialNombre = searchParams?.get('nombre') || '';
            setCurrentContacto({ nombre: initialNombre });
        }
    }, [searchParams]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const load = async () => {
                setLoading(true);
                try {
                    const { params, totalPages: tp, count } = await fetchContactos(search, page);
                    setContactos(params as any);
                    setTotalPages(tp);
                    setTotalCount(count);
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            };
            load();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, page]);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este contacto de forma permanente?')) return;
        setLoading(true);
        try {
            await deleteContacto(id);
            const { params, count, totalPages: tp } = await fetchContactos(search, page);
            setContactos(params as any);
            setTotalCount(count);
            setTotalPages(tp);
        } catch (e) {
            alert('No se pudo eliminar, posiblemente tiene facturas asociadas.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto relative min-h-screen space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                        <Building2 className="w-4 h-4" /> Distribuidora Paraíso Floral
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Directorio de Clientes</h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                        Gestión de clientes, encargados de compras, departamentos de Honduras y condiciones de crédito.
                    </p>
                </div>
                <button
                    onClick={() => { setCurrentContacto({}); setModalMode('create'); }}
                    className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Cliente</span>
                </button>
            </div>

            {/* Buscador & Contadores */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Buscar por cliente, RTN, departamento, encargado o teléfono..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                    />
                </div>
                <div className="text-xs font-bold text-slate-500 px-2">
                    Total: <span className="text-emerald-600">{totalCount}</span> clientes
                </div>
            </div>

            {/* Tabla de Clientes */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                                <th className="py-4 px-6">Cliente / Empresa</th>
                                <th className="py-4 px-6">Contacto Directo</th>
                                <th className="py-4 px-6">RTN & Depto</th>
                                <th className="py-4 px-6">Condición Crédito</th>
                                <th className="py-4 px-6 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-semibold">
                                        Cargando directorio de clientes...
                                    </td>
                                </tr>
                            ) : contactos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                                        No se encontraron contactos.
                                    </td>
                                </tr>
                            ) : (
                                contactos.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-black shrink-0">
                                                    {c.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm">{c.nombre}</div>
                                                    {c.direccion && (
                                                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3 text-slate-400" />
                                                            <span className="truncate max-w-[220px]" title={c.direccion}>{c.direccion}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 font-medium text-slate-600">
                                                {c.nombreContacto && (
                                                    <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                                                        <User className="w-3.5 h-3.5 text-emerald-600" />
                                                        <span>{c.nombreContacto}</span>
                                                    </div>
                                                )}
                                                {c.telefono && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>{c.telefono}</span>
                                                    </div>
                                                )}
                                                {c.email && (
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>{c.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <FileBadge className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="font-mono font-bold text-slate-700">{c.rtn || 'Consumidor Final'}</span>
                                            </div>
                                            {c.departamento && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                    <MapPin className="w-3 h-3 text-emerald-600" />
                                                    {c.departamento}
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 text-slate-900 font-black">
                                                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                                    <span>L. {(c.limiteCredito || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    <span>{c.diasCredito || 15} Días Plazo</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => { setCurrentContacto(c); setModalMode('edit'); }}
                                                    className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                                                    title="Editar Cliente"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(c.id)}
                                                    className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                                                    title="Eliminar Cliente"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Desktop */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                            Página {page} de {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                            >
                                Anterior
                            </button>
                            <button
                                disabled={page === totalPages || totalPages === 0}
                                onClick={() => setPage(p => p + 1)}
                                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Crear/Editar Reutilizable */}
            <ContactoModal
                open={!!modalMode}
                onClose={() => setModalMode(null)}
                initialContacto={currentContacto}
                onSuccess={async () => {
                    const { params, count, totalPages: tp } = await fetchContactos(search, page);
                    setContactos(params as any);
                    setTotalCount(count);
                    setTotalPages(tp);
                }}
            />
        </div>
    );
}
