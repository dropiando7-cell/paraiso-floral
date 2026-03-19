'use client';

import React, { useState, useEffect } from 'react';
import { getCompanyProfile } from '../../configuracion/actions';
import { 
    Calculator, 
    Calendar, 
    ChevronLeft, 
    FileText, 
    Plus, 
    Printer, 
    Save, 
    Trash2, 
    User
} from 'lucide-react';
import Link from 'next/link';

export default function NuevaFacturaPage() {
    const [items, setItems] = useState([
        { id: 1, cantidad: 1, descripcion: '', precioUnitario: 0, total: 0 }
    ]);
    const [companyProfile, setCompanyProfile] = useState<{name: string, direccion: string, telefono: string, correoContacto: string, rtn: string, logoUrl: string} | null>(null);

    useEffect(() => {
        async function loadProfile() {
            const profile = await getCompanyProfile();
            if (profile) setCompanyProfile(profile);
        }
        loadProfile();
    }, []);

    const addItem = () => {
        setItems([...items, { id: Date.now(), cantidad: 1, descripcion: '', precioUnitario: 0, total: 0 }]);
    };

    const removeItem = (id: number) => {
        setItems(items.filter(item => item.id !== id));
    };

    return (
        <div className="w-full max-w-5xl mx-auto pb-12">
            {/* Encabezado de Página */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-6 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/facturas" className="text-slate-500 hover:text-brand-600 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nueva Factura</h1>
                    </div>
                    <p className="text-slate-500 text-sm ml-7">Formato aprobado por el SAR (Honduras)</p>
                </div>
                
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg font-medium transition-all shadow-sm">
                        <Printer className="w-4 h-4 text-slate-500" />
                        Imprimir Formato
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-all shadow-sm shadow-brand-500/20">
                        <Save className="w-4 h-4 border-white" />
                        Guardar Factura
                    </button>
                </div>
            </div>

            {/* Contenedor Principal (Estilo v0 Cards) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Visualización de la Factura (Papel) */}
                <div className="lg:col-span-12">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        
                        {/* Cabecera de Empresa (Logo y Datos) */}
                        <div className="p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start gap-6">
                            <div className="flex items-start gap-4">
                                {companyProfile?.logoUrl ? (
                                    <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-sm border border-slate-200 bg-white overflow-hidden shrink-0">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={companyProfile.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 bg-brand-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0">
                                        {companyProfile?.name ? companyProfile.name.substring(0,2).toUpperCase() : 'BE'}
                                    </div>
                                )}
                                <div>
                                    {companyProfile ? (
                                        <>
                                            <h2 className="text-xl font-bold text-slate-900 uppercase">{companyProfile.name}</h2>
                                            <p className="text-slate-500 text-sm mt-1 max-w-md whitespace-pre-line">
                                                {companyProfile.direccion}
                                                {companyProfile.rtn && <><br/>R.T.N. {companyProfile.rtn}</>}
                                                {companyProfile.telefono && <><br/>Tel: {companyProfile.telefono}</>}
                                                {companyProfile.correoContacto && <><br/>Email: {companyProfile.correoContacto}</>}
                                            </p>
                                        </>
                                    ) : (
                                        <div className="animate-pulse space-y-2">
                                            <div className="h-6 bg-slate-200 rounded w-64"></div>
                                            <div className="h-4 bg-slate-200 rounded w-48"></div>
                                            <div className="h-4 bg-slate-200 rounded w-32"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-right min-w-[200px]">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">FACTURA</p>
                                <p className="text-xl font-bold text-brand-600">000-001-01-00</p>
                                <p className="text-2xl font-black text-slate-900 mt-1">Nº <span className="text-red-500">003557</span></p>
                            </div>
                        </div>

                        {/* Datos del Cliente */}
                        <div className="p-8 border-b border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                {/* Cliente */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Cliente</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <input type="text" className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 bg-white" placeholder="Nombre completo del cliente" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Dirección</label>
                                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 bg-white" placeholder="Dirección del cliente" />
                                    </div>
                                </div>

                                {/* Extra Info */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Teléfono</label>
                                            <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 bg-white" placeholder="+504" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Fecha</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                </div>
                                                <input type="date" className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 bg-white" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">R.T.N. Cliente</label>
                                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 bg-white" placeholder="0000-0000-00000" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabla de Productos / Detalles */}
                        <div>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100/50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-6 py-4 w-24">Cant.</th>
                                        <th className="px-6 py-4">Descripción</th>
                                        <th className="px-6 py-4 w-40 text-right">P. Unitario</th>
                                        <th className="px-6 py-4 w-40 text-right">Total Lps.</th>
                                        <th className="px-6 py-4 w-12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id} className="border-b border-slate-100 group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-3">
                                                <input type="number" min="1" defaultValue="1" className="w-full px-2 py-1.5 border border-transparent hover:border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded bg-transparent text-slate-900" />
                                            </td>
                                            <td className="px-6 py-3">
                                                <input type="text" placeholder="Concepto o descripción..." className="w-full px-2 py-1.5 border border-transparent hover:border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded bg-transparent text-slate-900" />
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <input type="number" min="0" step="0.01" placeholder="0.00" className="w-full px-2 py-1.5 border border-transparent hover:border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded bg-transparent text-right text-slate-900" />
                                            </td>
                                            <td className="px-6 py-3 text-right font-medium text-slate-700">
                                                L. 0.00
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 border-b border-slate-200 bg-slate-50">
                                <button onClick={addItem} className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors px-4 py-2 hover:bg-brand-50 rounded-lg">
                                    <Plus className="w-4 h-4" />
                                    Agregar Línea
                                </button>
                            </div>
                        </div>

                        {/* Totales y Datos Fiscales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 flex-col-reverse">
                            {/* Datos SAR (Izquierda) */}
                            <div className="p-6 border-r border-slate-200 bg-white">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Datos del Adquiriente Exonerado</p>
                                        <div className="space-y-2">
                                            <input type="text" placeholder="No. Correlativo de Orden de Compra Exenta" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 focus:bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                                            <input type="text" placeholder="No. Correlativo de Constancia de Registro Exonerado" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 focus:bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                                            <input type="text" placeholder="No. Identificativo del Registro SAG" className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 focus:bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                                        </div>
                                    </div>
                                    <div className="bg-slate-100 p-4 rounded-lg mt-4 text-xs text-slate-600">
                                        <p className="font-bold text-slate-800 mb-1">Rango Autorizado:</p>
                                        <p>000-001-01-00003451 al 000-001-01-00003700</p>
                                        <p className="font-bold text-slate-800 mt-2 mb-1">CAI:</p>
                                        <p className="font-mono text-[10px] break-words">3E6532-DDC3F3-AC2EE0-63BE03-090941-4C</p>
                                        <p className="mt-2 text-slate-400">Fecha Límite Emisión: 09/09/2026</p>
                                    </div>
                                </div>
                            </div>

                            {/* Totales (Derecha) */}
                            <div className="bg-slate-50">
                                <div className="p-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-sm text-slate-600">Sub-Total L.</span>
                                            <span className="font-medium text-slate-900">0.00</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-sm text-slate-600">Total Descuentos y Rebajas L.</span>
                                            <span className="font-medium text-slate-900">0.00</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1 border-t border-slate-200 pt-2">
                                            <span className="text-sm text-slate-600">Total Exento L.</span>
                                            <span className="font-medium text-slate-900">0.00</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-sm text-slate-600">Total Exonerado L.</span>
                                            <span className="font-medium text-slate-900">0.00</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-sm text-slate-600">Total Gravado 15% L.</span>
                                            <span className="font-medium text-slate-900">0.00</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-sm text-slate-600 text-brand-600 font-bold">Total ISV 15% L.</span>
                                            <span className="font-medium text-brand-600 font-bold">0.00</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-sm text-slate-600">Total Gravado 18% L.</span>
                                            <span className="font-medium text-slate-900">0.00</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-sm text-slate-600 text-brand-600 font-bold">Total ISV 18% L.</span>
                                            <span className="font-medium text-brand-600 font-bold">0.00</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 pt-4 border-t-2 border-slate-900 flex justify-between items-center">
                                        <span className="text-lg font-black text-slate-900 uppercase tracking-widest">Total L.</span>
                                        <span className="text-2xl font-black text-slate-900">0.00</span>
                                    </div>
                                    
                                    <div className="mt-6">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Son:</label>
                                        <textarea 
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white resize-none focus:outline-none focus:ring-1 focus:ring-brand-500" 
                                            placeholder="CANTIDAD EN LETRAS"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
