'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { 
    Phone, Mail, Globe, Linkedin, Instagram, Facebook, 
    MessageSquare, Download, Share2, Send, Check, X, 
    Briefcase, Building, QrCode, RefreshCw 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Organization {
    id: string;
    name: string;
    logoUrl?: string | null;
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
    organization: Organization;
}

export default function DigitalCardClient({ card }: { card: DigitalCard }) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isExchangeOpen, setIsExchangeOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [leadForm, setLeadForm] = useState({
        nombre: '',
        empresa: '',
        telefono: '',
        email: '',
        notas: ''
    });
    const [shareUrl, setShareUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setShareUrl(`${window.location.origin}/t/${card.slug}`);
        }
    }, [card.slug]);

    // Format theme backgrounds and variables
    const getThemeStyles = () => {
        const accentColor = card.colorTheme || 'blue-600';
        
        switch (card.theme) {
            case 'dark':
                return {
                    bodyBg: 'bg-slate-950 text-slate-100',
                    cardBg: 'bg-slate-900/90 border border-slate-800 shadow-2xl shadow-black/50',
                    textPrimary: 'text-white font-bold',
                    textSecondary: 'text-slate-400',
                    btnPrimary: 'bg-violet-600 text-white hover:bg-violet-700',
                    btnSecondary: 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700',
                    iconAccent: 'text-violet-400 bg-violet-950/50 border border-violet-900/50',
                    badgeBg: 'bg-violet-900/30 text-violet-300 border border-violet-800/50',
                    radialGlow: 'from-violet-600/10 via-transparent to-transparent'
                };
            case 'neon':
                return {
                    bodyBg: 'bg-black text-lime-400',
                    cardBg: 'bg-black border border-lime-500/40 shadow-[0_0_25px_rgba(132,204,22,0.15)]',
                    textPrimary: 'text-white font-mono uppercase tracking-wider font-bold',
                    textSecondary: 'text-lime-400/70 font-mono',
                    btnPrimary: 'bg-lime-500 text-black font-bold uppercase tracking-wider hover:bg-lime-400',
                    btnSecondary: 'bg-neutral-900 text-lime-400 border border-lime-500/30 hover:bg-neutral-800 font-mono',
                    iconAccent: 'text-lime-400 bg-black border border-lime-500/40',
                    badgeBg: 'bg-lime-950/40 text-lime-300 border border-lime-800/40 font-mono',
                    radialGlow: 'from-lime-500/10 via-transparent to-transparent'
                };
            case 'glass':
                return {
                    bodyBg: 'bg-gradient-to-tr from-rose-900 via-indigo-900 to-slate-950 text-white',
                    cardBg: 'bg-white/10 border border-white/20 backdrop-blur-2xl shadow-2xl shadow-black/10',
                    textPrimary: 'text-white font-bold',
                    textSecondary: 'text-white/70',
                    btnPrimary: 'bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm',
                    btnSecondary: 'bg-black/20 text-white border border-white/10 hover:bg-black/35 backdrop-blur-sm',
                    iconAccent: 'text-white bg-white/15 border border-white/10',
                    badgeBg: 'bg-white/10 text-white border border-white/10',
                    radialGlow: 'from-pink-500/20 via-transparent to-transparent'
                };
            case 'modern':
            default:
                return {
                    bodyBg: 'bg-slate-50 text-slate-800',
                    cardBg: 'bg-white/80 border border-slate-200 backdrop-blur-md shadow-xl shadow-slate-200/50',
                    textPrimary: 'text-slate-800 font-bold',
                    textSecondary: 'text-slate-500',
                    btnPrimary: `bg-${accentColor} text-white hover:opacity-90`,
                    btnSecondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                    iconAccent: `text-${accentColor} bg-${accentColor}/5 border border-${accentColor}/10`,
                    badgeBg: `bg-${accentColor}/10 text-${accentColor} border border-${accentColor}/10`,
                    radialGlow: `from-blue-500/10 via-transparent to-transparent`
                };
        }
    };

    const s = getThemeStyles();

    // Specific button styles for the accent color
    const getAccentStyle = () => {
        const color = card.colorTheme || 'blue-600';
        if (card.theme === 'modern') {
            return {
                backgroundColor: color.startsWith('#') ? color : undefined,
                color: '#fff'
            };
        }
        return {};
    };

    const handleExchangeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leadForm.nombre.trim()) {
            toast.error('El nombre es requerido');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/tarjetas/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardId: card.id,
                    ...leadForm
                })
            });

            if (!res.ok) {
                throw new Error('Error al registrar lead');
            }

            toast.success('¡Contacto compartido con éxito!');
            setLeadForm({
                nombre: '',
                empresa: '',
                telefono: '',
                email: '',
                notas: ''
            });
            setIsExchangeOpen(false);
        } catch (err) {
            console.error(err);
            toast.error('Hubo un error al guardar tu contacto');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        toast.success('¡Enlace de tarjeta copiado!');
    };

    // Fallback initials for profile picture
    const getInitials = () => {
        return `${card.nombre.charAt(0)}${card.apellido.charAt(0)}`.toUpperCase();
    };

    return (
        <div className={`min-h-screen flex justify-center items-center relative overflow-hidden ${s.bodyBg} p-0 sm:p-4`}>
            <Toaster position="top-center" reverseOrder={false} />

            {/* Background glowing decorations */}
            <div className={`absolute top-[-20%] left-[-20%] w-[100%] h-[60%] rounded-full bg-gradient-to-br ${s.radialGlow} blur-3xl pointer-events-none`} />
            <div className={`absolute bottom-[-20%] right-[-20%] w-[100%] h-[60%] rounded-full bg-gradient-to-tr ${s.radialGlow} blur-3xl pointer-events-none`} />

            {/* Core Card layout (max-w-md is standard mobile screen simulation) */}
            <div className="w-full max-w-md min-h-screen sm:min-h-[85vh] sm:rounded-[36px] flex flex-col justify-between p-6 relative z-10 backdrop-blur-xs select-none">
                
                {/* Header branding */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        {card.organization?.logoUrl ? (
                            <img 
                                src={card.organization.logoUrl} 
                                alt={card.organization.name} 
                                className="h-7 w-auto object-contain rounded-md"
                            />
                        ) : (
                            <div className="h-7 w-7 rounded-md bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold">
                                BE
                            </div>
                        )}
                        <span className={`text-xs tracking-wider uppercase font-semibold ${s.textSecondary}`}>
                            {card.organization?.name}
                        </span>
                    </div>
                    
                    <button 
                        onClick={() => setIsFlipped(!isFlipped)} 
                        className={`p-2.5 rounded-full transition-transform hover:scale-105 active:scale-95 ${s.btnSecondary}`}
                        title={isFlipped ? "Ver tarjeta" : "Ver Código QR"}
                    >
                        {isFlipped ? <RefreshCw className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                    </button>
                </div>

                {/* Main 3D Card Flipper */}
                <div className="flex-1 flex items-center justify-center py-4 perspective-1000">
                    <div 
                        className="w-full relative min-h-[360px] preserve-3d"
                        style={{
                            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            transformStyle: 'preserve-3d',
                            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        {/* FRONT FACE */}
                        <div 
                            className={`absolute inset-0 w-full h-full rounded-3xl p-6 flex flex-col justify-between backface-hidden ${s.cardBg}`}
                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                        >
                            <div className="flex flex-col items-center text-center mt-2">
                                {/* Profile Picture container */}
                                <div className="relative mb-4 group cursor-pointer" onClick={() => setIsFlipped(true)}>
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 blur-xs opacity-70 group-hover:opacity-100 transition-opacity" />
                                    {card.avatarUrl ? (
                                        <img 
                                            src={card.avatarUrl} 
                                            alt={`${card.nombre} ${card.apellido}`}
                                            className="w-24 h-24 rounded-full object-cover border-2 border-white relative z-10"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-3xl border-2 border-white relative z-10">
                                            {getInitials()}
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 right-0 z-20 bg-slate-900 border border-slate-700 p-1.5 rounded-full text-white">
                                        <QrCode className="w-3.5 h-3.5" />
                                    </div>
                                </div>

                                <h2 className={`text-2xl font-bold tracking-tight leading-tight ${s.textPrimary}`}>
                                    {card.nombre} {card.apellido}
                                </h2>
                                
                                {card.puesto && (
                                    <div className={`mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${s.badgeBg}`}>
                                        <Briefcase className="w-3 h-3" />
                                        {card.puesto}
                                    </div>
                                )}

                                {card.bio && (
                                    <p className={`mt-4 text-sm leading-relaxed max-w-xs ${s.textSecondary}`}>
                                        {card.bio}
                                    </p>
                                )}
                            </div>

                            {/* Direct Communication Buttons */}
                            <div className="grid grid-cols-3 gap-3 mt-6">
                                {card.phoneNumber && (
                                    <a 
                                        href={`tel:${card.phoneNumber}`}
                                        className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all ${s.btnSecondary}`}
                                    >
                                        <Phone className="w-4 h-4" />
                                        <span className="text-[10px] font-medium uppercase tracking-wider">Llamar</span>
                                    </a>
                                )}
                                {card.email && (
                                    <a 
                                        href={`mailto:${card.email}`}
                                        className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all ${s.btnSecondary}`}
                                    >
                                        <Mail className="w-4 h-4" />
                                        <span className="text-[10px] font-medium uppercase tracking-wider">Correo</span>
                                    </a>
                                )}
                                {card.whatsappEnabled && (card.whatsappNumber || card.phoneNumber) && (
                                    <a 
                                        href={`https://wa.me/${(card.whatsappNumber || card.phoneNumber)?.replace(/[^0-9]/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all ${s.btnSecondary}`}
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="text-[10px] font-medium uppercase tracking-wider">Chat</span>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* BACK FACE (QR CODE) */}
                        <div 
                            className={`absolute inset-0 w-full h-full rounded-3xl p-6 flex flex-col justify-between items-center backface-hidden rotate-y-180 ${s.cardBg}`}
                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                            <div className="text-center mt-2 w-full flex flex-col items-center">
                                <h3 className={`text-lg font-bold uppercase tracking-wider mb-2 ${s.textPrimary}`}>
                                    Código de Contacto
                                </h3>
                                <p className={`text-xs max-w-xs mb-6 ${s.textSecondary}`}>
                                    Escanea este código con la cámara de otro móvil para abrir mi tarjeta digital de presentación.
                                </p>

                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-lg inline-block transition-transform hover:scale-105 active:scale-95 cursor-pointer" onClick={() => setIsFlipped(false)}>
                                    {shareUrl ? (
                                        <QRCode value={shareUrl} size={170} />
                                    ) : (
                                        <div className="w-[170px] h-[170px] bg-slate-100 animate-pulse rounded-lg" />
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={() => setIsFlipped(false)}
                                className={`text-xs font-semibold uppercase tracking-wider mt-4 flex items-center gap-1.5 ${s.textSecondary} hover:opacity-85`}
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Volver al perfil
                            </button>
                        </div>
                    </div>
                </div>

                {/* Primary Interaction Area */}
                <div className="mt-4 space-y-3">
                    <div className="flex gap-3">
                        <a 
                            href={`/api/tarjeta/${card.slug}/vcard`}
                            className={`flex-1 py-4 px-6 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all hover:scale-[1.01] active:scale-95 shadow-md ${s.btnPrimary}`}
                            style={getAccentStyle()}
                        >
                            <Download className="w-5 h-5" />
                            <span>Guardar Contacto</span>
                        </a>

                        {card.leadFormEnabled && (
                            <button 
                                onClick={() => setIsExchangeOpen(true)}
                                className={`py-4 px-5 rounded-2xl transition-all hover:scale-[1.01] active:scale-95 shadow-sm ${s.btnSecondary}`}
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Social Media Links Grid */}
                    <div className="flex justify-center gap-4 py-4">
                        {card.linkedinUrl && (
                            <a 
                                href={card.linkedinUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`p-3 rounded-full hover:scale-110 active:scale-90 transition-transform ${s.btnSecondary}`}
                            >
                                <Linkedin className="w-5 h-5" />
                            </a>
                        )}
                        {card.instagramUrl && (
                            <a 
                                href={card.instagramUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`p-3 rounded-full hover:scale-110 active:scale-90 transition-transform ${s.btnSecondary}`}
                            >
                                <Instagram className="w-5 h-5" />
                            </a>
                        )}
                        {card.facebookUrl && (
                            <a 
                                href={card.facebookUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`p-3 rounded-full hover:scale-110 active:scale-90 transition-transform ${s.btnSecondary}`}
                            >
                                <Facebook className="w-5 h-5" />
                            </a>
                        )}
                        {card.websiteUrl && (
                            <a 
                                href={card.websiteUrl.startsWith('http') ? card.websiteUrl : `https://${card.websiteUrl}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`p-3 rounded-full hover:scale-110 active:scale-90 transition-transform ${s.btnSecondary}`}
                            >
                                <Globe className="w-5 h-5" />
                            </a>
                        )}
                        <button 
                            onClick={copyToClipboard}
                            className={`p-3 rounded-full hover:scale-110 active:scale-90 transition-transform ${s.btnSecondary}`}
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="text-center pt-2">
                        <span className={`text-[10px] tracking-wider uppercase font-semibold ${s.textSecondary} opacity-50`}>
                            Bioelectrónica ERP Card v1.0
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom sliding modal sheet for Lead Exchange */}
            {isExchangeOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
                    <div 
                        className={`w-full max-w-md rounded-t-[32px] p-6 pb-8 border-t transition-transform transform translate-y-0 duration-300 ${
                            card.theme === 'dark' || card.theme === 'neon' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold">Intercambiar Contacto</h3>
                                <p className="text-xs text-slate-400">Comparte tus datos para que pueda ponerme en contacto contigo.</p>
                            </div>
                            <button 
                                onClick={() => setIsExchangeOpen(false)}
                                className="p-2 rounded-full hover:bg-slate-800/20 dark:hover:bg-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleExchangeSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Nombre Completo *</label>
                                <input 
                                    type="text" 
                                    required
                                    value={leadForm.nombre}
                                    onChange={(e) => setLeadForm({ ...leadForm, nombre: e.target.value })}
                                    placeholder="Ej: Ing. Juan Pérez"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Teléfono</label>
                                    <input 
                                        type="tel" 
                                        value={leadForm.telefono}
                                        onChange={(e) => setLeadForm({ ...leadForm, telefono: e.target.value })}
                                        placeholder="+504 9999-9999"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Empresa</label>
                                    <input 
                                        type="text" 
                                        value={leadForm.empresa}
                                        onChange={(e) => setLeadForm({ ...leadForm, empresa: e.target.value })}
                                        placeholder="Ej: Hospital del Sur"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Email</label>
                                <input 
                                    type="email" 
                                    value={leadForm.email}
                                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                                    placeholder="juan@hospital.hn"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Notas / Mensaje</label>
                                <textarea 
                                    rows={2}
                                    value={leadForm.notas}
                                    onChange={(e) => setLeadForm({ ...leadForm, notas: e.target.value })}
                                    placeholder="Ej: Reunirnos por mantenimiento de Rayos X"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Enviando...' : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>Enviar mis Datos</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
