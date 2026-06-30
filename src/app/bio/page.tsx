import React from 'react';
import { getPublicBioSettings } from '@/app/(dashboard)/admin/bio-settings/actions';
import { 
    Phone, Mail, MapPin, Globe, Facebook, Instagram, Video, 
    ArrowUpRight, MessageCircle, ShoppingBag, Wrench, HeartPulse
} from 'lucide-react';

export const metadata = {
    title: 'Enlace en Bio - Bioelectrónica Honduras',
    description: 'Nuestras redes sociales, catálogo de equipos médicos y canales de soporte directo.',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

// Map icon string to a Lucide icon component
function getLinkIcon(iconName: string) {
    switch (iconName) {
        case 'shopping-bag':
            return <ShoppingBag className="w-4 h-4 shrink-0" />;
        case 'message-circle':
            return <MessageCircle className="w-4 h-4 shrink-0" />;
        case 'wrench':
            return <Wrench className="w-4 h-4 shrink-0" />;
        case 'phone':
            return <Phone className="w-4 h-4 shrink-0" />;
        case 'email':
            return <Mail className="w-4 h-4 shrink-0" />;
        default:
            return <Globe className="w-4 h-4 shrink-0" />;
    }
}

export default async function PublicBioPage() {
    const { settings } = await getPublicBioSettings();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-0 md:p-8 relative font-sans select-none overflow-x-hidden md:bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]">
            
            {/* Phone Container on Desktop, Full screen on Mobile */}
            <div className="w-full max-w-md bg-white min-h-screen md:min-h-[820px] md:max-h-[900px] md:rounded-[42px] md:shadow-2xl md:border-[10px] md:border-slate-900 overflow-y-auto relative flex flex-col scrollbar-none">
                
                {/* 1. Header with Gradient Background & SmartBio Style Header Bar */}
                <div className="h-48 bg-gradient-to-tr from-[#3b82f6] via-[#8b5cf6] to-[#ec4899] relative shrink-0 flex flex-col justify-start">
                    <div className="absolute inset-0 bg-black/10"></div>
                    
                    {/* Navigation Top Bar */}
                    <div className="w-full flex items-center justify-between px-6 pt-5 relative z-20">
                        <div className="flex items-center gap-1.5 text-white">
                            <HeartPulse className="w-5 h-5 text-white animate-pulse" />
                            <span className="text-sm font-black tracking-tight uppercase">Bioelectrónica</span>
                        </div>
                        <button className="text-white hover:opacity-80 transition-opacity">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 2. Main Content Body overlapping the header with a convex arch shape */}
                <div 
                    style={{ borderTopLeftRadius: '50% 32px', borderTopRightRadius: '50% 32px' }}
                    className="flex-1 bg-white mt-[-32px] relative z-10 px-6 pt-14 pb-10 flex flex-col items-center"
                >
                    
                    {/* Avatar positioned absolutely at the overlap */}
                    <div className="absolute top-[-48px] left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border-4 border-white overflow-hidden shadow-lg bg-white shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={settings.avatarUrl || '/landing/bio-avatar.png'}
                            alt={settings.title}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Title */}
                    <h1 className="text-xl font-black text-slate-800 tracking-tight text-center mt-2">
                        {settings.title}
                    </h1>

                    {/* Subtitle / Bio */}
                    <p className="text-xs text-slate-500 mt-2 text-center max-w-[280px] leading-relaxed font-medium">
                        {settings.subtitle}
                    </p>

                    {/* Location small badge */}
                    {settings.location && (
                        <div className="inline-flex items-center gap-1 text-[9px] font-black text-slate-600 bg-slate-100 border border-slate-200/50 rounded-full px-2.5 py-1 mt-3.5">
                            <MapPin className="w-3 h-3 text-brand-500" />
                            <span>{settings.location.split(',')[0]}</span>
                        </div>
                    )}

                    {/* Social Network row (Black circular icons as in mockup) */}
                    <div className="flex items-center justify-center gap-3.5 my-5">
                        {settings.whatsapp && (
                            <a 
                                id="social_whatsapp"
                                href={`https://wa.me/${settings.whatsapp}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"
                                title="WhatsApp"
                            >
                                <Phone className="w-4 h-4 text-green-400" />
                            </a>
                        )}
                        {settings.facebook && (
                            <a 
                                id="social_facebook"
                                href={settings.facebook} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"
                                title="Facebook"
                            >
                                <Facebook className="w-4 h-4 text-blue-400" />
                            </a>
                        )}
                        {settings.instagram && (
                            <a 
                                id="social_instagram"
                                href={settings.instagram} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"
                                title="Instagram"
                            >
                                <Instagram className="w-4 h-4 text-pink-400" />
                            </a>
                        )}
                        {settings.tiktok && (
                            <a 
                                id="social_tiktok"
                                href={settings.tiktok} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"
                                title="TikTok"
                            >
                                <Video className="w-4 h-4 text-purple-400" />
                            </a>
                        )}
                        {settings.website && (
                            <a 
                                id="social_website"
                                href={settings.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"
                                title="Sitio Web"
                            >
                                <Globe className="w-4 h-4 text-brand-400" />
                            </a>
                        )}
                    </div>

                    {/* Map / Location Card (Matches Mockup visually) */}
                    {settings.location && (
                        <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(settings.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-slate-50 border border-slate-200/80 rounded-[28px] p-3.5 flex flex-col gap-2 hover:scale-[1.01] transition-all active:scale-[0.99] group mb-6 shadow-sm"
                        >
                            <div className="h-32 bg-[#f8fafc] rounded-[20px] relative overflow-hidden flex items-center justify-center border border-slate-100/50">
                                {/* Grid Pattern on Map representation */}
                                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:12px_12px]"></div>
                                {/* Street lines mockup */}
                                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-200/50 -translate-y-1/2 rotate-[15deg]"></div>
                                <div className="absolute top-0 left-1/3 w-[2px] h-full bg-slate-200/50 -translate-x-1/2 rotate-[-30deg]"></div>
                                
                                {/* Floating Marker with see our location */}
                                <div className="flex flex-col items-center gap-1.5 relative z-10">
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 border-[3px] border-white flex items-center justify-center text-white shadow-md animate-bounce">
                                        <MapPin className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="bg-indigo-600 text-[8px] font-black text-white px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider">Ver Ubicación</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-1">
                                <div className="text-left min-w-0 flex-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Dirección Física</p>
                                    <p className="text-[10px] font-bold text-slate-700 truncate pr-3">{settings.location}</p>
                                </div>
                                <span className="text-[10px] font-bold text-indigo-600 group-hover:underline shrink-0">Abrir Mapa</span>
                            </div>
                        </a>
                    )}

                    {/* Divider */}
                    <div className="h-px bg-slate-100 w-full mb-5"></div>

                    {/* Links List */}
                    <div className="w-full flex flex-col gap-3.5">
                        {/* Primary Catalog Link (Slightly stylized or gradient to stand out) */}
                        {settings.catalog && (
                            <a
                                id="link_catalog"
                                href={settings.catalog}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-extrabold text-xs tracking-wide shadow-md transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between border border-indigo-600/30"
                            >
                                <span className="flex items-center gap-3">
                                    <ShoppingBag className="w-4 h-4 shrink-0 text-white" />
                                    <span>🛒 Catálogo de Equipos Médicos</span>
                                </span>
                                <ArrowUpRight className="w-4 h-4 text-white/80" />
                            </a>
                        )}

                        {/* Custom links (Rendered as black pills as in mockup) */}
                        {settings.customLinks.map((link: any, i: number) => (
                            <a
                                id={`link_custom_${i}`}
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-slate-900 to-black hover:from-slate-800 hover:to-slate-900 text-white font-bold text-xs tracking-wide shadow-sm transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between border border-slate-850"
                            >
                                <span className="flex items-center gap-3 truncate pr-2">
                                    <span className="text-slate-400">
                                        {getLinkIcon(link.icon)}
                                    </span>
                                    <span className="truncate">{link.label}</span>
                                </span>
                                <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                            </a>
                        ))}
                    </div>

                    {/* Bottom Link Badge matching mockup style */}
                    <div className="mt-12 z-10 shrink-0 flex flex-col items-center gap-1.5">
                        <a
                            href={`https://bioelectronicahn.com/bio`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-slate-200/80 shadow-sm rounded-full text-[10px] font-black text-slate-800 tracking-wide hover:bg-slate-100 transition-colors"
                        >
                            <span>bioelectronicahn.com/bio</span>
                            <ArrowUpRight className="w-3 h-3 text-slate-500" />
                        </a>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Escanea para ingresar</span>
                    </div>

                    {/* Brand Footnote */}
                    <div className="mt-8 flex flex-col items-center gap-1 opacity-50 z-10">
                        <span className="text-[7px] font-bold text-slate-500">BIOELECTRONICA HONDURAS © 2026</span>
                    </div>

                </div>

            </div>
        </div>
    );
}
