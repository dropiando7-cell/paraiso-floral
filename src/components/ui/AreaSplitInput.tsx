'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

type AreaSplitInputProps = {
    value: string;
    onChange: (val: string) => void;
    id?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string; // Para contenedor si se desea, usaremos un container estandarizado
    dbAreas?: { name: string; description?: string }[];
};

export const AreaSplitInput = forwardRef<HTMLDivElement, AreaSplitInputProps>(({
    value, onChange, id, required = false, disabled = false, className = '', dbAreas = []
}, ref) => {
    // Si viene value inicial como "A-1-2", pre-parsear
    const [parts, setParts] = useState<string[]>(['', '', '']);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const inputRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null)
    ];

    // Sincronizar value externo -> parts interno
    useEffect(() => {
        if (!value) {
            setParts(['', '', '']);
        } else {
            // Ejemplo value="A-12-B", spliteado da ["A", "12", "B"]
            const splitted = value.split('-');
            setParts([
                splitted[0] || '',
                splitted[1] || '',
                splitted[2] || '',
            ]);
        }
    }, [value]);

    const notifyChange = (newParts: string[]) => {
        // Filtrar vacíos si al centro hay algo, o simplemente unir los no nulos
        // Ej: ['A', '', ''] -> 'A'
        // Ej: ['A', '1', 'B'] -> 'A-1-B'
        // Si el último es vacío no agregamos guiones al final, cortamos el array
        let rTrimParts = [...newParts];
        while (rTrimParts.length > 0 && rTrimParts[rTrimParts.length - 1] === '') {
            rTrimParts.pop();
        }
        onChange(rTrimParts.join('-').toUpperCase());
    };

    const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); // Solo alfanumérico
        
        // Auto avanzar si ya escribió 2-3 letras y hay un siguiente.
        // Pero puede ser tedioso adivinar. Mejor, dejemos que escriban, y avanzan con ESPACIO or '-' or guion enter
        const prevVal = parts[index];
        const newParts = [...parts];

        // Si digitó un caracter largo que contenía guiones al pegarlo (ej "A-1-2" paste)
        if (e.target.value.includes('-') || e.target.value.includes(' ')) {
            const pasted = e.target.value.replace(/ /g, '-').split('-');
            pasted.forEach((p, i) => {
                if (index + i < 3) newParts[index + i] = p.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });
            setParts(newParts);
            notifyChange(newParts);
            // Enfocar la última cajita rellenada
            const lastFilled = Math.min(index + pasted.length - 1, 2);
            inputRefs[lastFilled].current?.focus();
            return;
        }

        newParts[index] = val;
        setParts(newParts);
        notifyChange(newParts);
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === '-' || e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (index < 2) {
                inputRefs[index + 1].current?.focus();
            }
        }
        if (e.key === 'Backspace' && parts[index] === '' && index > 0) {
            e.preventDefault();
            inputRefs[index - 1].current?.focus();
        }
    };

    // Sugerencias filtradas
    const currentQuery = parts.join('-').toUpperCase();
    const suggestions = dbAreas.filter(a => a.name.startsWith(currentQuery) && currentQuery !== a.name).slice(0, 3);

    return (
        <div ref={ref} className={`flex flex-col gap-2 ${className}`}>
            {/* Input Groups */}
            <div className="flex items-center gap-2 relative">
                {[0, 1, 2].map(idx => (
                    <React.Fragment key={idx}>
                        <input
                            ref={inputRefs[idx]}
                            type="text"
                            disabled={disabled}
                            value={parts[idx]}
                            onChange={e => handleChange(idx, e)}
                            onKeyDown={e => handleKeyDown(idx, e)}
                            onFocus={() => setFocusedIndex(idx)}
                            onBlur={() => setFocusedIndex(null)}
                            placeholder={idx === 0 ? 'SE' : idx === 1 ? 'A' : '1'}
                            className={`w-full flex-1 min-w-0 text-center font-mono font-black text-slate-800 uppercase tracking-widest text-lg py-3 px-2 border-2 rounded-xl focus:outline-none transition-all placeholder:text-slate-300 placeholder:font-normal
                                ${disabled ? 'bg-slate-50 opacity-60 cursor-not-allowed border-transparent' 
                                : focusedIndex === idx ? 'border-emerald-500 ring-2 ring-emerald-500/30' 
                                : parts[idx] ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}
                            maxLength={4}
                        />
                        {idx < 2 && (
                            <span className="text-slate-300 font-bold shrink-0">-</span>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Hidden Input provided for parent native form validation / submit handling */}
            <input type="text" readOnly id={id} name={id} value={value} required={required} className="sr-only" tabIndex={-1} />

            {/* Quick Suggestions Chips */}
            {!disabled && suggestions.length > 0 && focusedIndex !== null && (
                <div className="flex flex-wrap gap-2 mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Sugerencias:</span>
                    {suggestions.map(sug => (
                        <button
                            key={sug.name}
                            type="button"
                            onClick={() => { onChange(sug.name); inputRefs[2].current?.blur(); }}
                            className="text-xs font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                            {sug.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});

AreaSplitInput.displayName = 'AreaSplitInput';
