'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Plus, Search, QrCode, ExternalLink, Edit2, Trash2, 
    Download, Eye, UserPlus, Image as ImageIcon, Sparkles, 
    Upload, Camera, ArrowLeft, Mail, Phone, Briefcase, FileSpreadsheet, X,
    Linkedin, Globe
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { saveDigitalCard, deleteDigitalCard } from './actions';
import QRCode from 'react-qr-code';

interface OrganizationUser {
    id: string;
    nombre: string | null;
    apellido: string | null;
    email: string;
    puesto: string | null;
    phoneNumber: string | null;
}

interface DigitalCard {
    id: string;
    userId: string;
    organizationId: string;
    slug: string;
    nombre: string;
    apellido: string;
    puesto?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    theme: string;
    colorTheme: string;
    whatsappEnabled: boolean;
    whatsappNumber?: string | null;
    linkedinUrl?: string | null;
    websiteUrl?: string | null;
    instagramUrl?: string | null;
    facebookUrl?: string | null;
    leadFormEnabled: boolean;
    views: number;
    user: {
        nombre: string | null;
        apellido: string | null;
        email: string;
    };
    leads: any[];
}

interface Lead {
    id: string;
    cardId: string;
    nombre: string;
    empresa?: string | null;
    telefono?: string | null;
    email?: string | null;
    notas?: string | null;
    createdAt: Date | string;
    card: {
        nombre: string;
        apellido: string;
        slug: string;
    };
}

interface TarjetasClientProps {
    initialCards: any[];
    initialLeads: any[];
    organizationUsers: OrganizationUser[];
}

const THEME_OPTIONS = [
    { value: 'modern', label: 'Moderno (Luminoso)', desc: 'Fondo limpio con acentos de color vibrantes' },
    { value: 'dark', label: 'Dark Mode (Oscuro)', desc: 'Diseño elegante con brillos violetas nocturnos' },
    { value: 'neon', label: 'Cyber Neon (Futurista)', desc: 'Estética de terminal hacker con luces cian y verde' },
    { value: 'glass', label: 'Glassmorphic (Vidrio Templado)', desc: 'Aspecto transparente esmerilado con fondo degradado blur' }
];

const COLOR_OPTIONS = [
    { value: 'blue-600', bg: 'bg-blue-600', label: 'Azul Bio' },
    { value: 'purple-600', bg: 'bg-purple-600', label: 'Púrpura' },
    { value: 'emerald-600', bg: 'bg-emerald-600', label: 'Esmeralda' },
    { value: 'rose-600', bg: 'bg-rose-600', label: 'Rosa' },
    { value: 'amber-600', bg: 'bg-amber-600', label: 'Ámbar' },
    { value: 'slate-800', bg: 'bg-slate-800', label: 'Gris Grafito' }
];

