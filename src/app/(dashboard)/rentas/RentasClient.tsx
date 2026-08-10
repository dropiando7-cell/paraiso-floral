'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Package, Calendar, User as UserIcon, CheckCircle2, AlertTriangle, ArrowRightLeft, DollarSign, Clock, Edit2, Trash2, XCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { returnRenta, editRenta, cancelRenta } from './actions';

export default function RentasClient({ initialRentas }: { initialRentas: any[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [editingRenta, setEditingRenta] = useState<any | null>(null);
    const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('EN_RENTA');
    const [searchTerm, setSearchTerm] = useState('');

    const getRentaFilterStatus = (renta: any) => {
        if (renta.estado === 'CANCELADA') return 'CANCELADA';
        if (renta.estado === 'DEVUELTO') return 'DEVUELTO';

        const isOverdue = new Date() > new Date(renta.fechaFinEsperada);
        if (isOverdue) return 'VENCIDA';

        const tresDias = new Date();
        tresDias.setDate(tresDias.getDate() + 3);
        const isExpiringSoon = new Date(renta.fechaFinEsperada) <= tresDias;
        if (isExpiringSoon) return 'POR_VENCER';

        if (renta.estado === 'PENDIENTE_FIRMA') return 'PENDIENTE_FIRMA';
        return 'ACTIVA';
    };

    const getOverdueDays = (renta: any) => {
        if (renta.estado === 'CANCELADA' || renta.estado === 'DEVUELTO') return 0;
        const today = new Date();
        today.setHours(0,0,0,0);
        const dueDate = new Date(renta.fechaFinEsperada);
        dueDate.setHours(0,0,0,0);
        if (today > dueDate) {
            const diffTime = today.getTime() - dueDate.getTime();
            return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        }
        return 0;
    };

    const getPaymentDelays = (renta: any) => {
        const pagos = [...(renta.pagos || [])]
            .filter((p: any) => !p.notes?.includes('Depósito en Garantía') && !p.notas?.includes('Depósito en Garantía'))
            .sort((a: any, b: any) => new Date(a.fechaPago).getTime() - new Date(b.fechaPago).getTime());

        const pagoMensual = renta.costoRenta / (renta.mesesRenta || 1);
        const startDate = new Date(renta.fechaInicio);
        
        let runningTotal = 0;
        const delays: { cycleIndex: number; dueDate: Date; paidDate: Date; daysLate: number }[] = [];

        let paymentIndex = 0;
        
        const msPerDay = 1000 * 60 * 60 * 24;
        const endDate = renta.fechaDevolucion ? new Date(renta.fechaDevolucion) : new Date();
        const diasTranscurridos = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay));
        const mesesTranscurridos = diasTranscurridos / 30.44;
        const numCyclesToCheck = Math.max(renta.mesesRenta || 1, Math.ceil(mesesTranscurridos));

        for (let i = 0; i < numCyclesToCheck; i++) {
            const cycleDueDate = new Date(startDate);
            if (renta.tipoAlquiler === 'Quincenal') {
                cycleDueDate.setUTCDate(startDate.getUTCDate() + (i * 15));
            } else if (renta.tipoAlquiler === 'Anual') {
                cycleDueDate.setUTCFullYear(startDate.getUTCFullYear() + i);
            } else { // 'Mensual'
                cycleDueDate.setUTCMonth(startDate.getUTCMonth() + i);
            }
            cycleDueDate.setUTCHours(0,0,0,0);

            const targetAmount = (i + 1) * pagoMensual;
            
            while (runningTotal < targetAmount && paymentIndex < pagos.length) {
                runningTotal += Number(pagos[paymentIndex].monto);
                paymentIndex++;
            }

            if (runningTotal >= targetAmount) {
                const paymentDate = new Date(pagos[paymentIndex - 1].fechaPago);
                paymentDate.setUTCHours(0,0,0,0);
                
                const diffTime = paymentDate.getTime() - cycleDueDate.getTime();
                const daysLate = Math.floor(diffTime / msPerDay);
                if (daysLate > 0) {
                    delays.push({
                        cycleIndex: i,
                        dueDate: cycleDueDate,
                        paidDate: paymentDate,
                        daysLate
                    });
                }
            }
        }
        return delays;
    };

    const getCycleLabel = (renta: any, index: number) => {
        const startDate = new Date(renta.fechaInicio);
        const cycleDate = new Date(startDate);
        if (renta.tipoAlquiler === 'Quincenal') {
            cycleDate.setUTCDate(startDate.getUTCDate() + (index * 15));
        } else if (renta.tipoAlquiler === 'Anual') {
            cycleDate.setUTCFullYear(startDate.getUTCFullYear() + index);
        } else { // 'Mensual'
            cycleDate.setUTCMonth(startDate.getUTCMonth() + index);
        }
        const monthsName = [
            'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
        ];
        return `${monthsName[cycleDate.getUTCMonth()]} (${cycleDate.getUTCDate()}/${cycleDate.getUTCMonth() + 1})`;
    };

    const counts = {
        ALL: initialRentas.filter(r => r.estado !== 'CANCELADA').length,
        EN_RENTA: initialRentas.filter(r => r.estado !== 'DEVUELTO' && r.estado !== 'CANCELADA').length,
        ACTIVA: initialRentas.filter(r => getRentaFilterStatus(r) === 'ACTIVA').length,
        PENDIENTE_FIRMA: initialRentas.filter(r => getRentaFilterStatus(r) === 'PENDIENTE_FIRMA').length,
        POR_VENCER: initialRentas.filter(r => getRentaFilterStatus(r) === 'POR_VENCER').length,
        VENCIDA: initialRentas.filter(r => getRentaFilterStatus(r) === 'VENCIDA').length,
        DEVUELTO: initialRentas.filter(r => getRentaFilterStatus(r) === 'DEVUELTO').length,
        CANCELADA: initialRentas.filter(r => getRentaFilterStatus(r) === 'CANCELADA').length,
    };

    const displayedRentas = initialRentas.filter(r => {
        const status = getRentaFilterStatus(r);
        let matchesStatus = false;
        if (selectedStatus === 'ALL') {
            matchesStatus = r.estado !== 'CANCELADA';
        } else if (selectedStatus === 'EN_RENTA') {
            matchesStatus = r.estado !== 'DEVUELTO' && r.estado !== 'CANCELADA';
        } else {
            matchesStatus = status === selectedStatus;
        }

        const matchesSearch = searchTerm.trim() === '' || 
            r.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.activoFijo?.descripcionCorta?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.activoFijo?.serie?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesStatus && matchesSearch;
    });

    const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const payload = {
            tipoAlquiler: formData.get('tipoAlquiler') as string,
            mesesRenta: Number(formData.get('mesesRenta')),
            costoRenta: Number(formData.get('costoRenta')),
            deposito: Number(formData.get('deposito')),
            fechaFinEsperada: new Date(formData.get('fechaFinEsperada') as string),
        };

        startTransition(async () => {
            try {
                await editRenta(editingRenta.id, payload);
                setEditingRenta(null);
                router.refresh();
            } catch (e) {
                alert('Error al actualizar la renta');
            }
        });
    };

    const confirmAndExecuteCancel = () => {
        if (!confirmCancelId) return;
        startTransition(async () => {
            try {
                await cancelRenta(confirmCancelId);
                setConfirmCancelId(null);
                router.refresh();
            } catch (e) {
                alert('Error al anular la renta');
            }
        });
    };

    function getStatusBadge(estado: string, fechaFinEsperada: Date) {
        if (estado === 'CANCELADA') {
            return (
                <span 
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStatus('CANCELADA');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer transition-colors whitespace-nowrap"
                    title="Filtrar por Anuladas"
                >
                    <XCircle className="w-3 h-3" /> Anulada
                </span>
            );
        }

        if (estado === 'DEVUELTO') {
            return (
                <span 
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStatus('DEVUELTO');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors whitespace-nowrap"
                    title="Filtrar por Devueltas"
                >
                    <CheckCircle2 className="w-3 h-3" /> Devuelto
                </span>
            );
        }

        const isOverdue = new Date() > new Date(fechaFinEsperada);
        if (isOverdue) {
            return (
                <span 
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStatus('VENCIDA');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer transition-colors animate-pulse whitespace-nowrap"
                    title="Filtrar por Vencidas"
                >
                    <AlertTriangle className="w-3 h-3" /> Vencida
                </span>
            );
        }

        const tresDias = new Date();
        tresDias.setDate(tresDias.getDate() + 3);
        const isExpiringSoon = new Date(fechaFinEsperada) <= tresDias;

        if (isExpiringSoon) {
            return (
                <span 
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStatus('POR_VENCER');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer transition-colors whitespace-nowrap"
                    title="Filtrar por Por Vencer"
                >
                    <AlertTriangle className="w-3 h-3" /> Por Vencer
                </span>
            );
        }

        if (estado === 'PENDIENTE_FIRMA') {
            return (
                <span 
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStatus('PENDIENTE_FIRMA');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer transition-colors whitespace-nowrap"
                    title="Filtrar por Pendiente de Firma"
                >
                    <Clock className="w-3 h-3" /> Pend. Firma
                </span>
            );
        }

        return (
            <span 
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStatus('ACTIVA');
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#0500A3] hover:bg-blue-200 cursor-pointer transition-colors whitespace-nowrap"
                title="Filtrar por Activas"
            >
                <CheckCircle2 className="w-3 h-3" /> Activa
            </span>
        );
    }

    const statuses = [
        { id: 'EN_RENTA', label: 'En Renta', icon: Package, activeColor: 'bg-[#0500A3] text-white', inactiveColor: 'text-slate-600 hover:text-[#0500A3] hover:bg-blue-50/50' },
        { id: 'ALL', label: 'Todos', icon: ArrowRightLeft, activeColor: 'bg-slate-700 text-white', inactiveColor: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' },
        { id: 'PENDIENTE_FIRMA', label: 'Pend. Firma', icon: FileText, activeColor: 'bg-amber-600 text-white', inactiveColor: 'text-amber-700 hover:text-amber-900 hover:bg-amber-50' },
        { id: 'POR_VENCER', label: 'Por Vencer', icon: Clock, activeColor: 'bg-orange-600 text-white', inactiveColor: 'text-orange-700 hover:text-orange-900 hover:bg-orange-50' },
        { id: 'VENCIDA', label: 'Vencidas', icon: AlertTriangle, activeColor: 'bg-red-600 text-white', inactiveColor: 'text-red-700 hover:text-red-900 hover:bg-red-50' },
        { id: 'DEVUELTO', label: 'Devueltas', icon: CheckCircle2, activeColor: 'bg-slate-700 text-white', inactiveColor: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' },
        { id: 'CANCELADA', label: 'Anuladas', icon: XCircle, activeColor: 'bg-rose-600 text-white', inactiveColor: 'text-rose-600 hover:text-rose-800 hover:bg-rose-50' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <ArrowRightLeft className="w-8 h-8 text-[#0500A3]" />
                        Rentas de Equipos
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Control de arrendamiento de equipo médico a clínicas y doctores</p>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                    <Link 
                        href="/rentas/equipos"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
                    >
                        <Package className="w-5 h-5" />
                        Equipos
                    </Link>
                    <Link 
                        href="/rentas/nueva"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#0500A3] hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Renta
                    </Link>
                </div>
            </div>

            {/* Filtros y Buscador */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-4">
                <div className="flex flex-col gap-4">
                    {/* Fila superior: buscador e historial */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        {/* Buscador */}
                        <div className="relative w-full sm:max-w-md">
                            <input
                                type="text"
                                placeholder="Buscar por cliente o equipo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none focus:border-[#0500A3] focus:bg-white transition-all text-slate-700 shadow-sm"
                            />
                            <svg
                                className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 text-lg font-bold"
                                >
                                    &times;
                                </button>
                            )}
                        </div>

                        {/* Botón Historial de Anuladas */}
                        <button 
                            onClick={() => setSelectedStatus(selectedStatus === 'CANCELADA' ? 'ALL' : 'CANCELADA')}
                            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 border shrink-0 w-full sm:w-auto justify-center ${
                                selectedStatus === 'CANCELADA'
                                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <XCircle className="w-4 h-4" />
                            {selectedStatus === 'CANCELADA' ? 'Ocultar Anuladas' : 'Ver Historial de Anuladas'}
                        </button>
                    </div>

                    {/* Fila inferior: Segmented Control en una sola línea */}
                    <div className="bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 py-0.5">
                            {statuses.map(status => {
                                const Icon = status.icon;
                                const isActive = selectedStatus === status.id;
                                const count = counts[status.id as keyof typeof counts] || 0;
                                return (
                                    <button
                                        key={status.id}
                                        onClick={() => setSelectedStatus(status.id)}
                                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 shrink-0 ${
                                            isActive 
                                                ? `${status.activeColor} shadow-sm` 
                                                : `${status.inactiveColor}`
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5 shrink-0" />
                                        {status.label}
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                            isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600 border border-slate-350/10'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-4 font-semibold">Cliente</th>
                                <th className="px-5 py-4 font-semibold">Equipo Rentado</th>
                                <th className="px-5 py-4 font-semibold whitespace-nowrap">Fechas</th>
                                <th className="px-5 py-4 font-semibold whitespace-nowrap">Costo Total</th>
                                <th className="px-5 py-4 font-semibold whitespace-nowrap">Estado</th>
                                <th className="px-5 py-4 font-semibold text-right whitespace-nowrap">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedRentas.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="font-semibold text-lg text-slate-700">
                                            {selectedStatus === 'CANCELADA' 
                                                ? 'No hay rentas anuladas' 
                                                : selectedStatus === 'EN_RENTA'
                                                    ? 'No hay equipos rentados actualmente'
                                                    : selectedStatus !== 'ALL' 
                                                        ? 'No hay rentas con este estado' 
                                                        : 'No hay rentas registradas'}
                                        </p>
                                        <p className="text-sm mt-1">
                                            {selectedStatus === 'CANCELADA' 
                                                ? 'Aquí aparecerá el historial de rentas que han sido canceladas.' 
                                                : selectedStatus === 'EN_RENTA'
                                                    ? 'Todos los equipos alquilados han sido devueltos al inventario.'
                                                    : selectedStatus !== 'ALL'
                                                        ? 'No se encontraron registros de renta con el estado seleccionado.'
                                                        : 'Presiona "Nueva Renta" para registrar un arrendamiento.'}
                                        </p>
                                    </td>
                                </tr>
                            ) : displayedRentas.map(renta => (
                                <tr key={renta.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-800 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0500A3] flex items-center justify-center font-bold text-xs shrink-0">
                                                {renta.cliente?.nombre?.substring(0, 2).toUpperCase() || 'CX'}
                                            </div>
                                            <span className="truncate max-w-[150px]">{renta.cliente?.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="font-semibold text-[#0500A3]">{renta.activoFijo?.descripcionCorta}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">S/N: {renta.activoFijo?.serie || 'N/A'}</div>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1 text-xs">
                                            <span className="text-slate-600"><span className="font-semibold text-slate-400">Sale:</span> {new Date(renta.fechaInicio).toLocaleDateString()}</span>
                                            <span className="text-slate-800 font-semibold"><span className="font-semibold text-slate-400">Vence:</span> {new Date(renta.fechaFinEsperada).toLocaleDateString()}</span>
                                            {(() => {
                                                const overdueDays = getOverdueDays(renta);
                                                const delays = getPaymentDelays(renta);
                                                return (
                                                    <>
                                                        {overdueDays > 0 && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded px-1.5 py-0.5 mt-1 w-fit">
                                                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                                Vencida por {overdueDays} {overdueDays === 1 ? 'día' : 'días'}
                                                            </span>
                                                        )}
                                                        {delays.length > 0 && (
                                                            <div className="flex flex-col gap-0.5 mt-1 border-t border-slate-100 pt-1">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Abonos Tardíos:</span>
                                                                {delays.slice(-2).map((delay, idx) => (
                                                                    <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 w-fit">
                                                                        <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                                                                        +{delay.daysLate} {delay.daysLate === 1 ? 'día' : 'días'} ({getCycleLabel(renta, delay.cycleIndex)})
                                                                    </span>
                                                                ))}
                                                                {delays.length > 2 && (
                                                                    <span className="text-[9px] text-slate-400 italic pl-1">
                                                                        ... y {delays.length - 2} más
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="font-bold text-emerald-700 whitespace-nowrap">L. {Number(renta.costoRenta).toLocaleString('en-US')}</div>
                                        {Number(renta.deposito) > 0 && <div className="text-[10px] text-slate-500 font-semibold whitespace-nowrap">Depósito: L. {Number(renta.deposito).toLocaleString('en-US')}</div>}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        {getStatusBadge(renta.estado, renta.fechaFinEsperada)}
                                    </td>
                                    <td className="px-5 py-4 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1.5 sm:gap-2 whitespace-nowrap">
                                            {renta.estado !== 'CANCELADA' && (
                                                <Link 
                                                    href={`/rentas/${renta.id}/contrato`}
                                                    target="_blank"
                                                    className="text-slate-500 hover:text-[#0500A3] p-1.5 rounded-md hover:bg-blue-50 transition-colors shrink-0"
                                                    title="Imprimir / Vista Previa Contrato"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </Link>
                                            )}
                                            {(renta.estado === 'ACTIVA' || renta.estado === 'PENDIENTE_FIRMA') && (
                                                <>
                                                    <button 
                                                        onClick={() => setEditingRenta(renta)}
                                                        className="text-slate-500 hover:text-[#0500A3] p-1.5 rounded-md hover:bg-blue-50 transition-colors shrink-0"
                                                        title="Editar Renta"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfirmCancelId(renta.id)}
                                                        className="text-slate-500 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors shrink-0"
                                                        title="Anular Renta"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            
                                            <Link 
                                                href={`/rentas/${renta.id}/pagos`}
                                                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                                                title="Estado de Cuenta / Pagos"
                                            >
                                                💰 Pagos
                                            </Link>

                                            {renta.estado === 'ACTIVA' && (
                                                <Link 
                                                    href={`/rentas/${renta.id}/recepcion`}
                                                    className="text-[11px] font-bold text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                                                >
                                                    Recibir Equipo
                                                </Link>
                                            )}

                                            {renta.estado === 'PENDIENTE_FIRMA' && (
                                                <Link 
                                                    href={`/rentas/${renta.id}/firma`}
                                                    className="text-[11px] font-bold text-white bg-[#0500A3] hover:bg-blue-800 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0"
                                                >
                                                    Completar Firma
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingRenta && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-[#0500A3]" /> Editar Renta
                            </h3>
                            <button onClick={() => setEditingRenta(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Alquiler</label>
                                    <select name="tipoAlquiler" defaultValue={editingRenta.tipoAlquiler} className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0500A3]">
                                        <option value="Semanal">Semanal (1 semana - L. 2,500)</option>
                                        <option value="Quincenal">Quincenal (2 semanas - L. 2,500)</option>
                                        <option value="Mensual">Mensual (30 días - L. 3,500)</option>
                                        <option value="Anual">Anual (12 meses)</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Meses/Periodos</label>
                                    <input type="number" name="mesesRenta" defaultValue={editingRenta.mesesRenta} className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0500A3]" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Costo Total (L.)</label>
                                    <input type="number" name="costoRenta" defaultValue={editingRenta.costoRenta} className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 outline-none focus:border-[#0500A3]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Depósito (L.)</label>
                                    <input type="number" name="deposito" defaultValue={editingRenta.deposito} className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0500A3]" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Fecha Esperada de Devolución</label>
                                <input type="date" name="fechaFinEsperada" defaultValue={new Date(editingRenta.fechaFinEsperada).toISOString().split('T')[0]} className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0500A3]" />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setEditingRenta(null)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" disabled={isPending} className="bg-[#0500A3] hover:bg-blue-800 text-white px-5 py-2 rounded-lg font-bold transition-all disabled:opacity-50">
                                    {isPending ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Confirmation Cancel Modal */}
            {confirmCancelId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all border border-slate-100">
                        <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-red-50">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-100 p-2.5 rounded-full shrink-0">
                                    <Trash2 className="w-6 h-6 text-red-600" />
                                </div>
                                <h3 className="text-xl font-bold text-red-900">Anular Renta</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 text-[15px] leading-relaxed">
                                ¿Estás seguro de que deseas anular esta renta?
                            </p>
                            <p className="text-sm text-slate-500 mt-3 p-3 bg-red-50/50 rounded-xl border border-red-100 text-red-800">
                                Esta acción marcará la renta como <strong>CANCELADA</strong> y liberará el equipo para que vuelva a estar disponible en el inventario. Se guardará un registro inmutable de esta anulación para propósitos de auditoría.
                            </p>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setConfirmCancelId(null)}
                                    disabled={isPending}
                                    className="flex-1 py-3 px-4 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors active:scale-95 disabled:opacity-50"
                                >
                                    Volver
                                </button>
                                <button
                                    onClick={confirmAndExecuteCancel}
                                    disabled={isPending}
                                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isPending ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Trash2 className="w-5 h-5" />
                                    )}
                                    {isPending ? 'Anulando...' : 'Sí, Anular'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
