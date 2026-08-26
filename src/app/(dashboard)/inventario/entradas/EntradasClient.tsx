'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import { registrarEntrada, registrarEntradasLote } from './actions';
import { 
    PackagePlus, 
    Info, 
    Check, 
    Save, 
    Plus, 
    Trash2, 
    Upload, 
    Download, 
    Search, 
    ChevronDown, 
    FileSpreadsheet, 
    AlertTriangle, 
    RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EntryRow {
    id: string;
    productoId: string;
    sku: string;
    nombre: string;
    cantidad: number;
    error?: string;
}

// Client-side CSV Parser with fuzzy name matching and SKU lookup
function parseCSV(text: string, productos: any[]): EntryRow[] {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headerLine = lines[0];
    const commas = (headerLine.match(/,/g) || []).length;
    const semicolons = (headerLine.match(/;/g) || []).length;
    const separator = semicolons > commas ? ';' : ',';

    const parseLine = (line: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === separator && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result.map(val => val.replace(/^"|"$/g, '').trim());
    };

    const headers = parseLine(headerLine).map(h => 
        h.normalize("NFD")
         .replace(/[\u0300-\u036f]/g, "")
         .toLowerCase()
    );

    const skuIdx = headers.findIndex(h => h === 'sku' || h === 'codigo' || h === 'code');
    const qtyIdx = headers.findIndex(h => h === 'cantidad' || h === 'cant' || h === 'qty' || h === 'quantity');
    const nameIdx = headers.findIndex(h => h === 'producto' || h === 'nombre' || h === 'name' || h === 'product');

    const rows: EntryRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = parseLine(line);

        const skuValue = skuIdx !== -1 ? values[skuIdx] : '';
        const qtyValue = qtyIdx !== -1 ? parseInt(values[qtyIdx]) || 0 : 1;
        const nameValue = nameIdx !== -1 ? values[nameIdx] : '';

        if (!skuValue && !nameValue) continue;

        let matchedProduct = null;

        // 1. Try to match by SKU
        if (skuValue) {
            matchedProduct = productos.find(p => p.sku.toLowerCase() === skuValue.toLowerCase());
        }

        // 2. Try to match by Name
        if (!matchedProduct && nameValue) {
            matchedProduct = productos.find(p => p.nombre.toLowerCase() === nameValue.toLowerCase());
            if (!matchedProduct) {
                // Try fuzzy/partial match on name
                matchedProduct = productos.find(p => p.nombre.toLowerCase().includes(nameValue.toLowerCase()));
            }
        }

        rows.push({
            id: Math.random().toString(36).substring(2, 9),
            productoId: matchedProduct ? matchedProduct.id : '',
            sku: matchedProduct ? matchedProduct.sku : skuValue,
            nombre: matchedProduct ? matchedProduct.nombre : nameValue,
            cantidad: qtyValue > 0 ? qtyValue : 1,
            error: matchedProduct ? undefined : 'Producto no encontrado'
        });
    }

    return rows;
}

// Searchable Combobox inside a table cell for inline product searching
interface ProductCellProps {
    productos: any[];
    value: string;
    onChange: (p: any) => void;
    rowError?: string;
}

