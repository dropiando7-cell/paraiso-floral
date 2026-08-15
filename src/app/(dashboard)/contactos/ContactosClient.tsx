'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    Users, Plus, Search, Building2, 
    Mail, Phone, FileText, MapPin, 
    MoreVertical, Pencil, Trash2, X, FileBadge, Save,
    User
} from 'lucide-react';
import { fetchContactos, createContacto, updateContacto, deleteContacto } from './actions';

export const DEPARTAMENTOS_HONDURAS = [
    'Atlántida',
    'Choluteca',
    'Colón',
    'Comayagua',
    'Copán',
    'Cortés',
    'El Paraíso',
    'Francisco Morazán',
    'Gracias a Dios',
    'Intibucá',
    'Islas de la Bahía',
    'La Paz',
    'Lempira',
    'Ocotepeque',
    'Olancho',
    'Santa Bárbara',
    'Valle',
    'Yoro'
];

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
    const [currentContacto, setCurrentContacto] = useState<Partial<Cliente>>({});
    const [submitting, setSubmitting] = useState(false);

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

    const handleSave = async () => {
        if (!currentContacto.nombre) return alert('El nombre es obligatorio');
        setSubmitting(true);
        try {
            if (modalMode === 'create') {
                await createContacto({
                    nombre: currentContacto.nombre,
                    email: currentContacto.email || undefined,
                    telefono: currentContacto.telefono || undefined,
                    direccion: currentContacto.direccion || undefined,
                    rtn: currentContacto.rtn || undefined,
                    nombreContacto: currentContacto.nombreContacto || undefined,
                    telefonoContacto: currentContacto.telefonoContacto || undefined
                });
            } else if (modalMode === 'edit' && currentContacto.id) {
                await updateContacto(currentContacto.id, {
                    nombre: currentContacto.nombre,
                    email: currentContacto.email || undefined,
                    telefono: currentContacto.telefono || undefined,
                    direccion: currentContacto.direccion || undefined,
                    rtn: currentContacto.rtn || undefined,
                    nombreContacto: currentContacto.nombreContacto || undefined,
                    telefonoContacto: currentContacto.telefonoContacto || undefined
                });
            }
            setModalMode(null);
            setCurrentContacto({});
            // force refresh
            const { params, count, totalPages: tp } = await fetchContactos(search, page);
            setContactos(params as any);
            setTotalCount(count);
            setTotalPages(tp);
        } catch (e) {
            alert('Error guardando contacto');
        } finally {
            setSubmitting(false);
        }
    };

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
        <div className="p-1 sm:p-6 md:p-8 max-w-[1600px] mx-auto relative min-h-screen">
            {/* Header */}
            <div className="flex flex-row items-center justify-between gap-2 mb-3 sm:mb-6">
                <div>
                    <h1 className="text-base sm:text-2xl md:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <Users className="w-5 h-5 sm:w-8 sm:h-8 text-blue-600 shrink-0" />
                        <span className="truncate">Contactos</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">
                        Gestión de clientes y agenda de contactos
                    </p>
                </div>
                <button
                    onClick={() => { setCurrentContacto({}); setModalMode('create'); }}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm shadow-blue-200 shrink-0 cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    <span>+ Nuevo Contacto</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-2 sm:p-4 rounded-2xl shadow-xs border border-slate-200 mb-3 sm:mb-6 flex flex-row items-center justify-between gap-2">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar nombre, teléfono, RTN..."
                        className="w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition-all text-xs sm:text-sm text-slate-800 font-medium"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl shrink-0">
                    Total: <span className="text-blue-600 font-black">{totalCount}</span>
                </div>
            </div>

            {/* MOBILE CARDS VIEW */}
            <div className="block md:hidden space-y-2 mb-4">
                {contactos.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-medium">
                        No se encontraron contactos.
                    </div>
                ) : (
                    contactos.map(c => (
                        <div key={c.id} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                            {/* Header: Initial avatar, Title, Actions */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm shrink-0 uppercase">
                                        {c.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-xs sm:text-sm text-slate-900 leading-snug truncate uppercase">{c.nombre}</h3>
                                        {c.nombreContacto && (
                                            <p className="text-[11px] text-slate-600 font-bold flex items-center gap-1 truncate mt-0.5 uppercase">
                                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                                <span className="truncate">{c.nombreContacto}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => { setCurrentContacto(c); setModalMode('edit'); }}
                                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 transition-all"
                                        title="Editar"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(c.id)}
                                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Department / RTN Badges */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {c.departamento && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                        <MapPin className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                        {c.departamento}
                                    </span>
                                )}
                                {c.rtn && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                        <FileBadge className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                        RTN: {c.rtn}
                                    </span>
                                )}
                            </div>

                            {/* Address if present */}
                            {c.direccion && (
                                <p className="text-[11px] text-slate-600 flex items-start gap-1 leading-tight bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">{c.direccion}</span>
                                </p>
                            )}

                            {/* Contact phone / email */}
                            <div className="space-y-1 text-[11px] font-medium text-slate-600 pt-1 border-t border-slate-100">
                                <div className="flex flex-wrap gap-2">
                                    {c.telefono && (
                                        <div className="flex items-center gap-1 text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                            <Phone className="w-3 h-3 text-slate-400" />
                                            <span>{c.telefono}</span>
                                            <span className="text-[9px] bg-slate-200/80 px-1 rounded text-slate-600 font-bold ml-1">Empresa</span>
                                        </div>
                                    )}
                                    {c.telefonoContacto && (
                                        <div className="flex items-center gap-1 text-indigo-900 font-bold bg-indigo-50/70 px-2 py-1 rounded-md border border-indigo-100">
                                            <Phone className="w-3 h-3 text-indigo-500" />
                                            <span>{c.telefonoContacto}</span>
                                            <span className="text-[9px] bg-indigo-200/70 px-1 rounded text-indigo-800 font-bold ml-1">Personal</span>
                                        </div>
                                    )}
                                </div>
                                {c.email && (
                                    <div className="flex items-center gap-1.5 text-slate-600 truncate bg-slate-50 px-2 py-1 rounded-md border border-slate-100 mt-1">
                                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate">{c.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold text-slate-400">
                                <th className="px-6 py-4">Nombre / Empresa</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4">RTN / ID Fiscal</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y divide-slate-100 transition-opacity duration-300 ${loading ? 'opacity-40' : 'opacity-100'}`}>
                            {contactos.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                                        No se encontraron contactos.
                                    </td>
                                </tr>
                            ) : (
                                contactos.map(c => (
                                    <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 font-bold shrink-0">
                                                    {c.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-800">{c.nombre}</div>
                                                    {c.nombreContacto && (
                                                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>{c.nombreContacto}</span>
                                                        </div>
                                                    )}
                                                    {c.direccion && (
                                                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            <span className="truncate max-w-[200px]" title={c.direccion}>{c.direccion}</span>
                                                        </div>
                                                    )}
                                                    {c.departamento && (
                                                        <div className="mt-1">
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                                                <MapPin className="w-3 h-3 text-blue-500" />
                                                                {c.departamento}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                                                {c.telefono && (
                                                    <div className="flex items-center gap-2" title="Teléfono de la empresa">
                                                        <Phone className="w-4 h-4 text-slate-400" />
                                                        <span>{c.telefono}</span>
                                                        <span className="text-[9px] bg-slate-100 px-1 py-0.5 rounded text-slate-500">Empresa</span>
                                                    </div>
                                                )}
                                                {c.telefonoContacto && (
                                                    <div className="flex items-center gap-2" title="Teléfono de contacto directo">
                                                        <Phone className="w-4 h-4 text-indigo-400" />
                                                        <span>{c.telefonoContacto}</span>
                                                        <span className="text-[9px] bg-indigo-50 px-1 py-0.5 rounded text-indigo-600">Personal</span>
                                                    </div>
                                                )}
                                                {!c.telefono && !c.telefonoContacto && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-4 h-4 text-slate-400" />
                                                        <span className="text-slate-300 italic">Sin tel.</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-slate-400" />
                                                    {c.email || <span className="text-slate-300 italic">Sin email</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <FileBadge className="w-4 h-4 text-slate-400" />
                                                <span className="font-mono text-sm font-medium text-slate-600">
                                                    {c.rtn || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setCurrentContacto(c); setModalMode('edit'); }}
                                                    className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(c.id)}
                                                    className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                                                    title="Eliminar"
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
                        <span className="text-sm font-medium text-slate-500">
                            Página {page} de {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <button
                                disabled={page === totalPages || totalPages === 0}
                                onClick={() => setPage(p => p + 1)}
                                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Pagination */}
            {totalPages > 1 && (
                <div className="block md:hidden mt-3 p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">
                        Pág. {page} de {totalPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        <button
                            disabled={page === totalPages || totalPages === 0}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Crear/Editar */}
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

export function ContactoModal({
    open,
    onClose,
    onSuccess,
    initialContacto
}: {
    open: boolean;
    onClose: () => void;
    onSuccess: (savedContacto?: any) => void;
    initialContacto?: Partial<Cliente> | null;
}) {
    const [currentContacto, setCurrentContacto] = useState<Partial<Cliente>>(initialContacto || {});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setCurrentContacto(initialContacto || {});
        }
    }, [open, initialContacto]);

    if (!open) return null;

    const isEdit = !!currentContacto.id;

    const handleSave = async () => {
        if (!currentContacto.nombre) return alert('El nombre es obligatorio');
        setSubmitting(true);
        try {
            if (isEdit && currentContacto.id) {
                const res = await updateContacto(currentContacto.id, {
                    nombre: currentContacto.nombre,
                    email: currentContacto.email || undefined,
                    telefono: currentContacto.telefono || undefined,
                    direccion: currentContacto.direccion || undefined,
                    departamento: currentContacto.departamento || undefined,
                    rtn: currentContacto.rtn || undefined,
                    nombreContacto: currentContacto.nombreContacto || undefined,
                    telefonoContacto: currentContacto.telefonoContacto || undefined,
                    emailsCC: currentContacto.emailsCC || undefined
                });
                onSuccess(res);
            } else {
                const res = await createContacto({
                    nombre: currentContacto.nombre,
                    email: currentContacto.email || undefined,
                    telefono: currentContacto.telefono || undefined,
                    direccion: currentContacto.direccion || undefined,
                    departamento: currentContacto.departamento || undefined,
                    rtn: currentContacto.rtn || undefined,
                    nombreContacto: currentContacto.nombreContacto || undefined,
                    telefonoContacto: currentContacto.telefonoContacto || undefined,
                    emailsCC: currentContacto.emailsCC || undefined
                });
                onSuccess(res || currentContacto);
            }
            onClose();
        } catch (e) {
            alert('Error guardando contacto');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">
                        {isEdit ? 'Editar Contacto' : 'Nuevo Contacto'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Nombre / Empresa <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder="Ej: Juan Perez, Empresa S.A."
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800"
                            value={currentContacto.nombre || ''}
                            onChange={e => setCurrentContacto({ ...currentContacto, nombre: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Teléfono Empresa</label>
                            <input
                                type="tel"
                                placeholder="+504 0000..."
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800"
                                value={currentContacto.telefono || ''}
                                onChange={e => setCurrentContacto({ ...currentContacto, telefono: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">RTN / NIT</label>
                            <input
                                type="text"
                                placeholder="No. Identidad o RTN"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800"
                                value={currentContacto.rtn || ''}
                                onChange={e => setCurrentContacto({ ...currentContacto, rtn: e.target.value })}
                            />
                        </div>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Datos del Contacto Directo (Encargado)</span>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Nombre de Contacto</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Encargado de Compras"
                                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800"
                                    value={currentContacto.nombreContacto || ''}
                                    onChange={e => setCurrentContacto({ ...currentContacto, nombreContacto: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Teléfono Contacto</label>
                                <input
                                    type="tel"
                                    placeholder="Celular o Directo"
                                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800"
                                    value={currentContacto.telefonoContacto || ''}
                                    onChange={e => setCurrentContacto({ ...currentContacto, telefonoContacto: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Correo Electrónico Principal</label>
                         <input
                             type="email"
                             placeholder="contacto@empresa.com"
                             className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800"
                             value={currentContacto.email || ''}
                             onChange={e => setCurrentContacto({ ...currentContacto, email: e.target.value })}
                         />
                    </div>
                    <div>
                         <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">
                             Correos para Copia (CC) <span className="text-xs text-slate-400 font-normal">(Separados por coma)</span>
                         </label>
                         <input
                             type="text"
                             placeholder="contabilidad@empresa.com, gerencia@empresa.com"
                             className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800"
                             value={currentContacto.emailsCC || ''}
                             onChange={e => setCurrentContacto({ ...currentContacto, emailsCC: e.target.value })}
                         />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Departamento (Honduras)</label>
                        <select
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800 cursor-pointer"
                            value={currentContacto.departamento || ''}
                            onChange={e => setCurrentContacto({ ...currentContacto, departamento: e.target.value })}
                        >
                            <option value="">-- Seleccionar Departamento --</option>
                            {DEPARTAMENTOS_HONDURAS.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1.5 focus-within:text-blue-600">Dirección</label>
                        <textarea
                            placeholder="Dirección física..."
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-800 min-h-[80px] resize-none"
                            value={currentContacto.direccion || ''}
                            onChange={e => setCurrentContacto({ ...currentContacto, direccion: e.target.value })}
                        />
                    </div>
                </div>
                <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled={submitting}
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        <Save className="w-4 h-4" />
                        {submitting ? 'Guardando...' : 'Guardar Contacto'}
                    </button>
                </div>
            </div>
        </div>
    );
}
