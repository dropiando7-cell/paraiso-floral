'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

export function DateInput({ 
    value, 
    onChange, 
    placeholder = "AAAA-MM-DD",
    className = ""
}: { 
    value: string; 
    onChange: (val: string) => void; 
    placeholder?: string;
    className?: string;
}) {
    // Manejador que formatea automáticamente a medida que el usuario escribe (Añadiendo guiones)
    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        
        // Solo permitir números y guiones
        val = val.replace(/[^\d-]/g, '');
        
        // Auto-formato AAAA-MM-DD si está escribiendo números sin guiones
        if (value.length < val.length) { // Solo si está agregando (no borrando)
            if (val.length === 4 && !val.includes('-')) {
                val = val + '-';
            } else if (val.length === 7 && (val.match(/-/g) || []).length === 1) {
                val = val + '-';
            }
        }
        
        // Limitar la longitud a 10 caracteres (YYYY-MM-DD)
        if (val.length > 10) {
            val = val.slice(0, 10);
        }
        
        onChange(val);
    };

    return (
        <div className="relative">
            {/* Input de texto real (Permite teclear números en móviles) */}
            <input 
                type="text" 
                value={value} 
                onChange={handleTextChange} 
                className={className} 
                placeholder={placeholder}
                inputMode="numeric" 
            />
            {/* Input nativo de fecha invisible superpuesto al ícono para abrir el calendario nativo */}
            <input 
                type="date" 
                value={value} 
                onChange={e => onChange(e.target.value)} 
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 opacity-0 cursor-pointer z-10"
            />
            {/* Ícono visual */}
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
    );
}
