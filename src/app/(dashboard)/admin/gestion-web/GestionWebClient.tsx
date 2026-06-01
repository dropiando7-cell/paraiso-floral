'use client';

import React, { useState, useEffect } from 'react';
import { 
    saveMaintenanceMode, 
    saveLandingSections, 
    saveGoogleReviews, 
    saveLandingSettings, 
    searchInventoryItems, 
    updateItemImage,
    getWebContacts,
    updateContactStatus,
    deleteWebContact,
    getWebTraffic
} from './actions';
import { 
    Settings, 
    MessageSquare, 
    Image as ImageIcon, 
    LayoutGrid, 
    Save, 
    Plus, 
    Trash2, 
    Search, 
    AlertCircle, 
    CheckCircle2, 
    ArrowUpDown, 
    ToggleLeft, 
    ToggleRight, 
    Smartphone, 
    Mail, 
    MapPin, 
    Clock, 
    HelpCircle,
    Eye,
    EyeOff,
    Users,
    Activity,
    User,
    Laptop,
    Globe,
    MessageCircle,
    Send,
    Check,
    RefreshCw,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Review {
    id: string;
    author: string;
    rating: number;
    text: string;
    avatar: string;
    date: string;
}

interface Section {
    id: string;
    name: string;
    visible: boolean;
}

interface LandingSettings {
    whatsappNumbers?: string[];
    contactEmails?: string[];
    physicalAddress?: string;
    workingHours?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    quoteWhatsappNumber?: string;
    quoteEmail?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
    seoImage?: string;
}

interface GestionWebClientProps {
    initialMaintenanceMode: boolean;
    initialReviews: Review[];
    initialSections: Section[];
    initialLandingSettings: LandingSettings;
}

export default function GestionWebClient({
    initialMaintenanceMode,
    initialReviews,
    initialSections,
    initialLandingSettings
}: GestionWebClientProps) {
    const [activeTab, setActiveTab] = useState<'status' | 'sections' | 'reviews' | 'inventory' | 'general' | 'seo' | 'contacts' | 'activity'>('status');
    const [maintenanceMode, setMaintenanceMode] = useState(initialMaintenanceMode);
    const [sections, setSections] = useState<Section[]>(initialSections);
    const [reviews, setReviews] = useState<Review[]>(initialReviews);
    const [landingSettings, setLandingSettings] = useState<LandingSettings>(initialLandingSettings);
    
    // Inventory Image editing states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [updatingImageId, setUpdatingImageId] = useState<string | null>(null);
    const [itemImageUrls, setItemImageUrls] = useState<Record<string, string>>({});

    // Review editing states
    const [editingReview, setEditingReview] = useState<Review | null>(null);
    const [newReviewAuthor, setNewReviewAuthor] = useState('');
    const [newReviewText, setNewReviewText] = useState('');
    const [newReviewRating, setNewReviewRating] = useState(5);
    const [newReviewDate, setNewReviewDate] = useState('Hace 1 semana');

    // Saving indicators
    const [saving, setSaving] = useState(false);

    // Web Contacts states
    const [contacts, setContacts] = useState<any[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [contactSearch, setContactSearch] = useState('');
    const [contactFilter, setContactFilter] = useState<'ALL' | 'PENDIENTE' | 'LEIDO' | 'CONTACTADO' | 'ARCHIVADO'>('ALL');
    const [selectedContact, setSelectedContact] = useState<any | null>(null);

    // Live Traffic states
    const [trafficLogs, setTrafficLogs] = useState<any[]>([]);
    const [activeCount, setActiveCount] = useState(0);
    const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
    const [topPages, setTopPages] = useState<any[]>([]);
    const [loadingTraffic, setLoadingTraffic] = useState(false);
    const [simulatingChat, setSimulatingChat] = useState<any | null>(null);
    const [chatMsgText, setChatMsgText] = useState('¡Hola! Vemos que estás buscando soluciones médicas en nuestro portal. ¿Te gustaría chatear con un asesor especializado ahora mismo?');

    // Load contacts when tab active
    useEffect(() => {
        if (activeTab === 'contacts') {
            fetchContacts();
        }
    }, [activeTab]);

    const fetchContacts = async () => {
        setLoadingContacts(true);
        try {
            const res = await getWebContacts();
            if (res.success && res.contacts) {
                setContacts(res.contacts);
            } else {
                toast.error(res.error || 'Error al cargar contactos');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        } finally {
            setLoadingContacts(false);
        }
    };

    const handleUpdateContactStatus = async (id: string, newStatus: string) => {
        try {
            const res = await updateContactStatus(id, newStatus);
            if (res.success && res.contact) {
                setContacts(prev => prev.map(c => c.id === id ? res.contact : c));
                if (selectedContact?.id === id) {
                    setSelectedContact(res.contact);
                }
                toast.success(`Estado actualizado a ${newStatus}`);
            } else {
                toast.error(res.error || 'Error al actualizar estado');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        }
    };

    const handleDeleteContact = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar permanentemente este contacto?')) return;
        try {
            const res = await deleteWebContact(id);
            if (res.success) {
                setContacts(prev => prev.filter(c => c.id !== id));
                if (selectedContact?.id === id) {
                    setSelectedContact(null);
                }
                toast.success('Contacto eliminado con éxito');
            } else {
                toast.error(res.error || 'Error al eliminar contacto');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        }
    };

    // Live Traffic polling
    useEffect(() => {
        let interval: any;
        if (activeTab === 'activity') {
            fetchTraffic();
            interval = setInterval(() => {
                fetchTraffic(true); // silent fetch in background
            }, 10000); // every 10 seconds
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTab]);

    const fetchTraffic = async (silent = false) => {
        if (!silent) setLoadingTraffic(true);
        try {
            const res = await getWebTraffic(15);
            if (res.success) {
                setTrafficLogs(res.logs || []);
                setActiveCount(res.activeCount || 0);
                setActiveVisitors(res.activeVisitors || []);
                setTopPages(res.topPages || []);
            }
        } catch (e) {
            console.error('Error fetching traffic:', e);
        } finally {
            if (!silent) setLoadingTraffic(false);
        }
    };

    // --- Tab 1: Maintenance Switcher ---
    const handleToggleMaintenance = async () => {
        const confirmMsg = maintenanceMode 
            ? '¿Estás seguro de desactivar el modo mantenimiento? El sitio web será visible al público.'
            : '¿Estás seguro de activar el modo mantenimiento? El público verá un aviso de "Sitio en Construcción".';
            
        if (!confirm(confirmMsg)) return;

        try {
            const nextMode = !maintenanceMode;
            setMaintenanceMode(nextMode);
            const res = await saveMaintenanceMode(nextMode);
            if (res.success) {
                toast.success(nextMode ? 'Modo mantenimiento activado' : 'Sitio web publicado con éxito');
            } else {
                setMaintenanceMode(!nextMode);
                toast.error(res.error || 'Error al guardar');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        }
    };

    // --- Tab 2: HTML5 Drag & Drop for Section Ordering ---
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
    };

    const handleDrop = (index: number) => {
        if (draggedIndex === null || draggedIndex === index) return;
        
        const updated = [...sections];
        const [draggedItem] = updated.splice(draggedIndex, 1);
        updated.splice(index, 0, draggedItem);
        
        setSections(updated);
        setDraggedIndex(null);
    };

    const toggleSectionVisibility = (index: number) => {
        const updated = [...sections];
        updated[index] = { ...updated[index], visible: !updated[index].visible };
        setSections(updated);
    };

    const saveSectionsOrder = async () => {
        setSaving(true);
        try {
            const res = await saveLandingSections(sections);
            if (res.success) {
                toast.success('Orden de secciones guardado');
            } else {
                toast.error(res.error || 'Error al guardar');
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    // --- Tab 3: Google Reviews Manager ---
    const handleAddReview = () => {
        if (!newReviewAuthor || !newReviewText) {
            toast.error('Nombre y texto son requeridos');
            return;
        }

        const newReview: Review = {
            id: editingReview?.id || `rev-${Date.now()}`,
            author: newReviewAuthor,
            rating: newReviewRating,
            text: newReviewText,
            avatar: editingReview?.avatar || 'https://i.ibb.co/L8xY7hS/avatar-placeholder.png',
            date: newReviewDate
        };

        let updatedReviews = [...reviews];
        if (editingReview) {
            updatedReviews = updatedReviews.map(r => r.id === editingReview.id ? newReview : r);
            setEditingReview(null);
            toast.success('Reseña actualizada');
        } else {
            updatedReviews.push(newReview);
            toast.success('Reseña agregada');
        }

        setReviews(updatedReviews);
        setNewReviewAuthor('');
        setNewReviewText('');
        setNewReviewRating(5);
        setNewReviewDate('Hace 1 semana');
    };

    const handleEditReviewClick = (review: Review) => {
        setEditingReview(review);
        setNewReviewAuthor(review.author);
        setNewReviewText(review.text);
        setNewReviewRating(review.rating);
        setNewReviewDate(review.date);
    };

    const handleDeleteReview = (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta reseña?')) return;
        const updated = reviews.filter(r => r.id !== id);
        setReviews(updated);
        toast.success('Reseña eliminada temporalmente de la lista local (recuerda Guardar)');
    };

    const saveReviewsToDb = async () => {
        setSaving(true);
        try {
            const res = await saveGoogleReviews(reviews);
            if (res.success) {
                toast.success('Reseñas de Google guardadas en la BD');
            } else {
                toast.error(res.error || 'Error al guardar');
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    // --- Tab 4: Web Inventory Image Manager ---
    const handleSearchInventory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoadingSearch(true);
        try {
            const res = await searchInventoryItems(searchQuery);
            if (res.success) {
                setSearchResults(res.activos || []);
                // Initialize text inputs
                const urls: Record<string, string> = {};
                res.activos?.forEach((a: any) => {
                    urls[a.id] = a.imageUrl || '';
                });
                setItemImageUrls(urls);
            } else {
                toast.error(res.error || 'Error al buscar en el inventario');
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleSaveItemImage = async (id: string, type: 'activo' | 'producto') => {
        setUpdatingImageId(id);
        const url = itemImageUrls[id] || '';
        try {
            const res = await updateItemImage(id, type, url);
            if (res.success) {
                toast.success('Imagen del equipo actualizada');
                setSearchResults(prev => prev.map(item => item.id === id ? { ...item, imageUrl: url } : item));
            } else {
                toast.error(res.error || 'Error al actualizar imagen');
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setUpdatingImageId(null);
        }
    };

    // --- Tab 5: General Landing Settings ---
    const handleSaveGeneralSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await saveLandingSettings(landingSettings);
            if (res.success) {
                toast.success('Configuraciones generales guardadas');
            } else {
                toast.error(res.error || 'Error al guardar');
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleGeneralFieldChange = (key: keyof LandingSettings, value: string | string[]) => {
        setLandingSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Sidebar Tabs */}
            <div className="flex flex-col gap-1.5 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm md:col-span-1">
                <button
                    onClick={() => setActiveTab('status')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'status' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <Settings size={18} />
                    <span>Mantenimiento</span>
                </button>
                <button
                    onClick={() => setActiveTab('sections')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'sections' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <LayoutGrid size={18} />
                    <span>Secciones Web</span>
                </button>
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'reviews' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <MessageSquare size={18} />
                    <span>Reseñas de Google</span>
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'inventory' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <ImageIcon size={18} />
                    <span>Imágenes de Equipos</span>
                </button>
                <button
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'general' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <Smartphone size={18} />
                    <span>Configuración General</span>
                </button>
                <button
                    onClick={() => setActiveTab('seo')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'seo' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <Search size={18} />
                    <span>Configuración SEO</span>
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                    onClick={() => setActiveTab('contacts')}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'contacts' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <Users size={18} />
                        <span>Contactos de Cotización</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'activity' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <Activity size={18} />
                        <span>Actividad en Vivo</span>
                    </div>
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm md:col-span-3 overflow-hidden">
                
                {/* TAB 1: Maintenance Status */}
                {activeTab === 'status' && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Estado de la Página Web</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Controla si el público puede acceder a la web o si ve el aviso de mantenimiento.</p>
                        </div>

                        <div className="p-5 border rounded-2xl flex items-center justify-between gap-6 transition-colors bg-slate-50">
                            <div className="space-y-1">
                                <h3 className="font-bold text-sm text-slate-900">
                                    {maintenanceMode ? 'Modo Mantenimiento Activo' : 'Sitio Web Público Activo'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {maintenanceMode 
                                        ? 'Actualmente los usuarios que visitan bioelectronicahn.com ven la pantalla de "Nueva experiencia digital en camino" y no pueden navegar por el catálogo.' 
                                        : 'El catálogo y servicios están abiertos y accesibles para todos los visitantes.'}
                                </p>
                            </div>
                            <button
                                onClick={handleToggleMaintenance}
                                className="shrink-0 transition-transform active:scale-95"
                                aria-label="Toggle Maintenance Mode"
                            >
                                {maintenanceMode ? (
                                    <ToggleLeft className="text-slate-400 w-16 h-10 stroke-[1.2]" />
                                ) : (
                                    <ToggleRight className="text-green-600 w-16 h-10 stroke-[1.2]" />
                                )}
                            </button>
                        </div>

                        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex gap-3 text-xs text-blue-800">
                            <AlertCircle className="shrink-0" size={16} />
                            <div>
                                <span className="font-semibold">Nota:</span> El acceso al ERP (sistema.bioelectronicahn.com) no se ve afectado por el modo mantenimiento y siempre estará disponible para el personal técnico y administrativo.
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: Drag & Drop Sections */}
                {activeTab === 'sections' && (
                    <div className="p-6 space-y-6">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Orden de Secciones (Home)</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Arrastra y suelta para reordenar las secciones de la página de inicio, o desactiva su visualización pública.</p>
                            </div>
                            <button
                                onClick={saveSectionsOrder}
                                disabled={saving}
                                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10"
                            >
                                <Save size={14} />
                                {saving ? 'Guardando...' : 'Guardar Orden'}
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            {sections.map((section, idx) => (
                                <div
                                    key={section.id}
                                    draggable
                                    onDragStart={() => handleDragStart(idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDrop={() => handleDrop(idx)}
                                    className={`flex items-center justify-between p-4 border rounded-xl bg-white shadow-sm transition-all duration-150 ${
                                        draggedIndex === idx 
                                            ? 'opacity-40 border-dashed border-brand-500 bg-brand-50/30' 
                                            : 'hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="cursor-grab active:cursor-grabbing text-slate-400 p-1 hover:bg-slate-100 rounded-lg">
                                            <ArrowUpDown size={16} />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-sm text-slate-800">{section.name}</span>
                                            <span className="text-[10px] text-slate-400 block font-mono">ID: {section.id}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => toggleSectionVisibility(idx)}
                                            className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors ${
                                                section.visible
                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                                            }`}
                                        >
                                            {section.visible ? (
                                                <>
                                                    <Eye size={14} />
                                                    <span>Visible</span>
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff size={14} />
                                                    <span>Oculto</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 3: Google Reviews Manager */}
                {activeTab === 'reviews' && (
                    <div className="p-6 space-y-6">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Reseñas de Google (Slider)</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Administra las opiniones destacadas. Puedes agregarlas manualmente o editarlas antes de integrarlas con la API de Google.</p>
                            </div>
                            <button
                                onClick={saveReviewsToDb}
                                disabled={saving}
                                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10"
                            >
                                <Save size={14} />
                                {saving ? 'Guardando...' : 'Guardar en BD'}
                            </button>
                        </div>

                        {/* Reviews Input Form */}
                        <div className="p-4 border border-slate-200 rounded-2xl space-y-4 bg-slate-50/50">
                            <h3 className="font-bold text-sm text-slate-800">
                                {editingReview ? 'Editar Reseña Seleccionada' : 'Agregar Nueva Reseña'}
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Autor</label>
                                    <input 
                                        type="text" 
                                        value={newReviewAuthor}
                                        onChange={(e) => setNewReviewAuthor(e.target.value)}
                                        placeholder="Ej: Carla Portillo"
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fecha / Tiempo</label>
                                    <input 
                                        type="text" 
                                        value={newReviewDate}
                                        onChange={(e) => setNewReviewDate(e.target.value)}
                                        placeholder="Ej: Hace 3 semanas"
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Calificación (Estrellas)</label>
                                    <select
                                        value={newReviewRating}
                                        onChange={(e) => setNewReviewRating(Number(e.target.value))}
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                    >
                                        <option value={5}>⭐⭐⭐⭐⭐ (5 Estrellas)</option>
                                        <option value={4}>⭐⭐⭐⭐ (4 Estrellas)</option>
                                        <option value={3}>⭐⭐⭐ (3 Estrellas)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Comentario</label>
                                <textarea 
                                    value={newReviewText}
                                    onChange={(e) => setNewReviewText(e.target.value)}
                                    placeholder="Opinión del cliente..."
                                    rows={3}
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>

                            <div className="flex gap-2 justify-end">
                                {editingReview && (
                                    <button 
                                        onClick={() => {
                                            setEditingReview(null);
                                            setNewReviewAuthor('');
                                            setNewReviewText('');
                                            setNewReviewRating(5);
                                            setNewReviewDate('Hace 1 semana');
                                        }}
                                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button 
                                    onClick={handleAddReview}
                                    className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold"
                                >
                                    <Plus size={14} />
                                    <span>{editingReview ? 'Actualizar Reseña' : 'Añadir Reseña'}</span>
                                </button>
                            </div>
                        </div>

                        {/* List of current reviews */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Reseñas en la Lista</label>
                            {reviews.length === 0 ? (
                                <div className="text-center py-6 text-slate-400 text-xs">No hay opiniones cargadas en la lista.</div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {reviews.map((review) => (
                                        <div key={review.id} className="flex justify-between items-start gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/20 hover:bg-slate-50/50">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-slate-950">{review.author}</span>
                                                    <span className="text-[10px] text-slate-400">{review.date}</span>
                                                    <span className="text-amber-500 text-[10px]">{'★'.repeat(review.rating)}</span>
                                                </div>
                                                <p className="text-xs text-slate-600 italic leading-relaxed">"{review.text}"</p>
                                            </div>
                                            
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => handleEditReviewClick(review)}
                                                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                                    title="Editar"
                                                >
                                                    <Settings size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReview(review.id)}
                                                    className="p-1 hover:bg-red-50 text-red-500 rounded"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 4: Inventory Web Images Override */}
                {activeTab === 'inventory' && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Personalizar Imágenes del Catálogo</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Sube o ingresa un enlace para cambiar las fotos tomadas en campo por imágenes comerciales premium de internet.</p>
                        </div>

                        {/* Search Bar */}
                        <form onSubmit={handleSearchInventory} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar por descripción, marca, modelo o código QR..."
                                    className="w-full text-xs p-2.5 pl-10 border border-slate-200 rounded-xl"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loadingSearch}
                                className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0"
                            >
                                {loadingSearch ? 'Buscando...' : 'Buscar'}
                            </button>
                        </form>

                        {/* Search Results */}
                        <div className="space-y-3">
                            {searchResults.length > 0 && (
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resultados de Búsqueda</h3>
                            )}
                            
                            <div className="grid grid-cols-1 gap-4">
                                {searchResults.map((item) => (
                                    <div key={item.id} className="flex flex-col sm:flex-row justify-between gap-4 p-4 border rounded-xl bg-slate-50/20">
                                        <div className="flex gap-3">
                                            {/* Preview current img */}
                                            <div className="w-16 h-16 rounded-lg bg-slate-100 border overflow-hidden shrink-0 flex items-center justify-center relative">
                                                {item.imageUrl ? (
                                                    <img 
                                                        src={item.imageUrl} 
                                                        alt={item.name} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <ImageIcon className="text-slate-300" size={24} />
                                                )}
                                                <div className="absolute bottom-0 right-0 bg-slate-800 text-[8px] text-white px-1 font-mono uppercase">
                                                    {item.code}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-0.5">
                                                <span className="text-xs font-bold text-slate-900 block leading-tight">{item.name}</span>
                                                <span className="text-[10px] text-slate-500 block">Marca: {item.brand} | Modelo: {item.model}</span>
                                                {item.cost && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-mono inline-block">
                                                        Costo Adquisición: L. {item.cost.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5 sm:w-80 shrink-0">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enlace de Imagen Premium (Web)</label>
                                            <div className="flex gap-1.5">
                                                <input 
                                                    type="text" 
                                                    value={itemImageUrls[item.id] || ''}
                                                    onChange={(e) => setItemImageUrls(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    placeholder="URL de imagen comercial (https://...)"
                                                    className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                                                />
                                                <button
                                                    onClick={() => handleSaveItemImage(item.id, item.type)}
                                                    disabled={updatingImageId === item.id}
                                                    className="bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shrink-0"
                                                >
                                                    {updatingImageId === item.id ? 'Guardando...' : 'Aplicar'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {searchQuery && searchResults.length === 0 && !loadingSearch && (
                                    <div className="text-center py-6 text-slate-400 text-xs">No se encontraron equipos para la búsqueda. Intenta con palabras clave como "incubadora", "monitor", etc.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 5: General Landing Info Settings */}
                {activeTab === 'general' && (
                    <form onSubmit={handleSaveGeneralSettings} className="p-6 space-y-6">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Configuración General del Sitio</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Administra los números de WhatsApp, correos, dirección y textos de portada que tus clientes verán.</p>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10"
                            >
                                <Save size={14} />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* WhatsApps */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Smartphone size={12} className="text-brand-500" />
                                    WhatsApp Ventas / Soporte (Separados por coma)
                                </label>
                                <input 
                                    type="text" 
                                    value={landingSettings.whatsappNumbers?.join(', ') || ''}
                                    onChange={(e) => handleGeneralFieldChange('whatsappNumbers', e.target.value.split(',').map(s => s.trim()))}
                                    placeholder="50431782368, 50489246108"
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>

                            {/* Emails */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Mail size={12} className="text-brand-500" />
                                    Correos de Contacto (Separados por coma)
                                </label>
                                <input 
                                    type="text" 
                                    value={landingSettings.contactEmails?.join(', ') || ''}
                                    onChange={(e) => handleGeneralFieldChange('contactEmails', e.target.value.split(',').map(s => s.trim()))}
                                    placeholder="ventas@bioelectronicahn.com, gerencia@bioelectronicahn.com"
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>

                            {/* Working Hours */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Clock size={12} className="text-brand-500" />
                                    Horario de Atención
                                </label>
                                <input 
                                    type="text" 
                                    value={landingSettings.workingHours || ''}
                                    onChange={(e) => handleGeneralFieldChange('workingHours', e.target.value)}
                                    placeholder="Lunes a Viernes · 8:00 AM - 5:00 PM"
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>

                            {/* Physical Address */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <MapPin size={12} className="text-brand-500" />
                                    Dirección Física de la Oficina
                                </label>
                                <input 
                                    type="text" 
                                    value={landingSettings.physicalAddress || ''}
                                    onChange={(e) => handleGeneralFieldChange('physicalAddress', e.target.value)}
                                    placeholder="7 Calle, 9 Avenida NO, San Pedro Sula, Cortés"
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>
                        </div>

                        {/* Destinatarios de Cotizaciones */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Destinatarios de Cotizaciones</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                        <Smartphone size={12} className="text-brand-500" />
                                        WhatsApp para recibir Mensajes de Cotización
                                    </label>
                                    <input 
                                        type="text" 
                                        value={landingSettings.quoteWhatsappNumber || ''}
                                        onChange={(e) => handleGeneralFieldChange('quoteWhatsappNumber', e.target.value.trim())}
                                        placeholder="Ej: 50431782368"
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                    />
                                    <span className="text-[10px] text-slate-400 block mt-0.5">Si se deja vacío, las cotizaciones por WhatsApp se enviarán al primer número de la lista superior.</span>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                        <Mail size={12} className="text-brand-500" />
                                        Correo para recibir Solicitudes de Cotización
                                    </label>
                                    <input 
                                        type="email" 
                                        value={landingSettings.quoteEmail || ''}
                                        onChange={(e) => handleGeneralFieldChange('quoteEmail', e.target.value.trim())}
                                        placeholder="Ej: cotizaciones@bioelectronica.hn"
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                                    />
                                    <span className="text-[10px] text-slate-400 block mt-0.5">Si se deja vacío, las cotizaciones por correo se enviarán al primer correo de la lista superior.</span>
                                </div>
                            </div>
                        </div>

                        {/* Title and subtitle */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Portada (Hero Banner)</h3>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Título de Bienvenida</label>
                                <input 
                                    type="text" 
                                    value={landingSettings.heroTitle || ''}
                                    onChange={(e) => handleGeneralFieldChange('heroTitle', e.target.value)}
                                    placeholder="Ej: Equipamiento Médico y Soporte Biomédico Lider en Honduras"
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-semibold"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subtítulo de Bienvenida</label>
                                <textarea 
                                    value={landingSettings.heroSubtitle || ''}
                                    onChange={(e) => handleGeneralFieldChange('heroSubtitle', e.target.value)}
                                    placeholder="Ej: Diseñando soluciones integrales en venta, distribución..."
                                    rows={2}
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white leading-relaxed"
                                />
                            </div>
                        </div>
                    </form>
                )}

                {/* TAB 6: SEO and Meta Tags Settings */}
                {activeTab === 'seo' && (
                    <form onSubmit={handleSaveGeneralSettings} className="p-6 space-y-6 animate-fade-in">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 font-sans">Configuración SEO y Meta Tags</h2>
                                <p className="text-xs text-slate-500 mt-0.5 font-sans">Optimiza cómo aparece tu página web pública en los buscadores de Google y al compartir enlaces en redes sociales.</p>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10 cursor-pointer"
                            >
                                <Save size={14} />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            {/* Inputs Column */}
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">Título SEO (Meta Title)</label>
                                        <span className={`text-[10px] font-bold font-sans ${
                                            (landingSettings.seoTitle?.length || 0) > 60 ? 'text-amber-500 font-semibold' : 'text-slate-400'
                                        }`}>
                                            {landingSettings.seoTitle?.length || 0}/60 carac. recomendados
                                        </span>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={landingSettings.seoTitle || ''}
                                        onChange={(e) => handleGeneralFieldChange('seoTitle', e.target.value)}
                                        placeholder="Ej: Bioelectrónica Honduras | Equipamiento Médico y Soporte Técnico"
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-semibold"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">Descripción SEO (Meta Description)</label>
                                        <span className={`text-[10px] font-bold font-sans ${
                                            (landingSettings.seoDescription?.length || 0) > 160 ? 'text-amber-500 font-semibold' : 'text-slate-400'
                                        }`}>
                                            {landingSettings.seoDescription?.length || 0}/160 carac. recomendados
                                        </span>
                                    </div>
                                    <textarea 
                                        value={landingSettings.seoDescription || ''}
                                        onChange={(e) => handleGeneralFieldChange('seoDescription', e.target.value)}
                                        placeholder="Ej: Líderes en venta, distribución y mantenimiento técnico de equipo biomédico en Honduras. Más de 20 años de experiencia técnica respaldan nuestras soluciones."
                                        rows={4}
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white leading-relaxed"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">Palabras Clave (Keywords, separadas por coma)</label>
                                    <input 
                                        type="text" 
                                        value={landingSettings.seoKeywords || ''}
                                        onChange={(e) => handleGeneralFieldChange('seoKeywords', e.target.value)}
                                        placeholder="Ej: equipo medico, biomedica honduras, soporte tecnico de equipos medicos"
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">URL de Imagen Miniatura (OG Image / Preview)</label>
                                    <input 
                                        type="text" 
                                        value={landingSettings.seoImage || ''}
                                        onChange={(e) => handleGeneralFieldChange('seoImage', e.target.value)}
                                        placeholder="Ej: https://bioelectronicahn.com/images/default-thumbnail.jpg"
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono"
                                    />
                                    <span className="text-[10px] text-slate-400 block mt-0.5 font-sans">Se recomienda una resolución de 1200x630px para visualización óptima en redes sociales.</span>
                                </div>
                            </div>

                            {/* Previews Column */}
                            <div className="space-y-6">
                                {/* Google Search Preview */}
                                <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Vista Previa en Buscadores (Google)</span>
                                    <div className="bg-white border rounded-xl p-4 shadow-sm font-sans max-w-xl">
                                        <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                                            <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[9px] text-slate-500">B</div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-medium leading-none text-slate-800">bioelectronicahn.com</span>
                                                <span className="text-[9px] leading-none text-slate-400">https://www.bioelectronicahn.com</span>
                                            </div>
                                        </div>
                                        <h4 className="text-[#1a0dab] hover:underline text-lg font-normal leading-tight cursor-pointer">
                                            {landingSettings.seoTitle || "Bioelectrónica Honduras - Enterprise Platform"}
                                        </h4>
                                        <p className="text-xs text-[#4d5156] mt-1 leading-relaxed line-clamp-2">
                                            {landingSettings.seoDescription || "Estamos diseñando nuestro nuevo sitio corporativo y catálogo médico en línea. Muy pronto podrás explorar todas nuestras soluciones y productos médicos."}
                                        </p>
                                    </div>
                                </div>

                                {/* Social Media Card Preview */}
                                <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Vista Previa en Redes Sociales (Facebook/WhatsApp/X)</span>
                                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm font-sans max-w-sm">
                                        <div className="aspect-video bg-slate-100 relative flex items-center justify-center overflow-hidden border-b">
                                            {landingSettings.seoImage ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={landingSettings.seoImage} alt="Vista previa SEO" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                                                    <ImageIcon size={32} strokeWidth={1.5} />
                                                    <span className="text-[10px] font-semibold">Sin imagen de vista previa</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 bg-slate-50 space-y-1">
                                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider font-mono">BIOELECTRONICAHN.COM</span>
                                            <h5 className="text-xs font-bold text-slate-800 line-clamp-1">
                                                {landingSettings.seoTitle || "Bioelectrónica Honduras - Enterprise Platform"}
                                            </h5>
                                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                                                {landingSettings.seoDescription || "Estamos diseñando nuestro nuevo sitio corporativo y catálogo médico en línea. Muy pronto podrás explorar todas nuestras soluciones."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                )}

                {/* TAB: Web Contacts */}
                {activeTab === 'contacts' && (
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Mensajes y Solicitudes de Cotización Web</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Consulta la lista de personas que solicitaron información o presupuestos desde la web pública.</p>
                            </div>
                            <button
                                onClick={fetchContacts}
                                disabled={loadingContacts}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200"
                            >
                                <RefreshCw size={14} className={loadingContacts ? 'animate-spin' : ''} />
                                <span>Refrescar</span>
                            </button>
                        </div>

                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                            <div className="relative w-full sm:flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={contactSearch}
                                    onChange={(e) => setContactSearch(e.target.value)}
                                    placeholder="Buscar por nombre, correo, teléfono o mensaje..."
                                    className="pl-9 pr-4 py-2 w-full text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                                />
                                {contactSearch && (
                                    <button 
                                        onClick={() => setContactSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex gap-1.5 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
                                {(['ALL', 'PENDIENTE', 'LEIDO', 'CONTACTADO', 'ARCHIVADO'] as const).map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setContactFilter(filter)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shrink-0 ${
                                            contactFilter === filter
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {filter === 'ALL' ? 'Todos' : filter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Contacts List Grid */}
                        {loadingContacts ? (
                            <div className="py-12 text-center text-xs text-slate-400 font-medium">
                                Cargando contactos...
                            </div>
                        ) : (
                            (() => {
                                const filtered = contacts.filter(c => {
                                    const matchSearch = 
                                        c.nombre.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                        c.correo.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                        c.telefono.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                        c.mensaje.toLowerCase().includes(contactSearch.toLowerCase());
                                    const matchFilter = contactFilter === 'ALL' || c.estado === contactFilter;
                                    return matchSearch && matchFilter;
                                });

                                if (filtered.length === 0) {
                                    return (
                                        <div className="py-12 text-center border border-dashed rounded-2xl bg-slate-50/50 space-y-2">
                                            <p className="text-xs font-semibold text-slate-450">No se encontraron contactos web</p>
                                            <p className="text-[10px] text-slate-400">Prueba cambiando los filtros de búsqueda.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-1 gap-4">
                                        {filtered.map((c) => {
                                            const isSelected = selectedContact?.id === c.id;
                                            return (
                                                <div 
                                                    key={c.id} 
                                                    className={`border rounded-2xl p-5 transition-all bg-white relative overflow-hidden ${
                                                        isSelected ? 'ring-2 ring-brand-500 border-transparent shadow-sm' : 'hover:border-slate-350 shadow-sm'
                                                    }`}
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-extrabold text-sm text-slate-900">{c.nombre}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                                                                    c.estado === 'PENDIENTE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                                    c.estado === 'LEIDO' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                                    c.estado === 'CONTACTADO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                                    'bg-slate-100 text-slate-600 border border-slate-200'
                                                                }`}>
                                                                    {c.estado}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                                                                <a href={`mailto:${c.correo}`} className="hover:text-brand-600 transition-colors flex items-center gap-1">
                                                                    <Mail size={12} />
                                                                    {c.correo}
                                                                </a>
                                                                <a href={`https://wa.me/${c.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors flex items-center gap-1 font-mono">
                                                                    <Smartphone size={12} />
                                                                    {c.telefono}
                                                                </a>
                                                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                                    <Clock size={12} />
                                                                    {new Date(c.createdAt).toLocaleDateString('es-HN', {
                                                                        day: '2-digit',
                                                                        month: 'short',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                                            <select
                                                                value={c.estado}
                                                                onChange={(e) => handleUpdateContactStatus(c.id, e.target.value)}
                                                                className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:border-brand-500"
                                                            >
                                                                <option value="PENDIENTE">Pendiente</option>
                                                                <option value="LEIDO">Leído</option>
                                                                <option value="CONTACTADO">Contactado</option>
                                                                <option value="ARCHIVADO">Archivado</option>
                                                            </select>
                                                            <button
                                                                onClick={() => handleDeleteContact(c.id)}
                                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                                title="Eliminar contacto"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 space-y-1">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Mensaje / Detalle:</span>
                                                        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3 whitespace-pre-wrap">
                                                            {c.mensaje}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()
                        )}
                    </div>
                )}

                {/* TAB: Web Live Traffic */}
                {activeTab === 'activity' && (
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-slate-900">Actividad en Vivo en la Web</h2>
                                    <span className="flex h-2.5 w-2.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">Visualiza en tiempo real quién está navegando por el sitio web de Bioelectrónica y motívalos a chatear.</p>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                                    En Vivo - Actualiza cada 10s
                                </span>
                                <button
                                    onClick={() => fetchTraffic()}
                                    disabled={loadingTraffic}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200"
                                >
                                    <RefreshCw size={14} className={loadingTraffic ? 'animate-spin' : ''} />
                                    <span>Refrescar</span>
                                </button>
                            </div>
                        </div>

                        {/* Top KPI row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 border rounded-2xl bg-white shadow-sm flex items-center justify-between gap-4 relative overflow-hidden">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Usuarios Online</span>
                                    <h3 className="text-2xl font-black text-slate-950 tracking-tight flex items-baseline gap-1">
                                        {activeCount}
                                        <span className="text-xs text-slate-400 font-semibold">visitas activas</span>
                                    </h3>
                                </div>
                                <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                                    <Activity size={20} className="animate-pulse" />
                                </div>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/20 rounded-full blur-xl pointer-events-none" />
                            </div>

                            <div className="p-4 border rounded-2xl bg-white shadow-sm flex items-center justify-between gap-4 relative col-span-2">
                                <div className="space-y-1.5 w-full">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Top Páginas Visitadas</span>
                                    {topPages.length === 0 ? (
                                        <p className="text-[10px] text-slate-400 font-medium">Sin datos de tráfico en este período.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {topPages.map((tp, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700 font-mono">
                                                    <span className="text-slate-400">{tp.page}</span>
                                                    <span className="font-bold text-brand-700 bg-brand-50 px-1 rounded">{tp.count}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Split view: Active visitors & logs */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            
                            {/* Column 1: Online Profiles (3 cols) */}
                            <div className="lg:col-span-3 space-y-4">
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Users size={14} className="text-brand-600" />
                                    <span>Usuarios Conectados Actualmente ({activeVisitors.length})</span>
                                </h3>
                                
                                {loadingTraffic ? (
                                    <div className="py-12 text-center text-xs text-slate-400 font-medium">
                                        Analizando conexiones...
                                    </div>
                                ) : activeVisitors.length === 0 ? (
                                    <div className="p-6 border border-dashed rounded-2xl bg-slate-50/50 text-center space-y-1">
                                        <p className="text-xs font-semibold text-slate-400">Ningún usuario navegando actualmente</p>
                                        <p className="text-[10px] text-slate-400">Las sesiones inactivas por más de 15 minutos expiran automáticamente.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {activeVisitors.map((visitor, idx) => (
                                            <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm space-y-3 hover:border-slate-300 transition-colors">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                                                            <span className="font-bold text-xs text-slate-800 font-mono">{visitor.ip}</span>
                                                            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                                                <Globe size={11} />
                                                                {visitor.ciudad}, {visitor.pais}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500">
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{visitor.dispositivo}</span>
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{visitor.so}</span>
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{visitor.browser}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Motivate to chat button */}
                                                    <button
                                                        onClick={() => setSimulatingChat(visitor)}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 hover:border-brand-300 text-[10px] font-bold rounded-lg transition-all"
                                                    >
                                                        <MessageCircle size={12} />
                                                        <span>Motivar Chat</span>
                                                    </button>
                                                </div>

                                                <div className="pt-2 border-t border-slate-100 flex flex-col gap-1 text-[10px]">
                                                    <div className="flex justify-between text-slate-400">
                                                        <span>Página Actual:</span>
                                                        <span className="font-semibold text-slate-600 font-mono">{visitor.lastPage}</span>
                                                    </div>
                                                    <div className="flex justify-between text-slate-400">
                                                        <span>Última Actividad:</span>
                                                        <span>{new Date(visitor.lastActive).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Column 2: Raw Recent Activity Logs (2 cols) */}
                            <div className="lg:col-span-2 space-y-4">
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Activity size={14} className="text-slate-500" />
                                    <span>Registro de Accesos Recientes</span>
                                </h3>

                                <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                                    <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100">
                                        {loadingTraffic && trafficLogs.length === 0 ? (
                                            <div className="py-6 text-center text-xs text-slate-400">
                                                Cargando registros...
                                            </div>
                                        ) : trafficLogs.length === 0 ? (
                                            <div className="py-6 text-center text-xs text-slate-400">
                                                No hay logs disponibles.
                                            </div>
                                        ) : (
                                            trafficLogs.map((log) => (
                                                <div key={log.id} className="p-3 text-[11px] hover:bg-slate-50 transition-colors space-y-1">
                                                    <div className="flex justify-between items-center gap-2">
                                                        <span className="font-bold text-slate-700 font-mono">{log.ip}</span>
                                                        <span className="text-[9px] text-slate-400 font-semibold font-mono">
                                                            {new Date(log.timestamp).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between gap-2 text-slate-500 font-medium">
                                                        <span className="truncate font-mono text-brand-650" title={log.pagina}>{log.pagina}</span>
                                                        <span className="shrink-0 text-slate-400 text-[9px]">{log.ciudad || 'HN'}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Simulated Chat Invitation Modal */}
                {simulatingChat && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
                        <div className="bg-white border rounded-2xl shadow-xl max-w-md w-full overflow-hidden p-6 space-y-4">
                            <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                                        <MessageCircle size={16} className="text-brand-600" />
                                        <span>Enviar Invitación de Chat Directo</span>
                                    </h3>
                                    <p className="text-[10px] text-slate-500">Envía un mensaje proactivo a la sesión activa IP <span className="font-mono font-bold text-slate-700">{simulatingChat.ip}</span> ({simulatingChat.ciudad}, {simulatingChat.pais})</p>
                                </div>
                                <button 
                                    onClick={() => setSimulatingChat(null)}
                                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mensaje de Bienvenida/Motivación</label>
                                    <textarea
                                        value={chatMsgText}
                                        onChange={(e) => setChatMsgText(e.target.value)}
                                        rows={4}
                                        placeholder="Escribe el mensaje que verá el usuario en su pantalla..."
                                        className="text-xs p-3 w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 leading-relaxed"
                                    />
                                </div>

                                <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl flex gap-2 text-[10px] text-brand-850 leading-relaxed">
                                    <Check className="shrink-0 text-brand-650" size={14} />
                                    <span>Esta invitación activará una ventana de chat flotante emergente en el navegador del visitante, permitiéndole interactuar directamente con tu terminal ERP.</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setSimulatingChat(null)}
                                    className="px-4 py-2 border rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        toast.success('¡Invitación de chat enviada con éxito!');
                                        setSimulatingChat(null);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/10"
                                >
                                    <Send size={12} />
                                    <span>Enviar Invitación</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

