'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Trash2, Clock, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { iniciarCronometro, detenerCronometro, eliminarRegistroTiempo, getUsuarioActual } from '@/app/(dashboard)/soporte/actions';

interface CronometroTrabajoProps {
    ordenId?: string | null;
    taskId?: string | null;
    tiempos: any[];
    onRefresh: () => void | Promise<void>;
}

export default function CronometroTrabajo({
    ordenId,
    taskId,
    tiempos,
    onRefresh
}: CronometroTrabajoProps) {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [showStopConfirm, setShowStopConfirm] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // 1. Fetch current user
    useEffect(() => {
        getUsuarioActual()
            .then(user => {
                setCurrentUser(user);
                setLoadingUser(false);
            })
            .catch(err => {
                console.error("Error fetching current user:", err);
                setLoadingUser(false);
            });

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // 2. Identify active timer for current user
    const activeTimer = currentUser 
        ? tiempos?.find(t => t.tecnicoId === currentUser.id && !t.fin)
        : null;

    // 3. Update counter in live if timer is running
    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (activeTimer) {
            const calculateElapsed = () => {
                const start = new Date(activeTimer.inicio).getTime();
                const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
                setElapsedSeconds(diff);
            };

            calculateElapsed();
            timerRef.current = setInterval(calculateElapsed, 1000);
        } else {
            setElapsedSeconds(0);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [activeTimer, tiempos]);

    const formatHHMMSS = (totalSecs: number) => {
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        return [
            hrs.toString().padStart(2, '0'),
            mins.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    };

    const formatDuracion = (minutos: number | null) => {
        if (!minutos) return '0 min';
        const hrs = Math.floor(minutos / 60);
        const mins = minutos % 60;
        if (hrs > 0) {
            return `${hrs} h y ${mins} min`;
        }
        return `${mins} min`;
    };

    const handleStart = async () => {
        setProcessing(true);
        try {
            const res = await iniciarCronometro(ordenId || null, taskId || null);
            if (res.success) {
                toast.success('Cronómetro de trabajo iniciado.');
                await onRefresh();
            } else {
                toast.error(res.error || 'Error al iniciar cronómetro.');
            }
        } catch (error: any) {
            toast.error('Error de conexión.');
        } finally {
            setProcessing(false);
        }
    };

    const handleStop = async () => {
        if (!activeTimer) return;
        setProcessing(true);
        try {
            const res = await detenerCronometro(activeTimer.id);
            if (res.success) {
                if (res.discarded) {
                    toast.error('Cronómetro detenido. El registro fue descartado por durar menos de 1 minuto.');
                } else {
                    toast.success('Tiempo de trabajo guardado exitosamente.');
                }
                setShowStopConfirm(false);
                await onRefresh();
            } else {
                toast.error(res.error || 'Error al detener cronómetro.');
            }
        } catch (error: any) {
            toast.error('Error de conexión.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (tiempoId: string) => {
        if (!confirm('¿Estás seguro de que deseas anular este registro de tiempo?')) return;
        try {
            const res = await eliminarRegistroTiempo(tiempoId);
            if (res.success) {
                toast.success('Registro de tiempo anulado.');
                await onRefresh();
            } else {
                toast.error(res.error || 'Error al eliminar.');
            }
        } catch (error: any) {
            toast.error('Error de conexión.');
        }
    };

    if (loadingUser) {
        return (
            <div className="flex items-center justify-center p-6 text-slate-400">
                <Loader2 className="animate-spin mr-2" size={18} />
                Cargando módulo de tiempo...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Control Panel Card */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 md:p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 text-left">
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${activeTimer ? 'bg-red-500 animate-ping' : 'bg-slate-300'}`} />
                            <h4 className="font-bold text-slate-800 text-sm md:text-base uppercase tracking-wider">
                                {activeTimer ? 'TRABAJO EN CURSO' : 'CRONÓMETRO DETENIDO'}
                            </h4>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                            {activeTimer 
                                ? `Técnico activo: ${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`
                                : 'Inicia el cronómetro para registrar tu tiempo de mano de obra.'
                            }
                        </p>
                    </div>

                    {/* Timer controls */}
                    <div className="flex items-center gap-4 self-start md:self-auto">
                        {activeTimer && (
                            <div className="font-mono text-xl md:text-2xl font-black text-slate-800 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-inner select-none tracking-wider">
                                {formatHHMMSS(elapsedSeconds)}
                            </div>
                        )}

                        {activeTimer ? (
                            <button
                                type="button"
                                disabled={processing}
                                onClick={() => setShowStopConfirm(true)}
                                className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {processing ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Square size={14} fill="white" />
                                )}
                                Detener Trabajo
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={processing}
                                onClick={handleStart}
                                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {processing ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Play size={14} fill="white" />
                                )}
                                Iniciar Trabajo
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Logs List */}
            <div className="space-y-3 text-left">
                <h5 className="font-bold text-slate-700 text-xs md:text-sm uppercase tracking-wider flex items-center gap-2">
                    <Clock size={16} className="text-slate-500" /> Historial de Tiempos Registrados
                </h5>

                {tiempos && tiempos.length > 0 ? (
                    <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-slate-600 font-medium">
                                <thead className="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Técnico</th>
                                        <th className="px-4 py-3 text-left">Fecha</th>
                                        <th className="px-4 py-3 text-left">Inicio - Fin</th>
                                        <th className="px-4 py-3 text-right">Duración</th>
                                        <th className="px-4 py-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-semibold">
                                    {tiempos.map((tmp) => {
                                        const dateStr = tmp.inicio 
                                            ? new Date(tmp.inicio).toLocaleDateString('es-HN') 
                                            : '-';
                                        const startTimeStr = tmp.inicio 
                                            ? new Date(tmp.inicio).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: true }) 
                                            : '';
                                        const endTimeStr = tmp.fin 
                                            ? new Date(tmp.fin).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: true }) 
                                            : 'Trabajando...';
                                        
                                        return (
                                            <tr key={tmp.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3.5 text-slate-800 font-bold">
                                                    {tmp.tecnico?.nombre || ''} {tmp.tecnico?.apellido || ''}
                                                </td>
                                                <td className="px-4 py-3.5 flex items-center gap-1 text-slate-500">
                                                    <Calendar size={12} /> {dateStr}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                                                        {startTimeStr} - {endTimeStr}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-black text-slate-800">
                                                    {tmp.fin ? formatDuracion(tmp.duracion) : (
                                                        <span className="text-red-500 text-[10px] uppercase font-bold animate-pulse">
                                                            Activo
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(tmp.id)}
                                                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                                                        title="Anular registro de tiempo"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                        <Clock size={28} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-semibold">No se han registrado tiempos de trabajo para esta orden.</p>
                    </div>
                )}
            </div>
            {/* Modal de Confirmación de Detención */}
            {showStopConfirm && (
                <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 text-red-600 font-bold">
                                <AlertTriangle className="h-6 w-6 shrink-0 animate-bounce text-red-600" />
                                <h3 className="text-sm uppercase tracking-wider">
                                    ¿Detener registro de trabajo?
                                </h3>
                            </div>
                            
                            {elapsedSeconds < 60 ? (
                                <p className="text-xs text-red-600 leading-relaxed font-bold bg-red-50 border border-red-100 p-3.5 rounded-xl">
                                    ¡El tiempo transcurrido es menor a 1 minuto! Al detener el trabajo ahora, el registro se descartará automáticamente para evitar acumular registros fantasmas o accidentales.
                                </p>
                            ) : (
                                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                                    ¿Estás seguro de que deseas detener el cronómetro? Se guardará el tiempo transcurrido ({formatHHMMSS(elapsedSeconds)}) como tiempo laborado oficial {ordenId ? 'en esta orden' : 'en esta tarea'}.
                                </p>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowStopConfirm(false)}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer shadow-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleStop}
                                disabled={processing}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition active:scale-95 shadow flex items-center gap-1.5 cursor-pointer"
                            >
                                {processing ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <Square size={12} fill="white" />
                                )}
                                {elapsedSeconds < 60 ? 'Descartar y Detener' : 'Sí, detener trabajo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
