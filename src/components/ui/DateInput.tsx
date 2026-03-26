'use client';

import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

export function DateInput({ 
    value, 
    onChange, 
    placeholder = "DD-MM-AAAA",
    className = ""
}: { 
    value: string; 
    onChange: (val: string) => void; 
    placeholder?: string;
    className?: string;
}) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        // Sync parent YYYY-MM-DD to local DD-MM-AAAA
        if (!value) {
            setDisplayValue('');
        } else if (value.includes('-')) {
            const parts = value.split('-');
            // Si viene en formato ISO (YYYY-MM-DD) del calendario nativo o base de datos
            if (parts.length === 3 && parts[0].length === 4) { 
                setDisplayValue(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
                setDisplayValue(value);
            }
        } else {
            setDisplayValue(value);
        }
    }, [value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^\d-]/g, '');
        
        // Auto-formato DD-MM-AAAA si está escribiendo números sin guiones
        if (displayValue.length < val.length) { // Solo si está agregando
            if (val.length === 2 && !val.includes('-')) val += '-';
            else if (val.length === 5 && (val.match(/-/g) || []).length === 1) val += '-';
        }
        
        if (val.length > 10) val = val.slice(0, 10);
        
        setDisplayValue(val);
        
        // Emite al padre solo cuando está completo o vacío
        if (val.length === 10) {
            const parts = val.split('-');
            if (parts.length === 3 && parts[2].length === 4) {
                // emit YYYY-MM-DD para compatibilidad nativa e Inserción BD
                onChange(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
                onChange(val); // Fallback
            }
        } else if (val === '') {
            onChange('');
        }
    };

    return (
        <div className="relative">
            {/* Input de texto real (Permite teclear números en móviles) */}
            <input 
                type="text" 
                value={displayValue} 
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
