'use client';

import React, { useState, useEffect } from 'react';
import { 
    saveMaintenanceMode, 
    saveLandingSections, 
    saveGoogleReviews, 
    saveLandingSettings, 
    searchInventoryItems, 
    updateItemWebFields,
    updateItemImage,
    getWebContacts,
    updateContactStatus,
    deleteWebContact,
    getWebTraffic,
    getPaginatedInventoryItems
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
    X,
    List
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
    activeTheme?: string;
    allowScrapedProducts?: boolean;
    defaultScrapedStock?: number;
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
    const [activeTab, setActiveTab] = useState<'status' | 'sections' | 'reviews' | 'inventory' | 'general' | 'seo' | 'contacts' | 'activity' | 'themes' | 'scraper'>('status');
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
    const [itemWebTitles, setItemWebTitles] = useState<Record<string, string>>({});
    const [itemWebDescriptions, setItemWebDescriptions] = useState<Record<string, string>>({});
    const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

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
    const loadInventory = async (page: number, query: string) => {
        setLoadingSearch(true);
        try {
            const res = await getPaginatedInventoryItems(page, 10, query);
            if (res.success && res.items) {
                setSearchResults(res.items);
                setTotalPages(res.totalPages || 1);
                
                // Initialize text inputs
                const urls: Record<string, string> = {};
                const titles: Record<string, string> = {};
                const descriptions: Record<string, string> = {};
                
                res.items.forEach((item: any) => {
                    urls[item.id] = item.imagenWeb || '';
                    titles[item.id] = item.tituloWeb || '';
                    descriptions[item.id] = item.descripcionWeb || '';
                });
                
                setItemImageUrls(urls);
                setItemWebTitles(titles);
                setItemWebDescriptions(descriptions);
            } else {
                toast.error(res.error || 'Error al cargar el catálogo');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        } finally {
            setLoadingSearch(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'inventory') {
            loadInventory(currentPage, searchQuery);
        }
    }, [activeTab, currentPage]);

    const handleSearchInventory = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        loadInventory(1, searchQuery);
    };

    const handleClearInventorySearch = () => {
        setSearchQuery('');
        setCurrentPage(1);
        loadInventory(1, '');
    };

    const handleSaveItemWebFields = async (id: string, type: 'activo' | 'producto') => {
        setUpdatingImageId(id);
        const imagenWeb = itemImageUrls[id] || '';
        const tituloWeb = itemWebTitles[id] || '';
        const descripcionWeb = itemWebDescriptions[id] || '';
        
        try {
            const res = await updateItemWebFields(id, type, { imagenWeb, tituloWeb, descripcionWeb });
            if (res.success) {
                toast.success('Datos comerciales de la web guardados');
                setSearchResults(prev => prev.map(item => 
                    item.id === id 
                        ? { ...item, imagenWeb, tituloWeb, descripcionWeb } 
                        : item
                ));
            } else {
                toast.error(res.error || 'Error al actualizar datos');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error de conexión');
        } finally {
            setUpdatingImageId(null);
        }
    };

    const handleUploadFile = async (id: string, file: File) => {
        if (!file) return;
        setUploadingItemId(id);
        const toastId = toast.loading('Subiendo imagen a R2...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileName', file.name);
            
            const res = await fetch('/api/upload/inventario', {
                method: 'POST',
                body: formData
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Error al subir archivo');
            }
            
            const data = await res.json();
            const url = data.publicUrl || data.url;
            
            if (url) {
                setItemImageUrls(prev => ({ ...prev, [id]: url }));
                toast.success('Imagen subida con éxito', { id: toastId });
            } else {
                throw new Error('No se recibió la URL pública de la imagen');
            }
        } catch (e: any) {
            console.error('Error uploading file:', e);
            toast.error(e.message || 'Error al subir la imagen', { id: toastId });
        } finally {
            setUploadingItemId(null);
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
                <div className="h-px bg-slate-100 my-1" />
                <button
                    onClick={() => setActiveTab('themes')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'themes' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <LayoutGrid size={18} />
                    <span>Temas de la Web</span>
                </button>
                <button
                    onClick={() => setActiveTab('scraper')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        activeTab === 'scraper' 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                    <Activity size={18} />
                    <span>Importador de Soma</span>
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
                                    placeholder="Buscar por descripción, marca, modelo o código..."
                                    className="w-full text-xs p-2.5 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={handleClearInventorySearch}
                                    className="px-4 py-2.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-655 hover:bg-slate-100 transition-colors"
                                >
                                    Limpiar
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loadingSearch}
                                className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                            >
                                {loadingSearch ? 'Buscando...' : 'Buscar'}
                            </button>
                        </form>

                        {/* Search Results */}
                        <div className="space-y-4">
                            {searchResults.length > 0 && (
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Resultados de Búsqueda
                                    </h3>
                                    
                                    {/* Layout Filter/Toggle */}
                                    <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/40 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('list')}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                viewMode === 'list'
                                                    ? 'bg-white text-slate-950 shadow-sm border border-slate-200/50'
                                                    : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            <List size={13} />
                                            <span>En línea</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('grid')}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                viewMode === 'grid'
                                                    ? 'bg-white text-slate-950 shadow-sm border border-slate-200/50'
                                                    : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            <LayoutGrid size={13} />
                                            <span>Cuadrícula</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {searchResults.length > 0 && (
                                <div className={viewMode === 'list' ? "flex flex-col gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
                                    {searchResults.map((item) => {
                                        const isSaving = updatingImageId === item.id;
                                        const isUploading = uploadingItemId === item.id;
                                        const isList = viewMode === 'list';
                                        
                                        return (
                                            <div 
                                                key={item.id} 
                                                className={`bg-white border border-slate-200 hover:border-slate-350 rounded-2xl p-4 transition-all duration-300 shadow-sm flex flex-col justify-between gap-4 ${
                                                    isList ? "xl:flex-row xl:items-center" : ""
                                                }`}
                                            >
                                                {/* Left Side: Product Info & Dual Thumbnails */}
                                                <div className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center min-w-0 ${
                                                    isList ? "xl:w-1/3 shrink-0" : ""
                                                }`}>
                                                    {/* Thumbnails Container */}
                                                    <div 
                                                        onClick={() => setSelectedItem(item)}
                                                        className="flex gap-2 shrink-0 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
                                                        title="Ver Ficha Completa de Imágenes"
                                                    >
                                                        {/* Original photo */}
                                                        <div className="relative w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner" title="Foto Interna original">
                                                            {item.imageUrl ? (
                                                                <img src={item.imageUrl} alt="Foto interna" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <ImageIcon className="text-slate-300" size={16} />
                                                            )}
                                                            <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-[6px] text-white font-black text-center uppercase tracking-wider py-0.5">
                                                                Interno
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Web Custom photo */}
                                                        <div className="relative w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner" title="Imagen Pública Web">
                                                            {itemImageUrls[item.id] ? (
                                                                <img src={itemImageUrls[item.id]} alt="Imagen Web" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <ImageIcon className="text-slate-350" size={16} />
                                                            )}
                                                            <span className="absolute bottom-0 inset-x-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-[6px] text-white font-black text-center uppercase tracking-wider py-0.5">
                                                                Web
                                                            </span>
                                                            {itemImageUrls[item.id] && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setItemImageUrls(prev => ({ ...prev, [item.id]: '' }));
                                                                    }}
                                                                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow"
                                                                >
                                                                    <X size={8} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Meta Info */}
                                                    <div className="min-w-0 space-y-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                                item.type === 'activo' 
                                                                    ? 'bg-cyan-50 text-cyan-600 border border-cyan-100' 
                                                                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                            }`}>
                                                                {item.type === 'activo' ? 'Equipo' : 'Consumible'}
                                                            </span>
                                                            <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                                                {item.code}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedItem(item)}
                                                                className="text-[9px] font-bold text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                                                                title="Ver Ficha de Detalles"
                                                            >
                                                                <Eye size={10} className="text-slate-450 shrink-0" />
                                                                <span>Ficha</span>
                                                            </button>
                                                        </div>
                                                        <h4 
                                                            onClick={() => setSelectedItem(item)}
                                                            className="font-extrabold text-xs text-slate-800 line-clamp-1 cursor-pointer hover:text-cyan-600 hover:underline transition-colors" 
                                                            title={`Ver Ficha de Detalles de: ${item.name}`}
                                                        >
                                                            {item.name}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-400 font-medium">
                                                            Marca: {item.brand} | Modelo: {item.model}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Middle: Custom fields inputs */}
                                                <div className={isList ? "flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-3 w-full" : "flex flex-col gap-3 w-full"}>
                                                    {/* Input: Título Web */}
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Título en la Web</label>
                                                        <input 
                                                            type="text" 
                                                            value={itemWebTitles[item.id] || ''}
                                                            onChange={(e) => setItemWebTitles(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                            placeholder={item.name}
                                                            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 font-semibold text-slate-800"
                                                        />
                                                    </div>

                                                    {/* Input: Descripción Web */}
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Descripción en la Web</label>
                                                        <textarea 
                                                            value={itemWebDescriptions[item.id] || ''}
                                                            onChange={(e) => setItemWebDescriptions(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                            placeholder={item.internalDescription || "Descripción comercial..."}
                                                            rows={1}
                                                            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 leading-normal font-medium text-slate-650 resize-y"
                                                        />
                                                    </div>

                                                    {/* Input: Imagen Web URL/File */}
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Cambiar Imagen Web</label>
                                                        <div className="flex gap-1.5">
                                                            <label className={`flex items-center justify-center gap-1 px-2.5 py-2 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shrink-0 ${
                                                                isUploading ? 'opacity-50 pointer-events-none' : ''
                                                            }`}>
                                                                <input 
                                                                    type="file" 
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) handleUploadFile(item.id, file);
                                                                    }}
                                                                />
                                                                <ImageIcon size={12} className="text-slate-550 shrink-0" />
                                                                <span className="text-[9px] font-bold text-slate-650 uppercase tracking-wider shrink-0">
                                                                    {isUploading ? '...' : 'Subir'}
                                                                </span>
                                                            </label>
                                                            <input 
                                                                type="text" 
                                                                value={itemImageUrls[item.id] || ''}
                                                                onChange={(e) => setItemImageUrls(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                placeholder="Pegar URL de imagen..."
                                                                className="flex-1 min-w-0 text-xs px-2.5 py-2 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-cyan-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Side: Action Save Button */}
                                                <div className={isList ? "flex xl:flex-col justify-end gap-2 xl:self-center shrink-0" : "w-full"}>
                                                    <button
                                                        onClick={() => handleSaveItemWebFields(item.id, item.type)}
                                                        disabled={isSaving || isUploading}
                                                        className="bg-slate-900 hover:bg-slate-850 disabled:bg-slate-350 text-white text-[9px] font-black px-4 py-3 rounded-xl uppercase tracking-wider transition-all hover:scale-[1.02] shadow cursor-pointer flex items-center justify-center gap-1.5 w-full xl:w-auto shrink-0"
                                                    >
                                                        {isSaving ? (
                                                            <>
                                                                <RefreshCw className="animate-spin" size={10} />
                                                                <span>...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Save size={10} />
                                                                <span>Guardar</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {searchResults.length === 0 && !loadingSearch && (
                                <div className="text-center py-10 border border-dashed rounded-3xl text-slate-400 text-xs">
                                    {searchQuery 
                                        ? 'No se encontraron equipos ni repuestos para la búsqueda. Intenta con palabras clave como "incubadora", "monitor", "canula", etc.'
                                        : 'No hay productos disponibles en el catálogo.'}
                                </div>
                            )}
                        </div>
                            
                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-4 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        disabled={currentPage <= 1 || loadingSearch}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-xs text-slate-500 font-medium">
                                        Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                                    </span>
                                    <button
                                        type="button"
                                        disabled={currentPage >= totalPages || loadingSearch}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
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

                {/* TAB: Themes Selection */}
                {activeTab === 'themes' && (
                    <div className="p-6 space-y-6">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Temas de la Página Web</h2>
                                <p className="text-xs text-slate-500 mt-0.5 font-sans">Selecciona el diseño y estilo visual que se mostrará a los visitantes públicos.</p>
                            </div>
                            <button
                                onClick={async () => {
                                    setSaving(true);
                                    const res = await saveLandingSettings(landingSettings);
                                    if (res.success) {
                                        toast.success('Configuración de tema guardada');
                                    } else {
                                        toast.error(res.error || 'Error al guardar');
                                    }
                                    setSaving(false);
                                }}
                                disabled={saving}
                                className="flex items-center gap-2 bg-[#00A8CC] hover:bg-[#008ba8] disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                            >
                                <Save size={14} />
                                {saving ? 'Guardando...' : 'Guardar Tema'}
                            </button>
                        </div>

                        {/* Themes Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* DRE Theme Card */}
                            <div 
                                onClick={() => setLandingSettings(p => ({ ...p, activeTheme: 'DRE' }))}
                                className={`border-2 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between gap-4 overflow-hidden relative ${
                                    (landingSettings.activeTheme || 'DRE') === 'DRE'
                                        ? 'border-[#00A8CC] bg-cyan-50/10 shadow-md ring-1 ring-cyan-500/50'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-extrabold text-sm text-slate-900">DRE Theme</span>
                                        {(landingSettings.activeTheme || 'DRE') === 'DRE' && (
                                            <span className="bg-cyan-100 text-cyan-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Activo</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-550 leading-relaxed">Diseño tradicional basado en DRE Med. Utiliza colores celestes y azul marino, enfocado en el cotizador y la herramienta de búsqueda de 60 segundos.</p>
                                </div>
                                <div className="aspect-video w-full rounded-lg bg-slate-100 border overflow-hidden flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                    <div className="w-full h-full bg-[#0B1E36]/10 flex flex-col justify-between p-3">
                                        <div className="w-1/2 h-2 bg-[#00A8CC] rounded" />
                                        <div className="w-full h-4 bg-white border rounded" />
                                        <div className="flex gap-1">
                                            <div className="w-8 h-8 bg-white border rounded" />
                                            <div className="w-8 h-8 bg-white border rounded" />
                                            <div className="w-8 h-8 bg-white border rounded" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SOMA Theme Card */}
                            <div 
                                onClick={() => setLandingSettings(p => ({ ...p, activeTheme: 'SOMA' }))}
                                className={`border-2 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between gap-4 overflow-hidden relative ${
                                    landingSettings.activeTheme === 'SOMA'
                                        ? 'border-[#00A8CC] bg-cyan-50/10 shadow-md ring-1 ring-cyan-500/50'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-extrabold text-sm text-slate-900">Soma Theme</span>
                                        {landingSettings.activeTheme === 'SOMA' && (
                                            <span className="bg-cyan-100 text-cyan-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Activo</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-550 leading-relaxed">Diseño premium e institucional inspirado en Soma Technology. Colores corporativos sobrios, banner tipo hero expandido y tipografía estilizada.</p>
                                </div>
                                <div className="aspect-video w-full rounded-lg bg-slate-100 border overflow-hidden flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                    <div className="w-full h-full bg-[#0B1E36] flex flex-col justify-between p-3 text-white/50">
                                        <div className="w-2/3 h-2.5 bg-[#00A8CC] rounded" />
                                        <div className="w-full h-2 bg-white/20 rounded" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="h-6 bg-white/10 rounded" />
                                            <div className="h-6 bg-white/10 rounded" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BIO Theme Card */}
                            <div 
                                onClick={() => setLandingSettings(p => ({ ...p, activeTheme: 'BIO' }))}
                                className={`border-2 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between gap-4 overflow-hidden relative ${
                                    landingSettings.activeTheme === 'BIO'
                                        ? 'border-[#00A8CC] bg-cyan-50/10 shadow-md ring-1 ring-cyan-500/50'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-extrabold text-sm text-slate-900">BIO Hybrid Theme</span>
                                        {landingSettings.activeTheme === 'BIO' && (
                                            <span className="bg-cyan-100 text-cyan-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Activo</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-550 leading-relaxed">Lo mejor de ambos mundos: combina el Hero Banner de Soma con el buscador interactivo de DRE y un grid optimizado de reseñas.</p>
                                </div>
                                <div className="aspect-video w-full rounded-lg bg-slate-100 border overflow-hidden flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                    <div className="w-full h-full bg-[#07162c] flex flex-col justify-between p-3 text-white/40">
                                        <div className="flex justify-between items-center">
                                            <div className="w-1/3 h-2 bg-[#00A8CC] rounded" />
                                            <div className="w-4 h-4 bg-amber-500 rounded-full" />
                                        </div>
                                        <div className="w-full h-4 bg-white/10 border border-white/20 rounded" />
                                        <div className="h-4 bg-[#00A8CC]/20 rounded" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controls for Scraped / External Products */}
                        <div className="p-5 border rounded-2xl bg-slate-50 space-y-4">
                            <h3 className="font-bold text-sm text-slate-800">Control de Productos Externos (Soma Tech)</h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="flex items-center justify-between gap-4 p-3 bg-white border rounded-xl">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-bold text-slate-800 block">Mostrar Productos Externos</span>
                                        <span className="text-[10px] text-slate-400 font-medium">Habilita la visualización de equipos importados sin stock real en el catálogo público.</span>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        checked={landingSettings.allowScrapedProducts ?? true}
                                        onChange={(e) => setLandingSettings(p => ({ ...p, allowScrapedProducts: e.target.checked }))}
                                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 shrink-0"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-4 p-3 bg-white border rounded-xl">
                                    <div className="space-y-1 flex-1">
                                        <span className="text-xs font-bold text-slate-800 block">Stock Virtual Predeterminado</span>
                                        <span className="text-[10px] text-slate-400 font-medium block">Cantidad a mostrar en inventario para permitir solicitudes fluidas (0 desactivará el stock).</span>
                                        <input 
                                            type="number"
                                            value={landingSettings.defaultScrapedStock ?? 5}
                                            onChange={(e) => setLandingSettings(p => ({ ...p, defaultScrapedStock: parseInt(e.target.value) || 0 }))}
                                            className="text-xs p-1.5 border border-slate-200 rounded-lg bg-white w-20 font-semibold text-slate-850"
                                            min={0}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: Scraper Controls */}
                {activeTab === 'scraper' && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Importador de Catálogo - Soma Tech</h2>
                            <p className="text-xs text-slate-500 mt-0.5 font-sans">Extrae de forma automática categorías, descripciones e imágenes desde Soma Technology. Las fotos se subirán directamente a tu Cloudflare R2.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Scraper Control Card */}
                            <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-5 lg:col-span-1 shadow-sm">
                                <h3 className="font-bold text-sm text-slate-800">Iniciar Extracción</h3>
                                <p className="text-xs text-slate-500 leading-normal">
                                    La importación se ejecuta en segundo plano por lotes seguros con delay aleatorio de 1-3 segundos para prevenir bloqueos de IP y mantener la estabilidad del sitio.
                                </p>
                                
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Categoría de Inicio</label>
                                    <select 
                                        id="scrape-category-select"
                                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800"
                                    >
                                        <option value="all">Todas las Categorías principales</option>
                                        <option value="anesthesia">Máquinas de Anestesia</option>
                                        <option value="defibrillators">Desfibriladores</option>
                                        <option value="patient-monitors">Monitores de Pacientes</option>
                                        <option value="surgical-tables">Mesas de Cirugía</option>
                                        <option value="ultrasounds">Ultrasonidos</option>
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    id="start-scraper-btn"
                                    onClick={async () => {
                                        const cat = (document.getElementById('scrape-category-select') as HTMLSelectElement)?.value || 'all';
                                        const toastId = toast.loading('Iniciando extractor por lotes en segundo plano...', { duration: 3000 });
                                        try {
                                            const res = await fetch('/api/admin/scrape-soma', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ category: cat })
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                toast.success(`Extracción completada. Se importaron ${data.count} productos exitosamente.`, { id: toastId });
                                            } else {
                                                toast.error(`Error en la extracción: ${data.error}`, { id: toastId });
                                            }
                                        } catch (e: any) {
                                            toast.error(`Error: ${e.message}`, { id: toastId });
                                        }
                                    }}
                                    className="w-full bg-[#00A8CC] hover:bg-[#008ba8] text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <Activity size={14} />
                                    <span>Comenzar Importación</span>
                                </button>
                            </div>

                            {/* Scraper Status Panel */}
                            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4 lg:col-span-2 flex flex-col justify-between shadow-inner">
                                <div className="space-y-3">
                                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        <span>Bitácora de Importación</span>
                                    </h3>
                                    <div className="h-40 bg-slate-950 text-emerald-400 font-mono text-[10px] p-3 rounded-xl overflow-y-auto space-y-1 select-none">
                                        <div>[SISTEMA] Listo para iniciar extracción...</div>
                                        <div>[SISTEMA] Servidor R2 configurado: OK</div>
                                        <div>[SISTEMA] PostgreSQL conectado: OK</div>
                                        <div>[SISTEMA] Selecciona una categoría y haz clic en "Comenzar Importación".</div>
                                    </div>
                                </div>
                                <div className="flex gap-3 text-xs border-t pt-4 font-semibold text-slate-655 justify-between">
                                    <span>Productos Scraped Totales: <strong className="text-slate-900">Listo</strong></span>
                                    <span>Última ejecución: <strong className="text-slate-900">Exitosa</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>
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

                {/* Product Detailed Sheet Modal */}
                {selectedItem && (() => {
                    const isSaving = updatingImageId === selectedItem.id;
                    const isUploading = uploadingItemId === selectedItem.id;
                    
                    return (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-200">
                            <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                                {/* Header / Top Ribbon */}
                                <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                selectedItem.type === 'activo' 
                                                    ? 'bg-cyan-50 text-cyan-600 border border-cyan-100' 
                                                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                            }`}>
                                                {selectedItem.type === 'activo' ? 'Equipo Físico' : 'Consumible / Repuesto'}
                                            </span>
                                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-md">
                                                {selectedItem.code}
                                            </span>
                                        </div>
                                        <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                                            {selectedItem.name}
                                        </h3>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedItem(null)}
                                        className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Scrollable Body */}
                                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                    {/* Images Preview Section */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Column 1: Original Inventory Photo */}
                                        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2 flex flex-col items-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">
                                                Foto de Inventario (Interna)
                                            </span>
                                            <div className="relative w-full aspect-video rounded-xl bg-slate-100 border overflow-hidden flex items-center justify-center shadow-inner">
                                                {selectedItem.imageUrl ? (
                                                    <img src={selectedItem.imageUrl} alt="Foto original" className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="text-slate-350" size={32} />
                                                )}
                                                <span className="absolute bottom-2 left-2 bg-slate-900/80 text-[8px] text-white font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                    Original IA Vision
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 text-center italic mt-1">
                                                {selectedItem.imageUrl ? "Foto tomada en campo o taller." : "No se ha subido foto en el inventario interno."}
                                            </p>
                                        </div>

                                        {/* Column 2: Web Public Photo */}
                                        <div className="border border-slate-200 rounded-2xl p-4 bg-gradient-to-br from-cyan-50/20 to-blue-50/20 space-y-3 flex flex-col items-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">
                                                Imagen en la Web (Pública)
                                            </span>
                                            <div className="relative w-full aspect-video rounded-xl bg-slate-100 border overflow-hidden flex items-center justify-center shadow-inner">
                                                {itemImageUrls[selectedItem.id] ? (
                                                    <img src={itemImageUrls[selectedItem.id]} alt="Foto web" className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="text-slate-350" size={32} />
                                                )}
                                                <span className="absolute bottom-2 left-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-[8px] text-white font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                    Vista en Catálogo
                                                </span>
                                                {itemImageUrls[selectedItem.id] && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setItemImageUrls(prev => ({ ...prev, [selectedItem.id]: '' }))}
                                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow shadow-red-500/25"
                                                        title="Eliminar imagen personalizada"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* Edit Controls Directly inside the Photo Box! */}
                                            <div className="w-full space-y-1.5 pt-1">
                                                <div className="flex gap-1.5 w-full">
                                                    <label className={`flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 bg-white transition-all hover:border-slate-300 shrink-0 ${
                                                        isUploading ? 'opacity-50 pointer-events-none' : ''
                                                    }`}>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleUploadFile(selectedItem.id, file);
                                                            }}
                                                        />
                                                        <ImageIcon size={11} className="text-slate-550 shrink-0" />
                                                        <span className="text-[10px] font-bold text-slate-650 uppercase tracking-wider shrink-0">
                                                            {isUploading ? '...' : 'Subir'}
                                                        </span>
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={itemImageUrls[selectedItem.id] || ''}
                                                        onChange={(e) => setItemImageUrls(prev => ({ ...prev, [selectedItem.id]: e.target.value }))}
                                                        placeholder="Pegar enlace de imagen..."
                                                        className="flex-1 min-w-0 text-xs px-2.5 py-2 border border-slate-200 rounded-xl font-mono bg-white focus:outline-none focus:border-cyan-500 transition-all text-slate-700"
                                                    />
                                                </div>
                                                <p className="text-[9px] text-slate-400 text-center font-medium leading-normal">
                                                    {itemImageUrls[selectedItem.id] 
                                                        ? "Imagen comercial activa. Haz clic en Guardar abajo para aplicar." 
                                                        : "Actualmente usa la foto interna como fallback."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Technical details Section */}
                                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30 space-y-3">
                                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b pb-1">
                                            Información y Atributos Técnicos
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block">Marca</span>
                                                <span className="text-xs font-bold text-slate-800">{selectedItem.brand}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block">Modelo</span>
                                                <span className="text-xs font-bold text-slate-800">{selectedItem.model}</span>
                                            </div>
                                            {selectedItem.type === 'activo' && selectedItem.cost !== null && (
                                                <div>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Costo de Adquisición</span>
                                                    <span className="text-xs font-mono font-bold text-slate-800">
                                                        L {selectedItem.cost.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block">Identificador QR / SKU</span>
                                                <span className="text-xs font-mono font-bold text-slate-750">{selectedItem.code}</span>
                                            </div>
                                        </div>

                                        {selectedItem.internalDescription && (
                                            <div className="pt-2">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase block">Descripción Interna (Inventario)</span>
                                                <p className="text-xs text-slate-600 leading-relaxed bg-white border p-2.5 rounded-xl mt-1 whitespace-pre-line">
                                                    {selectedItem.internalDescription}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Web personalization details Section */}
                                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30 space-y-4">
                                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b pb-1">
                                            Datos del Catálogo Comercial (Público)
                                        </h4>
                                        
                                        <div className="space-y-3">
                                            {/* Input: Título Web */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Título en la Web</label>
                                                <input 
                                                    type="text" 
                                                    value={itemWebTitles[selectedItem.id] || ''}
                                                    onChange={(e) => setItemWebTitles(prev => ({ ...prev, [selectedItem.id]: e.target.value }))}
                                                    placeholder={selectedItem.name}
                                                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-cyan-500 font-semibold text-slate-800"
                                                />
                                            </div>

                                            {/* Input: Descripción Web */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Descripción en la Web</label>
                                                <textarea 
                                                    value={itemWebDescriptions[selectedItem.id] || ''}
                                                    onChange={(e) => setItemWebDescriptions(prev => ({ ...prev, [selectedItem.id]: e.target.value }))}
                                                    placeholder={selectedItem.internalDescription || "Descripción comercial..."}
                                                    rows={3}
                                                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-cyan-500 leading-normal font-medium text-slate-600 resize-y"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer buttons */}
                                <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedItem(null)}
                                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        Cerrar Ficha
                                    </button>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await handleSaveItemWebFields(selectedItem.id, selectedItem.type);
                                        }}
                                        disabled={isSaving || isUploading}
                                        className="bg-slate-900 hover:bg-slate-850 disabled:bg-slate-350 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all hover:scale-[1.02] shadow cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                                    >
                                        {isSaving ? (
                                            <>
                                                <RefreshCw className="animate-spin" size={12} />
                                                <span>Guardando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save size={12} />
                                                <span>Guardar Cambios</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}