function ProductCell({ productos, value, onChange, rowError }: ProductCellProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const cleanString = (str: string) => 
        str.normalize("NFD")
           .replace(/[\u0300-\u036f]/g, "")
           .toLowerCase()
           .replace(/[^a-z0-9]/g, "");

    const cleanQuery = cleanString(query);

    const filtered = query.trim() === ''
        ? productos.slice(0, 50)
        : productos.filter(p => {
            const cleanNombre = cleanString(p.nombre);
            const cleanSku = cleanString(p.sku);
            return cleanNombre.includes(cleanQuery) || cleanSku.includes(cleanQuery);
        }).slice(0, 50);

    const selected = productos.find(p => p.id === value);

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between border rounded-xl px-3 py-2 text-left text-sm bg-white transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20
                    ${rowError ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'}
                    ${open ? 'ring-2 ring-brand-500/20 border-brand-500/50' : 'hover:border-slate-300'}`}
            >
                <span className={`truncate ${selected ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                    {selected ? `${selected.sku} - ${selected.nombre}` : 'Buscar por nombre o SKU...'}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
            </button>
            {open && (
                <div className="absolute z-50 left-0 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden min-w-[280px] md:min-w-[340px]">
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Escribe para buscar..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="text-xs text-slate-400 text-center py-3">Sin resultados</div>
                        ) : filtered.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                    onChange(p);
                                    setOpen(false);
                                    setQuery('');
                                }}
                                className={`w-full text-left px-3 py-2 text-xs truncate hover:bg-brand-50 transition-colors block
                                    ${value === p.id ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'}`}
                            >
                                <span className="font-semibold text-brand-800">{p.sku}</span> - {p.nombre} (Stock: {p.stockActual})
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function EntradasClient({ productos, recientes, orgId, userId }: any) {
    const [isPending, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
    const [showKardex, setShowKardex] = useState(false);

    // Single Entry form states
    const [formData, setFormData] = useState({
        productoId: '',
        cantidad: 1,
        motivo: 'Compra a Proveedor',
        referencia: ''
    });

    // Batch Entry grid states
    const [gridRows, setGridRows] = useState<EntryRow[]>([
        { id: '1', productoId: '', sku: '', nombre: '', cantidad: 1 }
    ]);
    const [batchFormData, setBatchFormData] = useState({
        motivo: 'Compra a Proveedor',
        referencia: ''
    });

    const isLoaded = useRef(false);

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedRows = localStorage.getItem('paraiso_floral_batch_rows');
            const savedForm = localStorage.getItem('paraiso_floral_batch_form_data');
            const savedTab = localStorage.getItem('paraiso_floral_entradas_active_tab');

            if (savedRows) {
                try {
                    const parsed = JSON.parse(savedRows);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setGridRows(parsed);
                    }
                } catch (e) {
                    console.error("Error parsing saved rows from localStorage", e);
                }
            }

            if (savedForm) {
                try {
                    const parsed = JSON.parse(savedForm);
                    if (parsed) {
                        setBatchFormData(parsed);
                    }
                } catch (e) {
                    console.error("Error parsing saved form from localStorage", e);
                }
            }

            if (savedTab === 'single' || savedTab === 'batch') {
                setActiveTab(savedTab);
            }

            isLoaded.current = true;
        }
    }, []);

    // Save to localStorage when gridRows change (only after initial load)
    useEffect(() => {
        if (isLoaded.current && typeof window !== 'undefined') {
            localStorage.setItem('paraiso_floral_batch_rows', JSON.stringify(gridRows));
        }
    }, [gridRows]);

    // Save to localStorage when batchFormData change (only after initial load)
    useEffect(() => {
        if (isLoaded.current && typeof window !== 'undefined') {
            localStorage.setItem('paraiso_floral_batch_form_data', JSON.stringify(batchFormData));
        }
    }, [batchFormData]);

    // Save to localStorage when activeTab changes (only after initial load)
    useEffect(() => {
        if (isLoaded.current && typeof window !== 'undefined') {
            localStorage.setItem('paraiso_floral_entradas_active_tab', activeTab);
        }
    }, [activeTab]);

    // Handle submit for single entry
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.productoId) {
            toast.error("Por favor seleccione un producto del catálogo.");
            return;
        }
        
        startTransition(async () => {
            const res = await registrarEntrada(orgId, userId, formData.productoId, formData.cantidad, formData.motivo, formData.referencia);
            if (res.success) {
                toast.success("Entrada registrada y stock actualizado.");
                setFormData({ ...formData, cantidad: 1, referencia: '' });
            } else {
                toast.error(res.error || "Ocurrió un error");
            }
        });
    };

    // Handle submit for batch entry
    const handleBatchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validRows = gridRows.filter(r => r.productoId !== '');
        if (validRows.length === 0) {
            toast.error("Por favor seleccione al menos un producto válido.");
            return;
        }

        const hasErrors = gridRows.some(r => r.productoId === '');
        if (hasErrors) {
            if (!confirm("Hay filas sin producto asignado o con errores. Si continúa, estas filas serán ignoradas. ¿Desea continuar?")) {
                return;
            }
        }

        // Final confirmation warning to prevent accidental submissions
        const count = validRows.reduce((acc, curr) => acc + curr.cantidad, 0);
        const typesCount = validRows.length;
        if (!confirm(`¿Estás seguro de que deseas registrar y aplicar este lote al inventario?\n\nSe ingresarán ${typesCount} tipos de flores con un total de ${count} unidades.`)) {
            return;
        }

        startTransition(async () => {
            const items = validRows.map(r => ({
                productoId: r.productoId,
                cantidad: r.cantidad
            }));

            const res = await registrarEntradasLote(orgId, userId, items, batchFormData.motivo, batchFormData.referencia);
            if (res.success) {
                toast.success("Ingreso por lote registrado y stock actualizado.");
                setGridRows([{ id: Math.random().toString(36).substring(2, 9), productoId: '', sku: '', nombre: '', cantidad: 1 }]);
                setBatchFormData({ motivo: 'Compra a Proveedor', referencia: '' });
            } else {
                toast.error(res.error || "Ocurrió un error");
            }
        });
    };

    // Prevent accidental submit on Enter
    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
            const target = e.target as HTMLElement;
            if (target.tagName !== 'BUTTON' && target.tagName !== 'A') {
                e.preventDefault();
            }
        }
    };

    // Grid row handlers
    const addRow = () => {
        setGridRows(prev => [
            ...prev,
            { id: Math.random().toString(36).substring(2, 9), productoId: '', sku: '', nombre: '', cantidad: 1 }
        ]);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                addRow();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const deleteRow = (index: number) => {
        const updated = gridRows.filter((_, i) => i !== index);
        setGridRows(updated.length > 0 ? updated : [{ id: Math.random().toString(36).substring(2, 9), productoId: '', sku: '', nombre: '', cantidad: 1 }]);
    };

    const updateRowProduct = (index: number, product: any) => {
        const updated = [...gridRows];
        updated[index] = {
            ...updated[index],
            productoId: product.id,
            sku: product.sku,
            nombre: product.nombre,
            error: undefined
        };
        setGridRows(updated);
    };

    const updateRowQuantity = (index: number, qty: number) => {
        const updated = [...gridRows];
        updated[index].cantidad = qty;
        setGridRows(updated);
    };

    const clearGrid = () => {
        if (confirm("¿Estás seguro de que deseas limpiar todas las filas de la tabla?")) {
            setGridRows([{ id: Math.random().toString(36).substring(2, 9), productoId: '', sku: '', nombre: '', cantidad: 1 }]);
        }
    };

    // CSV File Upload handler
    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsed = parseCSV(text, productos);
            if (parsed.length === 0) {
                toast.error("El archivo CSV no contiene datos válidos o el formato es incorrecto.");
                return;
            }
            setGridRows(parsed);
            toast.success(`Se han cargado ${parsed.length} filas desde el CSV.`);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const getDisplayUsuario = (usuario: any) => {
        if (!usuario) return 'Usuario';
        if (usuario.nombre) {
            return usuario.apellido ? `${usuario.nombre} ${usuario.apellido}` : usuario.nombre;
        }
        return usuario.email?.split('@')[0] || 'Usuario';
    };

    const getUsuarioInitials = (usuario: any) => {
        if (!usuario) return 'U';
        if (usuario.nombre) {
            const firstLetter = usuario.nombre.charAt(0).toUpperCase();
            const lastLetter = usuario.apellido ? usuario.apellido.charAt(0).toUpperCase() : '';
            return firstLetter + lastLetter;
        }
        return usuario.email?.charAt(0).toUpperCase() || 'U';
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
                <div className="p-2 bg-brand-100 rounded-xl">
                    <PackagePlus className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Registro de Entradas</h1>
                    <p className="text-sm text-slate-500 mt-1">Ingresa mercancía a la bodega y actualiza el kardex general.</p>
                </div>
            </div>

            {/* Tab Selector */}
            <div className="flex border-b border-slate-200 gap-6" id="tabs-entradas">
                <button
                    onClick={() => setActiveTab('single')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'single'
                            ? 'border-brand-600 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Save className="w-4 h-4" />
                    Entrada Simple
                </button>
                <button
                    onClick={() => setActiveTab('batch')}
                    className={`pb-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'batch'
                            ? 'border-brand-600 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Ingreso por Lote (Excel / CSV)
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* SINGLE PRODUCT FORM PANEL */}
                {activeTab === 'single' && (
                    <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Save className="w-4 h-4 text-slate-400" /> Nueva Entrada
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-5">
                            
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-sm font-medium text-slate-700">Producto / Modelo</label>
                                {productos.length === 0 ? (
                                    <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 text-center">
                                        No hay productos en el Catálogo Maestro. Crea uno primero.
                                    </div>
                                ) : (
                                    <select 
                                        required
                                        value={formData.productoId}
                                        onChange={(e) => setFormData({...formData, productoId: e.target.value})}
                                        className="w-full rounded-xl border-slate-200 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm h-11 px-3 bg-white"
                                    >
                                        <option value="" disabled>Seleccionar producto...</option>
                                        {productos.map((p: any) => (
                                            <option key={p.id} value={p.id}>
                                                {p.sku} - {p.nombre} (Stock: {p.stockActual})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-sm font-medium text-slate-700">Cantidad</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        required
                                        value={formData.cantidad}
                                        onChange={(e) => setFormData({...formData, cantidad: parseInt(e.target.value) || 0})}
                                        className="w-full rounded-xl border-slate-200 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm h-11 px-3"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-sm font-medium text-slate-700">Ref. (Opcional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Fact. #1234"
                                        value={formData.referencia}
                                        onChange={(e) => setFormData({...formData, referencia: e.target.value})}
                                        className="w-full rounded-xl border-slate-200 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm h-11 px-3"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-sm font-medium text-slate-700">Motivo</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.motivo}
                                    onChange={(e) => setFormData({...formData, motivo: e.target.value})}
                                    className="w-full rounded-xl border-slate-200 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm h-11 px-3"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isPending || productos.length === 0}
                                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all shadow-sm
                                    ${isPending || productos.length === 0 ? 'bg-brand-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 hover:shadow-md hover:shadow-brand-500/20 active:scale-[0.98]'}`}
                            >
                                {isPending ? 'Procesando...' : 'Aplicar Ingreso'}
                                {!isPending && <Check className="w-4 h-4" />}
                            </button>
                        </form>
                    </div>
                )}

                {/* BATCH PRODUCT FORM PANEL (EXCEL STYLE GRID) */}
                {activeTab === 'batch' && (
                    <div className={`${showKardex ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit flex flex-col`}>
                        
                        {/* Grid Header & CSV Loading */}
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-brand-600" /> Registro en Cuadrícula
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setShowKardex(!showKardex)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none
                                        ${showKardex 
                                            ? 'bg-slate-100 border-slate-300 text-slate-700' 
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Info className="w-3.5 h-3.5" />
                                    {showKardex ? 'Ocultar Historial' : 'Ver Historial (Kardex)'}
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Download Template */}
                                <a
                                    href="/plantilla_ingreso_paraiso_floral.csv"
                                    download
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl transition-colors cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Descargar Plantilla CSV
                                </a>
                                
                                {/* Upload CSV */}
                                <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95">
                                    <Upload className="w-3.5 h-3.5" />
                                    Cargar CSV
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleCSVUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Editable Grid Table */}
                        <form onSubmit={handleBatchSubmit} onKeyDown={handleFormKeyDown} className="flex flex-col">
                            <div className="border-b border-slate-200">
                                <table className="w-full text-sm text-left border-collapse border border-slate-200">
                                    <thead className="text-xs text-slate-600 bg-slate-100 uppercase sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 font-bold text-center w-12 border border-slate-200 bg-slate-100">#</th>
                                            <th className="px-4 py-3 font-bold min-w-[280px] border border-slate-200 bg-slate-100">Producto</th>
                                            <th className="px-4 py-3 font-bold w-36 border border-slate-200 bg-slate-100">SKU / Código</th>
                                            <th className="px-4 py-3 font-bold w-28 text-right border border-slate-200 bg-slate-100">Cantidad</th>
                                            <th className="px-4 py-3 font-bold w-12 text-center border border-slate-200 bg-slate-100"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {gridRows.map((row, index) => (
                                            <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs border border-slate-200 bg-slate-50/50">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 py-3 border border-slate-200">
                                                    <ProductCell
                                                        productos={productos}
                                                        value={row.productoId}
                                                        onChange={(p) => updateRowProduct(index, p)}
                                                        rowError={row.error}
                                                    />
                                                    {row.error && (
                                                        <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-1">
                                                            <AlertTriangle className="w-3 h-3 shrink-0" />
                                                            {row.error}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-500 border border-slate-200 bg-slate-50/20">
                                                    {row.sku || <span className="text-slate-300 italic">Por seleccionar</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right border border-slate-200">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        required
                                                        value={row.cantidad}
                                                        onChange={(e) => updateRowQuantity(index, parseInt(e.target.value) || 0)}
                                                        className="w-full rounded-xl border border-slate-200 shadow-2xs focus:border-brand-500 focus:ring-brand-500 text-sm h-10 px-2 text-right font-mono"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center border border-slate-200">
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteRow(index)}
                                                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar fila"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Grid Controls */}
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/30">
                                <button
                                    type="button"
                                    onClick={addRow}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4 text-brand-600" />
                                    Añadir Fila
                                </button>
                                <button
                                    type="button"
                                    onClick={clearGrid}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Limpiar Tabla
                                </button>
                            </div>

                            {/* Batch general details */}
                            <div className="p-5 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-sm font-medium text-slate-700">Referencia / Factura</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: Factura #9876, Dnivel"
                                        value={batchFormData.referencia}
                                        onChange={(e) => setBatchFormData({...batchFormData, referencia: e.target.value})}
                                        className="w-full rounded-xl border border-slate-200 bg-white shadow-2xs focus:border-brand-500 focus:ring-brand-500 sm:text-sm h-11 px-3"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-sm font-medium text-slate-700">Motivo del Lote</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={batchFormData.motivo}
                                        onChange={(e) => setBatchFormData({...batchFormData, motivo: e.target.value})}
                                        className="w-full rounded-xl border border-slate-200 bg-white shadow-2xs focus:border-brand-500 focus:ring-brand-500 sm:text-sm h-11 px-3"
                                    />
                                </div>
                            </div>

                            {/* Save Actions */}
                            <div className="p-5 bg-white flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isPending || productos.length === 0}
                                    className={`flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-bold text-white transition-all shadow-sm w-full sm:w-auto
                                        ${isPending || productos.length === 0 ? 'bg-brand-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 hover:shadow-md hover:shadow-brand-500/20 active:scale-[0.98]'}`}
                                >
                                    {isPending ? 'Procesando Lote...' : 'Aplicar Ingreso por Lote'}
                                    {!isPending && <Check className="w-4 h-4" />}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* RECENT MOVEMENTS PANEL */}
                {(activeTab === 'single' || showKardex) && (
                    <div className={activeTab === 'single' ? "lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" : "lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"}>
                         <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Info className="w-4 h-4 text-slate-400" /> Últimos Ingresos (Kardex)
                            </h2>
                            {recientes.length > 0 && (
                                <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
                                    Últimos {recientes.length}
                                </span>
                            )}
                        </div>
                        
                        {recientes.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-inner">
                                    <PackagePlus className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="text-slate-500 text-sm font-medium">No hay ingresos registrados aún.</p>
                                <p className="text-slate-400 text-xs mt-1">Registra la primera entrada usando el panel izquierdo.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase border-b border-slate-100">
                                        <tr>
                                            <th className="px-5 py-3.5 font-semibold">Fecha</th>
                                            <th className="px-5 py-3.5 font-semibold">Producto</th>
                                            <th className="px-5 py-3.5 font-semibold text-right">Cant.</th>
                                            {activeTab === 'single' && (
                                                <>
                                                    <th className="px-5 py-3.5 font-semibold hidden md:table-cell">Motivo / Ref</th>
                                                    <th className="px-5 py-3.5 font-semibold hidden xl:table-cell">Usuario</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {recientes.map((mov: any) => (
                                            <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                                                    {new Date(mov.createdAt).toLocaleDateString('es-HN')}
                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(mov.createdAt).toLocaleTimeString('es-HN', {hour: '2-digit', minute:'2-digit'})}</div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <p className="font-medium text-slate-800 line-clamp-1">{mov.producto?.nombre}</p>
                                                    <p className="text-xs text-slate-400 font-mono mt-0.5">{mov.producto?.sku}</p>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        +{mov.cantidad}
                                                    </span>
                                                </td>
                                                {activeTab === 'single' && (
                                                    <>
                                                        <td className="px-5 py-3 hidden md:table-cell">
                                                            <p className="text-slate-700 truncate max-w-[150px] md:max-w-[200px] text-sm">{mov.motivo}</p>
                                                            {mov.referencia && <p className="text-[11px] text-slate-400 font-mono mt-0.5">Ref: {mov.referencia}</p>}
                                                        </td>
                                                        <td className="px-5 py-3 hidden xl:table-cell">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold border border-slate-200">
                                                                    {getUsuarioInitials(mov.usuario)}
                                                                </div>
                                                                <span className="text-slate-500 text-xs truncate max-w-[120px]" title={getDisplayUsuario(mov.usuario)}>
                                                                    {getDisplayUsuario(mov.usuario)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