export default function TarjetasClient({ 
    initialCards, 
    initialLeads, 
    organizationUsers 
}: TarjetasClientProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'tarjetas' | 'leads' | 'nueva'>('tarjetas');
    const [cards, setCards] = useState<DigitalCard[]>(initialCards);
    const [leads, setLeads] = useState<Lead[]>(initialLeads);
    const [searchQuery, setSearchQuery] = useState('');
    const [leadsSearchQuery, setLeadsSearchQuery] = useState('');
    
    // Modal states
    const [previewCard, setPreviewCard] = useState<DigitalCard | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    // Form states
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [slug, setSlug] = useState('');
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [puesto, setPuesto] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [theme, setTheme] = useState('modern');
    const [colorTheme, setColorTheme] = useState('blue-600');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [whatsappEnabled, setWhatsappEnabled] = useState(true);
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [instagramUrl, setInstagramUrl] = useState('');
    const [facebookUrl, setFacebookUrl] = useState('');
    const [leadFormEnabled, setLeadFormEnabled] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Filter cards and leads
    const filteredCards = cards.filter(card => {
        const fullName = `${card.nombre} ${card.apellido}`.toLowerCase();
        const emailMatch = card.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
        const slugMatch = card.slug.toLowerCase().includes(searchQuery.toLowerCase());
        return fullName.includes(searchQuery.toLowerCase()) || emailMatch || slugMatch;
    });

    const filteredLeads = leads.filter(lead => {
        const clientName = lead.nombre.toLowerCase();
        const companyMatch = lead.empresa?.toLowerCase().includes(leadsSearchQuery.toLowerCase()) ?? false;
        const techMatch = `${lead.card.nombre} ${lead.card.apellido}`.toLowerCase().includes(leadsSearchQuery.toLowerCase());
        return clientName.includes(leadsSearchQuery.toLowerCase()) || companyMatch || techMatch;
    });

    // Populate user profile info upon selecting organization user
    const handleUserSelect = (userId: string) => {
        setSelectedUserId(userId);
        const user = organizationUsers.find(u => u.id === userId);
        if (user) {
            setNombre(user.nombre || '');
            setApellido(user.apellido || '');
            setPuesto(user.puesto || '');
            setPhoneNumber(user.phoneNumber || '');
            setEmail(user.email || '');
            
            // Auto generate slug
            const baseSlug = `${user.nombre || ''}-${user.apellido || ''}`
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-');
            setSlug(baseSlug);
        }
    };

    // Upload image to Cloudflare R2
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Selecciona una imagen válida.');
            return;
        }

        setIsUploading(true);
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type,
                }),
            });

            if (!response.ok) throw new Error('Error solicitando URL de subida');

            const { uploadUrl, publicUrl } = await response.json();

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
            });

            if (!uploadResponse.ok) throw new Error('Error subiendo imagen a R2');

            setAvatarUrl(publicUrl);
            toast.success('¡Foto de perfil subida exitosamente!');
        } catch (error) {
            console.error(error);
            toast.error('Error al subir la imagen.');
        } finally {
            setIsUploading(false);
        }
    };

    // AI vision card scanner trigger
    const handleCardScanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        const scanToast = toast.loading('Subiendo imagen de tarjeta...');
        try {
            // Upload picture to R2 first
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type,
                }),
            });

            if (!response.ok) throw new Error('Error de subida R2');
            const { uploadUrl, publicUrl } = await response.json();

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
            });

            if (!uploadResponse.ok) throw new Error('Error de transferencia R2');

            // Send R2 image URL to vision scanner
            toast.loading('Analizando tarjeta con Claude Vision...', { id: scanToast });
            const scanResponse = await fetch('/api/tarjetas/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: publicUrl })
            });

            if (!scanResponse.ok) throw new Error('Error analizando la imagen.');

            const data = await scanResponse.json();

            // Populate form fields
            if (data.nombre) setNombre(data.nombre);
            if (data.apellido) setApellido(data.apellido);
            if (data.puesto) setPuesto(data.puesto);
            if (data.telefono) setPhoneNumber(data.telefono);
            if (data.email) setEmail(data.email);
            if (data.bio) setBio(data.bio);
            if (data.websiteUrl) setWebsiteUrl(data.websiteUrl);
            if (data.linkedinUrl) setLinkedinUrl(data.linkedinUrl);
            if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
            
            toast.success('¡Extracción completada! Datos importados al formulario.', { id: scanToast });
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al escanear la tarjeta', { id: scanToast });
        } finally {
            setIsScanning(false);
        }
    };

    // Save Digital Card Profile
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) {
            toast.error('Selecciona un empleado de la organización');
            return;
        }

        if (!slug) {
            toast.error('El slug es obligatorio');
            return;
        }

        setIsSaving(true);
        try {
            const result = await saveDigitalCard({
                id: editingCardId || undefined,
                userId: selectedUserId,
                slug,
                nombre,
                apellido,
                puesto,
                phoneNumber,
                email,
                bio,
                avatarUrl,
                theme,
                colorTheme,
                whatsappEnabled,
                whatsappNumber,
                linkedinUrl,
                websiteUrl,
                instagramUrl,
                facebookUrl,
                leadFormEnabled
            });

            if (result.success) {
                toast.success(editingCardId ? '¡Tarjeta actualizada!' : '¡Tarjeta creada con éxito!');
                
                // Refresh list
                const updatedResponse = await fetch(`/api/upload`); // Dummy fetch to trigger refresh context or just reload
                router.refresh();
                
                // Reset states
                resetForm();
                setActiveTab('tarjetas');
                window.location.reload(); // Hard reload to grab newly populated DB dataset
            }
        } catch (err: any) {
            toast.error(err.message || 'Error al guardar la tarjeta');
        } finally {
            setIsSaving(false);
        }
    };

    // Delete Digital Card
    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar permanentemente esta tarjeta digital?')) return;

        try {
            const res = await deleteDigitalCard(id);
            if (res.success) {
                toast.success('Tarjeta digital eliminada correctamente.');
                setCards(cards.filter(c => c.id !== id));
                router.refresh();
            }
        } catch (err: any) {
            toast.error(err.message || 'No se pudo eliminar la tarjeta.');
        }
    };

    // Edit button click logic
    const startEdit = (card: DigitalCard) => {
        setEditingCardId(card.id);
        setSelectedUserId(card.userId);
        setSlug(card.slug);
        setNombre(card.nombre);
        setApellido(card.apellido);
        setPuesto(card.puesto || '');
        setPhoneNumber(card.phoneNumber || '');
        setEmail(card.email || '');
        setBio(card.bio || '');
        setAvatarUrl(card.avatarUrl || '');
        setTheme(card.theme);
        setColorTheme(card.colorTheme);
        setWhatsappEnabled(card.whatsappEnabled);
        setWhatsappNumber(card.whatsappNumber || '');
        setLinkedinUrl(card.linkedinUrl || '');
        setWebsiteUrl(card.websiteUrl || '');
        setInstagramUrl(card.instagramUrl || '');
        setFacebookUrl(card.facebookUrl || '');
        setLeadFormEnabled(card.leadFormEnabled);
        
        setActiveTab('nueva');
    };

    const resetForm = () => {
        setEditingCardId(null);
        setSelectedUserId('');
        setSlug('');
        setNombre('');
        setApellido('');
        setPuesto('');
        setPhoneNumber('');
        setEmail('');
        setBio('');
        setAvatarUrl('');
        setTheme('modern');
        setColorTheme('blue-600');
        setWhatsappNumber('');
        setWhatsappEnabled(true);
        setLinkedinUrl('');
        setWebsiteUrl('');
        setInstagramUrl('');
        setFacebookUrl('');
        setLeadFormEnabled(true);
    };

    // Export Leads to CSV
    const exportLeadsToCSV = () => {
        if (leads.length === 0) {
            toast.error('No hay leads para exportar');
            return;
        }

        const headers = ['Nombre Cliente', 'Empresa', 'Teléfono', 'Email', 'Notas', 'Técnico Relacionado', 'Fecha de Registro'];
        const csvRows = [headers.join(',')];

        leads.forEach(lead => {
            const row = [
                `"${lead.nombre.replace(/"/g, '""')}"`,
                `"${(lead.empresa || '').replace(/"/g, '""')}"`,
                `"${(lead.telefono || '').replace(/"/g, '""')}"`,
                `"${(lead.email || '').replace(/"/g, '""')}"`,
                `"${(lead.notas || '').replace(/"/g, '""')}"`,
                `"${(lead.card.nombre + ' ' + lead.card.apellido).replace(/"/g, '""')}"`,
                `"${new Date(lead.createdAt).toLocaleDateString()}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `leads_bioelectronica_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('¡Listado de leads exportado con éxito!');
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            {/* TAB SELECTOR */}
            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => { setActiveTab('tarjetas'); resetForm(); }}
                    className={`pb-4 px-6 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'tarjetas' 
                            ? 'border-blue-600 text-blue-600 ' 
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Tarjetas Digitales ({cards.length})
                </button>
                <button 
                    onClick={() => { setActiveTab('leads'); resetForm(); }}
                    className={`pb-4 px-6 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'leads' 
                            ? 'border-blue-600 text-blue-600 ' 
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Leads Recopilados ({leads.length})
                </button>
                <button 
                    onClick={() => { setActiveTab('nueva'); resetForm(); }}
                    className={`pb-4 px-6 font-bold text-sm border-b-2 transition-colors ${
                        activeTab === 'nueva' 
                            ? 'border-blue-600 text-blue-600 ' 
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    {editingCardId ? 'Editar Tarjeta' : 'Crear Nueva Tarjeta'}
                </button>
            </div>

            {/* TAB CONTENT: TARJETAS */}
            {activeTab === 'tarjetas' && (
                <div className="space-y-6">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Buscar tarjeta por nombre, slug o email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                        </div>
                        <button 
                            onClick={() => setActiveTab('nueva')}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Nueva Tarjeta</span>
                        </button>
                    </div>

                    {/* Cards Grid */}
                    {filteredCards.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto">
                            <UserPlus className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900">No se encontraron tarjetas</h3>
                            <p className="text-slate-500 mt-2">
                                Crea una tarjeta digital para que tus ingenieros y técnicos puedan identificarse en hospitales o clínicas.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCards.map(card => (
                                <div 
                                    key={card.id}
                                    className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all group flex flex-col justify-between"
                                >
                                    <div className="p-6">
                                        <div className="flex items-start gap-4">
                                            {card.avatarUrl ? (
                                                <img 
                                                    src={card.avatarUrl} 
                                                    alt={`${card.nombre} ${card.apellido}`}
                                                    className="w-16 h-16 rounded-full object-cover border border-slate-200 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-600 font-bold text-xl flex items-center justify-center border border-slate-200 shrink-0">
                                                    {card.nombre.charAt(0)}{card.apellido.charAt(0)}
                                                </div>
                                            )}
                                            
                                            <div className="space-y-1 overflow-hidden">
                                                <h3 className="font-bold text-lg text-slate-900 truncate">
                                                    {card.nombre} {card.apellido}
                                                </h3>
                                                <p className="text-xs text-slate-500 font-medium truncate">
                                                    {card.puesto || 'Técnico'}
                                                </p>
                                                <span className="inline-block text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                                                    {card.theme}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Analytics Row */}
                                        <div className="grid grid-cols-2 gap-4 mt-6 py-3 px-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="text-center border-r border-slate-200">
                                                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                                    <Eye className="w-3.5 h-3.5" />
                                                    Vistas
                                                </div>
                                                <div className="text-slate-800 font-extrabold text-lg mt-0.5">
                                                    {card.views}
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                                    <UserPlus className="w-3.5 h-3.5" />
                                                    Leads
                                                </div>
                                                <div className="text-slate-800 font-extrabold text-lg mt-0.5">
                                                    {card.leads?.length || 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 flex gap-2">
                                        <button 
                                            onClick={() => setPreviewCard(card)}
                                            className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                                        >
                                            <QrCode className="w-4 h-4" />
                                            <span>Código QR</span>
                                        </button>
                                        <button 
                                            onClick={() => startEdit(card)}
                                            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors active:scale-95"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(card.id)}
                                            className="p-2.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors active:scale-95"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: LEADS */}
            {activeTab === 'leads' && (
                <div className="space-y-6">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Buscar lead por cliente, empresa o técnico..."
                                value={leadsSearchQuery}
                                onChange={(e) => setLeadsSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                        </div>
                        <button 
                            onClick={exportLeadsToCSV}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                            <span>Exportar a CSV</span>
                        </button>
                    </div>

                    {/* Leads Table */}
                    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                                        <th className="py-4 px-6">Cliente</th>
                                        <th className="py-4 px-6">Contacto</th>
                                        <th className="py-4 px-6">Empresa</th>
                                        <th className="py-4 px-6">Técnico Receptor</th>
                                        <th className="py-4 px-6">Notas</th>
                                        <th className="py-4 px-6">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filteredLeads.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-500">
                                                No se registraron intercambios de contactos aún.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLeads.map(lead => (
                                            <tr key={lead.id} className="hover:bg-slate-50/50">
                                                <td className="py-4 px-6 font-bold text-slate-950">
                                                    {lead.nombre}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col text-xs space-y-0.5">
                                                        {lead.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {lead.telefono}</span>}
                                                        {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {lead.email}</span>}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-slate-600">
                                                    {lead.empresa || '-'}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="font-medium text-slate-800">
                                                        {lead.card.nombre} {lead.card.apellido}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 max-w-xs truncate text-slate-500" title={lead.notas || ''}>
                                                    {lead.notas || '-'}
                                                </td>
                                                <td className="py-4 px-6 text-xs text-slate-500">
                                                    {new Date(lead.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: NUEVA / EDITAR */}
            {activeTab === 'nueva' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form Panel */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
                        
                        {/* Claude AI Scanner Banner */}
                        <div className="bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10 border border-blue-500/20 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex gap-3 items-center">
                                <div className="p-3 bg-blue-600 text-white rounded-xl">
                                    <Sparkles className="w-6 h-6 animate-pulse" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                                        Escáner de Tarjetas Físicas con IA
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Sube la foto de una tarjeta física convencional y Claude Vision auto-rellenará el perfil.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="w-full md:w-auto relative shrink-0">
                                <input 
                                    type="file" 
                                    id="card-ai-scan"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleCardScanner}
                                    disabled={isScanning}
                                />
                                <label 
                                    htmlFor="card-ai-scan"
                                    className={`w-full md:w-auto px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-700 transition-colors shadow-sm ${
                                        isScanning ? 'opacity-50 cursor-wait' : ''
                                    }`}
                                >
                                    {isScanning ? 'Analizando tarjeta...' : (
                                        <>
                                            <Camera className="w-4 h-4" />
                                            <span>Subir y Escanear</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Employee select */}
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-1.5">Empleado de Organización *</label>
                                {editingCardId ? (
                                    <div className="px-4 py-3 bg-slate-100 text-slate-500 rounded-xl text-sm border border-slate-200 font-medium">
                                        Empleado: {nombre} {apellido} ({email})
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={selectedUserId}
                                        onChange={(e) => handleUserSelect(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">-- Selecciona un empleado --</option>
                                        {organizationUsers.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.nombre} {u.apellido} ({u.email})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Slug path */}
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-1.5">Slug de Acceso Público *</label>
                                <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm">
                                    <span className="bg-slate-100 text-slate-400 px-4 py-3 select-none flex items-center">
                                        {typeof window !== 'undefined' ? `${window.location.origin}/t/` : '/t/'}
                                    </span>
                                    <input 
                                        type="text"
                                        required
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                                        placeholder="emilia-zapata"
                                        className="flex-1 px-4 py-3 bg-white outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Este slug formará la URL única que el empleado compartirá.</p>
                            </div>

                            {/* Info Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Nombre *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Apellido *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={apellido}
                                        onChange={(e) => setApellido(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Cargo / Puesto</label>
                                    <input 
                                        type="text" 
                                        value={puesto}
                                        onChange={(e) => setPuesto(e.target.value)}
                                        placeholder="Ej: Ingeniera Biomédica"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Número de Teléfono</label>
                                    <input 
                                        type="tel" 
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="Ej: +504 9999-9999"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-1.5">Correo Electrónico</label>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="empleado@bioelectronica.hn"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-1.5">Biografía corta</label>
                                <textarea 
                                    rows={3}
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Ingresa una breve descripción profesional..."
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                                />
                            </div>

                            {/* Profile image picker */}
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-1.5">Imagen de Perfil</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden relative shrink-0 flex items-center justify-center text-slate-400">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" className="object-cover w-full h-full" />
                                        ) : (
                                            <ImageIcon className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input 
                                            type="file" 
                                            id="card-avatar-upload"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleAvatarUpload}
                                            disabled={isUploading}
                                        />
                                        <label 
                                            htmlFor="card-avatar-upload"
                                            className={`px-4 py-2.5 bg-slate-100 hover:bg-slate-200   border border-slate-200  rounded-xl text-xs font-bold text-slate-700  flex items-center gap-1.5 inline-flex cursor-pointer transition-colors ${
                                                isUploading ? 'opacity-50 cursor-wait' : ''
                                            }`}
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                            {isUploading ? 'Subiendo...' : 'Subir foto a R2'}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Theme Customization */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-900">Personalización de Estilo</h4>
                                
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Tema Visual</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {THEME_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setTheme(opt.value)}
                                                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
                                                    theme === opt.value 
                                                        ? 'border-blue-600 bg-blue-50/10 ring-2 ring-blue-500/10' 
                                                        : 'border-slate-200  bg-white  hover:bg-slate-50 '
                                                }`}
                                            >
                                                <span className="font-bold text-sm text-slate-900">{opt.label}</span>
                                                <span className="text-xs text-slate-400 mt-1 leading-normal">{opt.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Color de Acento (Tema Moderno)</label>
                                    <div className="flex flex-wrap gap-3">
                                        {COLOR_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setColorTheme(opt.value)}
                                                className={`h-10 px-3.5 rounded-xl flex items-center gap-2 border text-xs font-bold transition-all ${
                                                    colorTheme === opt.value
                                                        ? 'border-blue-600 ring-2 ring-blue-500/20'
                                                        : 'border-slate-200  bg-white '
                                                }`}
                                            >
                                                <span className={`w-3.5 h-3.5 rounded-full ${opt.bg} shrink-0`} />
                                                <span className="text-slate-800">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Social Networks */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-900">Redes Sociales y Enlaces</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">WhatsApp Móvil</label>
                                        <input 
                                            type="tel" 
                                            value={whatsappNumber}
                                            onChange={(e) => setWhatsappNumber(e.target.value)}
                                            placeholder="+504 9999-9999"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">LinkedIn URL</label>
                                        <input 
                                            type="url" 
                                            value={linkedinUrl}
                                            onChange={(e) => setLinkedinUrl(e.target.value)}
                                            placeholder="https://linkedin.com/in/usuario"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Sitio Web Personal/Empresa</label>
                                        <input 
                                            type="text" 
                                            value={websiteUrl}
                                            onChange={(e) => setWebsiteUrl(e.target.value)}
                                            placeholder="www.bioelectronica.hn"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Instagram URL/Usuario</label>
                                        <input 
                                            type="text" 
                                            value={instagramUrl}
                                            onChange={(e) => setInstagramUrl(e.target.value)}
                                            placeholder="https://instagram.com/usuario"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-500 mb-1">Facebook URL</label>
                                    <input 
                                        type="url" 
                                        value={facebookUrl}
                                        onChange={(e) => setFacebookUrl(e.target.value)}
                                        placeholder="https://facebook.com/usuario"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none"
                                    />
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Lead Generation options */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-slate-900">Intercambio de Contactos</h4>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        id="card-leads-enabled"
                                        checked={leadFormEnabled}
                                        onChange={(e) => setLeadFormEnabled(e.target.checked)}
                                        className="w-5 h-5 accent-blue-600 rounded"
                                    />
                                    <label htmlFor="card-leads-enabled" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                                        Activar formulario para recopilar datos de contacto de los clientes
                                    </label>
                                </div>
                            </div>

                            {/* Submit & Cancel */}
                            <div className="flex gap-4 pt-4 border-t border-slate-100">
                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? 'Guardando...' : 'Guardar Tarjeta Digital'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => { resetForm(); setActiveTab('tarjetas'); }}
                                    className="px-6 py-3.5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Desktop Real-time Preview Side Panel */}
                    <div className="lg:col-span-1 hidden lg:block">
                        <div className="sticky top-6 bg-slate-100 border border-slate-200 rounded-3xl p-6 flex flex-col items-center">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-1.5">
                                Vista Previa del Móvil
                            </h4>
                            
                            {/* Frame wrapping */}
                            <div className="w-full max-w-[280px] bg-slate-900 border-[6px] border-slate-800 rounded-[36px] shadow-2xl overflow-hidden aspect-[9/18] flex flex-col justify-between p-4 relative text-white">
                                {/* Theme background glow simulated */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 pointer-events-none" />
                                
                                {/* Header */}
                                <div className="relative z-10 flex justify-between items-center mb-4">
                                    <span className="text-[8px] font-mono tracking-wider opacity-60">Preview</span>
                                    <QrCode className="w-3.5 h-3.5 opacity-60" />
                                </div>

                                {/* Body */}
                                <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Preview Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-white/20 mb-3" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-white/20 mb-3 flex items-center justify-center text-sm font-bold">
                                            {nombre && apellido ? `${nombre.charAt(0)}${apellido.charAt(0)}` : 'US'}
                                        </div>
                                    )}

                                    <h5 className="font-bold text-sm leading-tight text-white truncate max-w-[200px]">
                                        {nombre || 'Nombre'} {apellido || 'Apellido'}
                                    </h5>
                                    <p className="text-[9px] text-blue-400 font-semibold uppercase tracking-wider mt-1 truncate max-w-[200px]">
                                        {puesto || 'Cargo / Puesto'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-2 px-2 leading-relaxed line-clamp-3">
                                        {bio || 'Escribe una biografía corta para verla aquí.'}
                                    </p>
                                </div>

                                {/* Buttons */}
                                <div className="relative z-10 mt-4 space-y-2">
                                    <div className="py-2 px-4 bg-blue-600 rounded-xl text-center text-[10px] font-bold">
                                        Guardar Contacto
                                    </div>
                                    <div className="flex gap-2 justify-center py-2 opacity-60">
                                        <Linkedin className="w-3.5 h-3.5" />
                                        <Globe className="w-3.5 h-3.5" />
                                        <Phone className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PREVIEW QR CODE MODAL */}
            {previewCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 relative shadow-2xl">
                        <button 
                            onClick={() => setPreviewCard(null)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center space-y-4 mt-2">
                            <h3 className="text-lg font-bold text-slate-900">
                                Compartir Tarjeta Digital
                            </h3>
                            <p className="text-xs text-slate-500 leading-normal px-2">
                                Escanea el código QR para abrir el perfil digital de <strong>{previewCard.nombre} {previewCard.apellido}</strong>.
                            </p>

                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-inner inline-block">
                                <QRCode 
                                    value={typeof window !== 'undefined' ? `${window.location.origin}/t/${previewCard.slug}` : `/t/${previewCard.slug}`} 
                                    size={180} 
                                />
                            </div>

                            <div className="pt-2 flex flex-col gap-2">
                                <a 
                                    href={`/t/${previewCard.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <span>Abrir Tarjeta Pública</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button 
                                    onClick={() => {
                                        const url = typeof window !== 'undefined' ? `${window.location.origin}/t/${previewCard.slug}` : `/t/${previewCard.slug}`;
                                        navigator.clipboard.writeText(url);
                                        toast.success('¡Enlace copiado al portapapeles!');
                                    }}
                                    className="w-full py-2.5 rounded-xl border border-slate-250 font-bold text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Copiar Enlace
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
