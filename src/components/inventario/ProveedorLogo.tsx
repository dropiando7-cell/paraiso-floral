'use client';

import React from 'react';
import { Flower2, Sparkles, Sun, Crown, Heart, Compass, ShieldCheck } from 'lucide-react';

interface ProveedorLogoProps {
    nombre: string;
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
}

export function ProveedorLogo({ nombre, size = 'md', showText = true }: ProveedorLogoProps) {
    const norm = (nombre || '').toUpperCase();

    let brand = {
        name: nombre,
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        iconBg: 'bg-emerald-600 text-white',
        icon: <Flower2 className="w-4 h-4" />,
        sub: 'ECUADOR'
    };

    if (norm.includes('GALAPAGOS')) {
        brand = {
            name: 'GALAPAGOS FLORES',
            badgeBg: 'bg-sky-50 text-sky-900 border-sky-200',
            iconBg: 'bg-sky-600 text-white',
            icon: <Compass className="w-4 h-4" />,
            sub: 'GALAFLOR S.A. • ECUADOR'
        };
    } else if (norm.includes('SANTA CLARA')) {
        brand = {
            name: 'SANTA CLARA GARDENS',
            badgeBg: 'bg-emerald-50 text-emerald-900 border-emerald-300',
            iconBg: 'bg-emerald-700 text-white',
            icon: <Sparkles className="w-4 h-4" />,
            sub: 'ROSAS DE EXPORTACIÓN'
        };
    } else if (norm.includes('QUALITY FLOWERS') || norm.includes('LUMINA')) {
        brand = {
            name: 'QUALITY FLOWERS',
            badgeBg: 'bg-purple-50 text-purple-900 border-purple-200',
            iconBg: 'bg-purple-600 text-white',
            icon: <Crown className="w-4 h-4" />,
            sub: 'LUMINA FLOWERS S.A.'
        };
    } else if (norm.includes('LUZ OF ROSES') || norm.includes('LUZ')) {
        brand = {
            name: 'LUZ OF ROSES',
            badgeBg: 'bg-rose-50 text-rose-900 border-rose-200',
            iconBg: 'bg-rose-600 text-white',
            icon: <Heart className="w-4 h-4" />,
            sub: 'ROSAS CON ESTILO'
        };
    } else if (norm.includes('FLOREQUISA') || norm.includes('EQUINOCCIALES')) {
        brand = {
            name: 'FLOREQUISA',
            badgeBg: 'bg-indigo-50 text-indigo-900 border-indigo-200',
            iconBg: 'bg-indigo-600 text-white',
            icon: <Sun className="w-4 h-4" />,
            sub: 'FLORES EQUINOCCIALES'
        };
    } else if (norm.includes('JYR QUALITY') || norm.includes('JYR')) {
        brand = {
            name: 'JYR QUALITY FLOWERS',
            badgeBg: 'bg-amber-50 text-amber-900 border-amber-300',
            iconBg: 'bg-amber-600 text-white',
            icon: <ShieldCheck className="w-4 h-4" />,
            sub: 'SOLUTIONS S.A.'
        };
    } else if (norm.includes('FLORSANI')) {
        brand = {
            name: 'FLORSANI',
            badgeBg: 'bg-teal-50 text-teal-900 border-teal-200',
            iconBg: 'bg-teal-600 text-white',
            icon: <Flower2 className="w-4 h-4" />,
            sub: 'SPECIALTY FLOWERS ECU'
        };
    } else if (norm.includes('ECUADOR')) {
        brand = {
            name: 'ECUADOR PREMIUM',
            badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
            iconBg: 'bg-gradient-to-tr from-amber-600 to-emerald-600 text-white',
            icon: <Crown className="w-4 h-4" />,
            sub: 'PREMIUM SELECTION'
        };
    }

    const iconSizes = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-base'
    };

    return (
        <div className="flex items-center gap-2.5">
            {/* Logo Icon Badge */}
            <div className={`${iconSizes[size]} ${brand.iconBg} rounded-xl shadow-xs flex items-center justify-center shrink-0 font-black`}>
                {brand.icon}
            </div>

            {showText && (
                <div className="min-w-0">
                    <div className="text-xs font-black tracking-wide uppercase text-slate-800 truncate flex items-center gap-1.5">
                        <span>{brand.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${brand.badgeBg}`}>
                            ECUADOR
                        </span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 truncate">
                        {brand.sub}
                    </div>
                </div>
            )}
        </div>
    );
}
