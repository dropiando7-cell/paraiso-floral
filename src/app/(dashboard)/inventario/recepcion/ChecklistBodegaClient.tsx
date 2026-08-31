'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    CheckCircle2, 
    Clock, 
    Box, 
    ArrowLeft, 
    CheckSquare, 
    Square, 
    Package, 
    Check, 
    AlertCircle, 
    Printer,
    AlertTriangle,
    Save, 
    TrendingUp,
    ChevronRight,
    ChevronLeft,
    X,
    FileSpreadsheet,
    ShieldCheck,
    Search,
    FileText,
    Camera,
    Upload,
    Loader2,
    ExternalLink,
    Trash2,
    Volume2,
    Plus,
    PlusCircle
} from 'lucide-react';
import { 
    toggleVerificacionItem, 
    verificarCajaCompleta, 
    finalizarRecepcionLote,
    encolarImpresionCaja,
    encolarImpresionLoteCompleto,
    limpiarColaImpresion,
    getActivosCatalogoParaRecepcion,
    agregarItemExtraACaja
} from './actions';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';

// Función para emitir un pitido de confirmación mediante Web Audio API (sin archivos de audio externos)
function playAudioFeedback(type: 'check' | 'complete' | 'uncheck' = 'check') {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';

        if (type === 'check') {
            osc.frequency.setValueAtTime(880, ctx.currentTime); // Tono A5 (Chime agradable)
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        } else if (type === 'complete') {
            // Arpegio victorioso C5 -> E5 -> G5
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
            osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'uncheck') {
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        }
    } catch (e) {
        // Audio autoejecutable silenciado o no disponible
    }
}

interface ItemRecepcion {
    id: string;
    cajaId: string;
    cultivoOriginal: string;
    descripcion: string;
    bonchesEsperados: number;
    bonchesRecibidos: number;
    bonchesDanados: number;
    motivoDano?: string | null;
    fotosDano?: string[] | null;
    tipoEmpaque: string;
    verificado: boolean;
    activoFijo?: {
        id: string;
        idQr: string;
        codigoBarras: string | null;
        descripcionCorta: string;
        stock: number;
    } | null;
    codigoBarras?: string | null;
}

interface CajaRecepcion {
    id: string;
    numeroCaja: number;
    codigoProveedor: string | null;
    estado: string;
    verificadaAt: Date | null;
    items: ItemRecepcion[];
}

interface LoteRecepcion {
    id: string;
    numeroEnvio: string;
    proveedor: string;
    estado: string;
    totalCajas: number;
    totalBonches: number;
    fechaLlegada: Date;
    cajas: CajaRecepcion[];
}

interface ResumenRecepcion {
    totalBonchesEsperados: number;
    totalBonchesRecibidos: number;
    totalBonchesDanados: number;
    matcheoPerfecto: boolean;
    discrepancias: any[];
}

export default function ChecklistBodegaClient({
    loteInitial,
    usuarioNombre,
    resumenInitial
}: {
    loteInitial: LoteRecepcion;
    usuarioNombre: string;
    resumenInitial: ResumenRecepcion;
}) {
    const router = useRouter();
    const [lote, setLote] = useState<LoteRecepcion>(loteInitial);
    const [cajaActivaId, setCajaActivaId] = useState<string>(
        loteInitial.cajas.length > 0 ? loteInitial.cajas[0].id : ''
    );
    const [busquedaItem, setBusquedaItem] = useState<string>('');
    const [isPending, startTransition] = useTransition();
    const [mensajeFeedback, setMensajeFeedback] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
    const [itemEditandoDanoId, setItemEditandoDanoId] = useState<string | null>(null);
    const [mostrarModalResumen, setMostrarModalResumen] = useState<boolean>(false);
    const [mostrarModalPdf, setMostrarModalPdf] = useState<boolean>(false);
    const [itemEscaneandoCamaraId, setItemEscaneandoCamaraId] = useState<string | null>(null);

    // Modal para agregar producto extra/sobrante
    const [mostrarModalExtra, setMostrarModalExtra] = useState<boolean>(false);
    const [activosCatalogo, setActivosCatalogo] = useState<any[]>([]);
    const [filtroCatalogo, setFiltroCatalogo] = useState<string>('');
    const [selectedActivoId, setSelectedActivoId] = useState<string>('');
    const [extraBonches, setExtraBonches] = useState<number>(1);
    const [extraCultivo, setExtraCultivo] = useState<string>('');
    const [cargandoCatalogo, setCargandoCatalogo] = useState<boolean>(false);

    // PERSISTENCIA & AUTOGUARDADO EN LOCALSTORAGE (Para no perder datos al refrescar o salir de la App)
    useEffect(() => {
        try {
            const backupKey = `recepcion_lote_backup_${loteInitial.id}`;
            const cachedData = localStorage.getItem(backupKey);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                if (parsed && parsed.cajas && Array.isArray(parsed.cajas)) {
                    setLote(parsed);
                }
            }
        } catch (e) {
            console.error('Error al restaurar autoguardado local:', e);
        }
    }, [loteInitial.id]);

    useEffect(() => {
        try {
            const backupKey = `recepcion_lote_backup_${lote.id}`;
            localStorage.setItem(backupKey, JSON.stringify(lote));
        } catch (e) {
            console.error('Error al guardar respaldo local:', e);
        }
    }, [lote]);

    const handleAbrirModalExtra = async () => {
        setMostrarModalExtra(true);
        if (activosCatalogo.length === 0) {
            setCargandoCatalogo(true);
            const res = await getActivosCatalogoParaRecepcion();
            if (res.success) {
                setActivosCatalogo(res.activos);
            }
            setCargandoCatalogo(false);
        }
    };

    const handleConfirmarAgregarExtra = () => {
        if (!cajaSeleccionada || !selectedActivoId || extraBonches <= 0) return;

        startTransition(async () => {
            const res = await agregarItemExtraACaja(cajaSeleccionada.id, selectedActivoId, extraBonches, extraCultivo || undefined);
            if (res.success && res.item) {
                playAudioFeedback('check');
                setMensajeFeedback({ tipo: 'exito', texto: `¡Producto extra agregado a la Caja #${cajaSeleccionada.numeroCaja}!` });
                setMostrarModalExtra(false);
                setSelectedActivoId('');
                setExtraBonches(1);
                setExtraCultivo('');
                router.refresh();
            } else {
                setMensajeFeedback({ tipo: 'error', texto: res.error || 'Error al agregar producto extra' });
            }
        });
    };

    // Ref para el scroll horizontal de cajas y arrastre con mouse/touch
    const cajasScrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [startX, setStartX] = useState<number>(0);
    const [scrollLeftPos, setScrollLeftPos] = useState<number>(0);

    // Recuperar la última caja seleccionada del localStorage para autoguardado de vista
    useEffect(() => {
        const savedCajaId = localStorage.getItem(`recepcion_caja_activa_${loteInitial.id}`);
        if (savedCajaId && loteInitial.cajas.some(c => c.id === savedCajaId)) {
            setCajaActivaId(savedCajaId);
        }
    }, [loteInitial.id, loteInitial.cajas]);

    const handleSelectCaja = (cajaId: string) => {
        setCajaActivaId(cajaId);
        setBusquedaItem('');
        localStorage.setItem(`recepcion_caja_activa_${loteInitial.id}`, cajaId);
    };

    // Funciones para scroll lateral táctil y con botones de flecha
    const scrollCajas = (direction: 'left' | 'right') => {
        if (cajasScrollRef.current) {
            const amount = direction === 'left' ? -200 : 200;
            cajasScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!cajasScrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - cajasScrollRef.current.offsetLeft);
        setScrollLeftPos(cajasScrollRef.current.scrollLeft);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !cajasScrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - cajasScrollRef.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        cajasScrollRef.current.scrollLeft = scrollLeftPos - walk;
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    const cajaSeleccionada = lote.cajas.find(c => c.id === cajaActivaId) || lote.cajas[0];

    // Filtrar items por término de búsqueda en la caja activa
    const itemsFiltrados = cajaSeleccionada ? cajaSeleccionada.items.filter(item => {
        if (!busquedaItem.trim()) return true;
        const q = busquedaItem.toLowerCase().trim();
        const descLive = (item.activoFijo?.descripcionCorta || item.descripcion).toLowerCase();
        const descOrig = item.descripcion.toLowerCase();
        const cultivo = item.cultivoOriginal.toLowerCase();
        const qr = (item.activoFijo?.idQr || '').toLowerCase();
        const barras = (item.activoFijo?.codigoBarras || '').toLowerCase();
        return descLive.includes(q) || descOrig.includes(q) || cultivo.includes(q) || qr.includes(q) || barras.includes(q);
    }) : [];

    // Cálculos globales de progreso
    let totalItemsGlobal = 0;
    let itemsVerificadosGlobal = 0;
    let bonchesVerificadosGlobal = 0;
    let totalDanadosGlobal = 0;

    lote.cajas.forEach(c => {
        c.items.forEach(i => {
            totalItemsGlobal++;
            totalDanadosGlobal += i.bonchesDanados || 0;
            if (i.verificado) {
                itemsVerificadosGlobal++;
                bonchesVerificadosGlobal += i.bonchesRecibidos || i.bonchesEsperados;
            }
        });
    });

    const porcentajeGlobal = totalItemsGlobal > 0 ? Math.round((itemsVerificadosGlobal / totalItemsGlobal) * 100) : 0;
    const cajasVerificadasCount = lote.cajas.filter(c => c.estado === 'VERIFICADA').length;

    // Discrepancias en tiempo real
    const discrepanciasLista: any[] = [];
    lote.cajas.forEach(c => {
        c.items.forEach(i => {
            const diff = i.bonchesEsperados - i.bonchesRecibidos;
            const tieneDano = (i.bonchesDanados || 0) > 0;
            const tieneFaltante = diff !== 0;

            if (i.verificado && (tieneDano || tieneFaltante)) {
                discrepanciasLista.push({
                    cajaNumero: c.numeroCaja,
                    codigoProveedor: c.codigoProveedor,
                    descripcion: i.activoFijo?.descripcionCorta || i.descripcion,
                    idQr: i.activoFijo?.idQr || 'N/A',
                    bonchesEsperados: i.bonchesEsperados,
                    bonchesRecibidos: i.bonchesRecibidos,
                    bonchesDanados: i.bonchesDanados || 0,
                    motivoDano: i.motivoDano || 'No especificado',
                    fotosDano: i.fotosDano || [],
                    diferencia: diff
                });
            }
        });
    });

    const esMatcheoPerfecto = porcentajeGlobal === 100 && discrepanciasLista.length === 0;

    // Handler: Toggle Verificación de Item (Con Autoguardado Inmediato BD y Pitido)
    const handleToggleItem = (item: ItemRecepcion) => {
        const nuevoVerificado = !item.verificado;
        const nuevosBonches = nuevoVerificado ? item.bonchesEsperados : 0;

        // Pitido de auditabilidad sonora
        playAudioFeedback(nuevoVerificado ? 'check' : 'uncheck');

        setLote(prev => ({
            ...prev,
            cajas: prev.cajas.map(c => {
                if (c.id !== item.cajaId) return c;
                const nuevosItems = c.items.map(i => {
                    if (i.id !== item.id) return i;
                    return { ...i, verificado: nuevoVerificado, bonchesRecibidos: nuevosBonches };
                });
                const todosVerif = nuevosItems.every(i => i.verificado);
                return {
                    ...c,
                    estado: todosVerif ? 'VERIFICADA' : (nuevosItems.some(i => i.verificado) ? 'INCOMPLETA' : 'PENDIENTE'),
                    items: nuevosItems
                };
            })
        }));

        startTransition(async () => {
            const res = await toggleVerificacionItem(item.id, nuevoVerificado, item.tipoEmpaque, nuevosBonches, item.bonchesDanados, item.motivoDano || undefined);
            if (!res.success) {
                setMensajeFeedback({ tipo: 'error', texto: res.error || 'Error al actualizar item' });
            }
        });
    };

    // Handler: Cambiar cantidad de bonches recibidos
    const handleCambiarBonches = (item: ItemRecepcion, cantidad: number) => {
        const cantValida = Math.max(0, cantidad);
        setLote(prev => ({
            ...prev,
            cajas: prev.cajas.map(c => {
                if (c.id !== item.cajaId) return c;
                return {
                    ...c,
                    items: c.items.map(i => i.id === item.id ? { ...i, bonchesRecibidos: cantValida } : i)
                };
            })
        }));

        startTransition(async () => {
            await toggleVerificacionItem(item.id, item.verificado, item.tipoEmpaque, cantValida, item.bonchesDanados, item.motivoDano || undefined);
        });
    };

    // Handler: Cambiar código de barras de un item
    const handleCambiarCodigoBarras = (item: ItemRecepcion, codigo: string) => {
        setLote(prev => ({
            ...prev,
            cajas: prev.cajas.map(c => {
                if (c.id !== item.cajaId) return c;
                return {
                    ...c,
                    items: c.items.map(i => i.id === item.id ? { ...i, codigoBarras: codigo } : i)
                };
            })
        }));

        startTransition(async () => {
            const res = await toggleVerificacionItem(
                item.id,
                item.verificado,
                item.tipoEmpaque,
                item.bonchesRecibidos,
                item.bonchesDanados,
                item.motivoDano || undefined,
                item.fotosDano || undefined,
                codigo
            );
            if (!res.success) {
                setMensajeFeedback({ tipo: 'error', texto: res.error || 'Error al actualizar código de barras.' });
            }
        });
    };

    // Handler: Escanear código de barras con Cámara de Tablet y asignarlo al item objetivo
    const handleScannerBarcodeSuccess = (scannedText: string) => {
        if (!itemEscaneandoCamaraId) return;

        let targetItem: ItemRecepcion | null = null;
        for (const caja of lote.cajas) {
            const found = caja.items.find(i => i.id === itemEscaneandoCamaraId);
            if (found) {
                targetItem = found;
                break;
            }
        }

        if (targetItem) {
            const desc = targetItem.activoFijo?.descripcionCorta || targetItem.descripcion;
            handleCambiarCodigoBarras(targetItem, scannedText);

            if (!targetItem.verificado) {
                handleToggleItem(targetItem);
            }

            playAudioFeedback('check');
            setMensajeFeedback({
                tipo: 'exito',
                texto: `¡Código "${scannedText}" escaneado con cámara y asignado a "${desc}"!`
            });
        }

        setItemEscaneandoCamaraId(null);
    };

    // Handler: Registrar o Eliminar Daño / Merma en Item
    const handleGuardarDano = (item: ItemRecepcion, danados: number, motivo: string, fotos: string[]) => {
        playAudioFeedback(danados > 0 ? 'check' : 'uncheck');
        const cantidadRecibida = item.bonchesRecibidos > 0 ? item.bonchesRecibidos : item.bonchesEsperados;

        setLote(prev => ({
            ...prev,
            cajas: prev.cajas.map(c => {
                if (c.id !== item.cajaId) return c;
                return {
                    ...c,
                    items: c.items.map(i => i.id === item.id ? { 
                        ...i, 
                        bonchesRecibidos: cantidadRecibida,
                        bonchesDanados: Math.max(0, danados),
                        motivoDano: danados > 0 ? motivo : null,
                        fotosDano: danados > 0 ? fotos : [],
                        verificado: true
                    } : i)
                };
            })
        }));

        setItemEditandoDanoId(null);

        startTransition(async () => {
            const res = await toggleVerificacionItem(
                item.id, 
                true, 
                item.tipoEmpaque, 
                cantidadRecibida, 
                Math.max(0, danados), 
                danados > 0 ? motivo : undefined, 
                danados > 0 ? fotos : []
            );
            if (res.success) {
                if (danados > 0) {
                    setMensajeFeedback({ tipo: 'exito', texto: `Se registraron ${danados} bonche(s) dañados para ${item.activoFijo?.descripcionCorta || item.descripcion}.` });
                } else {
                    setMensajeFeedback({ tipo: 'exito', texto: `Se eliminó la merma para ${item.activoFijo?.descripcionCorta || item.descripcion}. El producto quedó como recibido al 100%.` });
                }
            }
        });
    };

    // Handler: Marcar toda la caja activa como lista (con pitido de victoria)
    const handleVerificarCajaCompleta = (verificado: boolean) => {
        if (!cajaSeleccionada) return;

        playAudioFeedback(verificado ? 'complete' : 'uncheck');

        setLote(prev => ({
            ...prev,
            cajas: prev.cajas.map(c => {
                if (c.id !== cajaSeleccionada.id) return c;
                return {
                    ...c,
                    estado: verificado ? 'VERIFICADA' : 'PENDIENTE',
                    items: c.items.map(i => ({
                        ...i,
                        verificado,
                        bonchesRecibidos: verificado ? i.bonchesEsperados : 0
                    }))
                };
            })
        }));

        startTransition(async () => {
            const res = await verificarCajaCompleta(cajaSeleccionada.id, verificado);
            if (res.success) {
                setMensajeFeedback({ 
                    tipo: 'exito', 
                    texto: verificado ? `¡Caja ${cajaSeleccionada.numeroCaja} marcada como VERIFICADA!` : `Caja ${cajaSeleccionada.numeroCaja} desmarcada.` 
                });
            }
        });
    };

    // Handler: Imprimir Etiquetas por Caja
    const handleImprimirCaja = () => {
        if (!cajaSeleccionada) return;
        startTransition(async () => {
            const res = await encolarImpresionCaja(cajaSeleccionada.id);
            if (res.success) {
                setMensajeFeedback({ tipo: 'exito', texto: `¡Se enviaron ${res.count} etiquetas de la Caja #${cajaSeleccionada.numeroCaja} al Print Server!` });
            } else {
                setMensajeFeedback({ tipo: 'error', texto: res.error || 'Error al enviar a impresión.' });
            }
        });
    };

    // Handler: Imprimir Etiquetas del Lote Completo
    const handleImprimirLoteCompleto = () => {
        startTransition(async () => {
            const res = await encolarImpresionLoteCompleto(lote.id);
            if (res.success) {
                setMensajeFeedback({ tipo: 'exito', texto: `¡Se enviaron ${res.count} etiquetas del LOTE COMPLETO #${lote.numeroEnvio} al Print Server!` });
            } else {
                setMensajeFeedback({ tipo: 'error', texto: res.error || 'Error al enviar a impresión.' });
            }
        });
    };

    // Handler Debug: Limpiar Cola de Impresión
    const handleLimpiarColaImpresion = () => {
        startTransition(async () => {
            const res = await limpiarColaImpresion();
            if (res.success) {
                setMensajeFeedback({ tipo: 'exito', texto: `¡Se eliminaron ${res.count} trabajos pendientes de la cola del Print Server!` });
            } else {
                setMensajeFeedback({ tipo: 'error', texto: res.error || 'Error al limpiar cola de impresión.' });
            }
        });
    };

    // Handler: Finalizar Recepción Completa
    const handleFinalizarRecepcion = () => {
        setMostrarModalResumen(true);
    };

    const handleConfirmarFinalizacionModal = () => {
        setMostrarModalResumen(false);
        startTransition(async () => {
            const res = await finalizarRecepcionLote(lote.id);
            if (res.success) {
                playAudioFeedback('complete');
                setMensajeFeedback({ tipo: 'exito', texto: '¡Recepción de Lote Finalizada e Ingresada al Inventario BD con Éxito!' });
                setLote(prev => ({ ...prev, estado: 'COMPLETADO' }));
                setTimeout(() => {
                    router.push('/inventario/recepcion');
                }, 1500);
            } else {
                setMensajeFeedback({ tipo: 'error', texto: res.error || 'Error al finalizar la recepción.' });
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-5 pb-36 font-sans select-none">
            {/* Top Bar Navigation */}
            <div className="max-w-7xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link 
                        href="/inventario/recepcion" 
                        className="p-2.5 md:p-3 bg-white hover:bg-slate-100 active:scale-95 rounded-xl border border-slate-200 text-slate-600 shadow-xs transition-all"
                    >
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-0.5 rounded-md text-[10px] md:text-xs border border-emerald-200 uppercase tracking-wider">
                                LOTE / ENVÍO
                            </span>
                            <h1 className="text-base sm:text-lg md:text-2xl font-black text-slate-900 tracking-tight">
                                ENVÍO #{lote.numeroEnvio}
                            </h1>
                        </div>
                        <p className="text-slate-500 text-xs md:text-sm">
                            Proveedor: <strong className="text-slate-800 font-bold">{lote.proveedor}</strong>
                        </p>
                    </div>
                </div>

                {/* Acciones Globales: PDF, Imprimir, Debug Pooler y Estado */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setMostrarModalPdf(true)}
                        className="px-3 md:px-4 py-2 md:py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 active:scale-95 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 border border-emerald-200 shadow-xs transition-all"
                    >
                        <FileText className="w-4 h-4 text-emerald-700" />
                        <span>📄 PDF Ref</span>
                    </button>

                    <button
                        onClick={handleImprimirLoteCompleto}
                        disabled={isPending}
                        className="px-3 md:px-4 py-2 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Imprimir Lote</span>
                    </button>

                    <button
                        onClick={handleLimpiarColaImpresion}
                        disabled={isPending}
                        title="Limpiar trabajos pendientes en la cola del Print Server"
                        className="px-3 md:px-4 py-2 md:py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 active:scale-95 rounded-xl font-bold text-xs md:text-sm flex items-center gap-1.5 border border-rose-200 transition-all"
                    >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <span>Limpiar Cola</span>
                    </button>

                    <span className={`px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold border flex items-center gap-1.5 ${
                        lote.estado === 'COMPLETADO' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                        <Clock className="w-4 h-4" />
                        {lote.estado === 'COMPLETADO' ? 'COMPLETADO' : 'EN RECEPCIÓN'}
                    </span>
                </div>
            </div>

            {/* Mensajes de Alerta/Feedback */}
            {mensajeFeedback && (
                <div className={`max-w-7xl mx-auto mb-4 p-3.5 md:p-4 rounded-xl md:rounded-2xl border flex items-center justify-between gap-3 shadow-xs ${
                    mensajeFeedback.tipo === 'exito' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                    <div className="flex items-center gap-2.5">
                        {mensajeFeedback.tipo === 'exito' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                        <span className="text-xs md:text-sm font-bold">{mensajeFeedback.texto}</span>
                    </div>
                    <button onClick={() => setMensajeFeedback(null)} className="text-xs opacity-60 hover:opacity-100 p-1 font-bold">Cerrar</button>
                </div>
            )}

            {/* Compact Progress Header */}
            <div className="max-w-7xl mx-auto mb-4 bg-white border border-slate-200 rounded-xl md:rounded-2xl p-3.5 md:p-5 shadow-xs">
                <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 md:p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600">
                            <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div>
                            <div className="text-[10px] md:text-xs text-slate-400 uppercase font-extrabold tracking-wider">Avance de Recepción</div>
                            <div className="text-xs sm:text-sm md:text-base font-black text-slate-900">
                                {cajasVerificadasCount} / {lote.cajas.length} Cajas • <span className="text-emerald-700">{itemsVerificadosGlobal}/{totalItemsGlobal} Items</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {totalDanadosGlobal > 0 && (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs md:text-sm font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                                {totalDanadosGlobal} dañados
                            </span>
                        )}
                        <span className="text-lg sm:text-xl md:text-3xl font-black text-emerald-700">{porcentajeGlobal}%</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 md:h-3 overflow-hidden p-0.5 border border-slate-200">
                    <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300" 
                        style={{ width: `${porcentajeGlobal}%` }}
                    />
                </div>
            </div>

            {/* Responsive Grid: Box Selector + Checklist Ultra Adaptable */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Selector de Cajas con Scroll Horizontal en Móvil y Lista Vertical Spaciosa en Tablet/Laptop */}
                <div className="lg:col-span-4 space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Box className="w-4 h-4 text-emerald-600" />
                            Cajas ({lote.cajas.length})
                        </h2>

                        {/* Botones de Flechas para desplazar horizontalmente en Móvil/Tablet Portrait */}
                        <div className="flex items-center gap-1 lg:hidden">
                            <button
                                onClick={() => scrollCajas('left')}
                                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 active:scale-95 shadow-2xs"
                                title="Desplazar a la izquierda"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => scrollCajas('right')}
                                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 active:scale-95 shadow-2xs"
                                title="Desplazar a la derecha"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Contenedor táctil / Mouse Drag / Scroll Horizontal */}
                    <div 
                        ref={cajasScrollRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUpOrLeave}
                        onMouseLeave={handleMouseUpOrLeave}
                        className={`flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 pb-2 lg:pb-0 touch-pan-x cursor-grab active:cursor-grabbing select-none scroll-smooth ${
                            isDragging ? 'cursor-grabbing' : ''
                        }`}
                        style={{
                            scrollbarWidth: 'thin',
                            WebkitOverflowScrolling: 'touch'
                        }}
                    >
                        {lote.cajas.map((caja) => {
                            const esActiva = caja.id === cajaActivaId;
                            const itemsVerifCaja = caja.items.filter(i => i.verificado).length;
                            const estaCompleta = caja.estado === 'VERIFICADA';
                            const tieneDanoCaja = caja.items.some(i => (i.bonchesDanados || 0) > 0);

                            return (
                                <button
                                    key={caja.id}
                                    onClick={() => handleSelectCaja(caja.id)}
                                    className={`flex-shrink-0 min-w-[170px] md:min-w-[210px] lg:min-w-0 lg:w-full text-left p-3 md:p-3.5 rounded-xl md:rounded-2xl border transition-all flex items-center justify-between gap-3 active:scale-[0.98] ${
                                        esActiva
                                            ? 'bg-emerald-50/90 border-emerald-500 text-slate-900 shadow-sm ring-2 ring-emerald-500/20 font-bold'
                                            : estaCompleta
                                            ? 'bg-white border-emerald-200 hover:bg-slate-50'
                                            : 'bg-white border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center font-black text-xs md:text-sm border shrink-0 ${
                                            estaCompleta 
                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300' 
                                                : esActiva 
                                                ? 'bg-emerald-600 text-white border-emerald-600'
                                                : 'bg-slate-100 text-slate-700 border-slate-200'
                                        }`}>
                                            {estaCompleta ? <Check className="w-5 h-5 stroke-[3]" /> : `C${caja.numeroCaja}`}
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-slate-900 text-xs md:text-sm flex items-center gap-1">
                                                Caja #{caja.numeroCaja}
                                                {tieneDanoCaja && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                                            </div>
                                            {caja.codigoProveedor && (
                                                <div className="text-[10px] md:text-xs font-mono text-emerald-700 font-bold">
                                                    Folio: {caja.codigoProveedor}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center shrink-0">
                                        {estaCompleta ? (
                                            <span className="bg-emerald-100 text-emerald-700 text-[10px] md:text-xs font-extrabold px-2 py-0.5 rounded-md border border-emerald-200">
                                                OK
                                            </span>
                                        ) : (
                                            <span className="bg-slate-100 text-slate-600 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-md border border-slate-200">
                                                {itemsVerifCaja}/{caja.items.length}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Checklist Interactivo Adaptado a Tablets (Galaxy Tab S10 Lite 10.9") */}
                <div className="lg:col-span-8">
                    {cajaSeleccionada ? (
                        <div className="bg-white border border-slate-200 rounded-xl md:rounded-2xl p-3 sm:p-5 md:p-6 shadow-xs space-y-3.5 md:space-y-5 min-h-[450px]">
                            {/* Subheader Caja + Botones Imprimir Caja / Verificar Completa */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                <div>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900">
                                            Caja #{cajaSeleccionada.numeroCaja}
                                        </h2>
                                        {cajaSeleccionada.codigoProveedor && (
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                                                STICKER: {cajaSeleccionada.codigoProveedor}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                                    {/* Botón Agregar Producto Extra a esta Caja */}
                                    <button
                                        onClick={handleAbrirModalExtra}
                                        disabled={isPending}
                                        className="flex-1 sm:flex-initial px-3 md:px-4 py-2 md:py-2.5 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 border border-emerald-200 transition-all shadow-2xs"
                                    >
                                        <PlusCircle className="w-4 h-4 text-emerald-600" />
                                        <span>+ Extra / Sobrante</span>
                                    </button>

                                    <button
                                        onClick={handleImprimirCaja}
                                        disabled={isPending}
                                        className="flex-1 sm:flex-initial px-3 md:px-4 py-2 md:py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-all"
                                    >
                                        <Printer className="w-4 h-4 text-indigo-600" />
                                        <span>Etiquetas C#{cajaSeleccionada.numeroCaja}</span>
                                    </button>

                                    <button
                                        onClick={() => handleVerificarCajaCompleta(cajaSeleccionada.estado !== 'VERIFICADA')}
                                        disabled={isPending}
                                        className={`flex-1 sm:flex-initial px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                                            cajaSeleccionada.estado === 'VERIFICADA'
                                                ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        }`}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        {cajaSeleccionada.estado === 'VERIFICADA' ? 'Desmarcar' : 'Caja LISTA ✅'}
                                    </button>
                                </div>
                            </div>

                            {/* BUSCADOR DENTRO DE LA CAJA SELECCIONADA */}
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="🔍 Buscar variedad, cultivo o QR (ej. Freedom, 000005)..."
                                    value={busquedaItem}
                                    onChange={(e) => setBusquedaItem(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 md:py-2.5 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-semibold"
                                />
                                {busquedaItem && (
                                    <button
                                        onClick={() => setBusquedaItem('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* LISTA ADAPTABLE DE ITEMS CON CAMPOS TÁCTILES AMPLIOS PARA TABLET */}
                            <div className="divide-y divide-slate-100 space-y-3.5 md:space-y-4">
                                {itemsFiltrados.length === 0 ? (
                                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-sm font-medium">
                                        No se encontraron flores que coincidan con &quot;<strong className="text-slate-800">{busquedaItem}</strong>&quot;.
                                    </div>
                                ) : (
                                    itemsFiltrados.map((item) => {
                                        const estaEditandoDano = itemEditandoDanoId === item.id;
                                        const tieneDano = (item.bonchesDanados || 0) > 0;
                                        const descLive = item.activoFijo?.descripcionCorta || item.descripcion;

                                        return (
                                            <div
                                                key={item.id}
                                                className={`p-3 sm:p-3.5 rounded-xl md:rounded-2xl border transition-all space-y-2 ${
                                                    tieneDano
                                                        ? 'bg-rose-50/90 border-rose-200 shadow-xs'
                                                        : item.verificado
                                                        ? 'bg-emerald-50/60 border-emerald-200 shadow-xs'
                                                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                                                }`}
                                            >
                                                {/* Fila Horizontal en 1 Sola Línea (Sin Solapamiento) */}
                                                <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                                                    {/* Izquierda: Checkbox + Nombre y QR/Cultivo */}
                                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                        <button
                                                            onClick={() => handleToggleItem(item)}
                                                            disabled={isPending}
                                                            className={`p-1 md:p-1.5 rounded-xl transition-all shrink-0 active:scale-90 ${
                                                                item.verificado
                                                                    ? 'text-emerald-700 bg-emerald-100 border-2 border-emerald-400'
                                                                    : 'text-slate-400 hover:text-slate-600 bg-slate-100 border-2 border-slate-300'
                                                            }`}
                                                        >
                                                            {item.verificado ? (
                                                                <CheckSquare className="w-6 h-6 md:w-7 md:h-7" />
                                                            ) : (
                                                                <Square className="w-6 h-6 md:w-7 md:h-7" />
                                                            )}
                                                        </button>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 truncate">
                                                                    {descLive}
                                                                </span>
                                                                <span className="font-mono text-[10px] sm:text-xs font-bold bg-slate-100 text-emerald-800 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                                                                    QR: {item.activoFijo?.idQr || 'N/A'}
                                                                </span>
                                                                
                                                                {(item.bonchesRecibidos > item.bonchesEsperados || item.bonchesEsperados === 0) && (
                                                                    <span className="font-sans text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-300 shrink-0">
                                                                        +{item.bonchesEsperados === 0 ? item.bonchesRecibidos : (item.bonchesRecibidos - item.bonchesEsperados)} Extra
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="text-[11px] text-slate-500 font-medium truncate">
                                                                Cultivo: <span className="text-slate-700 font-semibold">{item.cultivoOriginal}</span>
                                                                {tieneDano && (
                                                                    <span className="ml-2 inline-flex items-center gap-1 font-extrabold text-[10px] bg-amber-50 text-slate-800 px-2 py-0.5 rounded-md border border-amber-200">
                                                                        <span className="text-emerald-700">{Math.max(0, (item.verificado ? item.bonchesRecibidos : item.bonchesEsperados) - item.bonchesDanados)} Stock</span>
                                                                        <span className="text-slate-300">|</span>
                                                                        <span className="text-rose-600">{item.bonchesDanados} Merma</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Derecha: Campo Código de Barra con Botón Cámara + Cantidad y Daño (Siempre Inline en 1 Línea) */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {/* Campo Código de Barra + Botón Cámara */}
                                                        <div className="flex items-center gap-1 bg-white border border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 px-2 py-1 rounded-xl shadow-2xs transition-all">
                                                            <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase shrink-0">Cód:</span>
                                                            <input
                                                                type="text"
                                                                placeholder="Escribir/Escanear..."
                                                                value={item.codigoBarras || ''}
                                                                onChange={(e) => handleCambiarCodigoBarras(item, e.target.value)}
                                                                disabled={isPending}
                                                                className="w-24 sm:w-36 md:w-44 bg-transparent text-xs sm:text-sm font-bold font-mono text-slate-800 focus:outline-none placeholder:text-slate-300"
                                                            />
                                                            
                                                            {/* Botón Escanear con Cámara */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setItemEscaneandoCamaraId(item.id)}
                                                                className="p-1.5 md:p-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg shadow-2xs shrink-0 flex items-center justify-center transition-all"
                                                                title="Escanear con Cámara de la Tablet"
                                                            >
                                                                <Camera className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        {/* Cantidad Input */}
                                                        <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                value={item.verificado ? (item.bonchesRecibidos || item.bonchesEsperados) : item.bonchesEsperados}
                                                                onChange={(e) => handleCambiarBonches(item, parseInt(e.target.value, 10) || 0)}
                                                                className="w-10 sm:w-12 md:w-14 bg-white text-center font-extrabold text-slate-900 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 py-0.5"
                                                            />
                                                            <span className="text-[10px] sm:text-xs text-slate-600 font-bold">/{item.bonchesEsperados} pqt</span>
                                                        </div>

                                                        {/* Botón Daño / Merma */}
                                                        <button
                                                            onClick={() => setItemEditandoDanoId(estaEditandoDano ? null : item.id)}
                                                            title={tieneDano ? `${item.bonchesDanados} dañados (Neto a stock: ${Math.max(0, item.bonchesRecibidos - item.bonchesDanados)})` : "Reportar daño o merma"}
                                                            className={`p-1.5 sm:px-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border ${
                                                                tieneDano
                                                                    ? 'bg-rose-100 text-rose-800 border-rose-300 shadow-2xs'
                                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                                                            }`}
                                                        >
                                                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                                            {tieneDano && <span>{item.bonchesDanados}</span>}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Formulario desplegable para reportar Daño / Merma + Foto Cámara / R2 */}
                                                {estaEditandoDano && (
                                                    <FormularioDanoMerma 
                                                        item={item}
                                                        onGuardar={(danados, motivo, fotos) => handleGuardarDano(item, danados, motivo, fotos)}
                                                        onCancelar={() => setItemEditandoDanoId(null)}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-xl md:rounded-2xl p-8 text-center text-slate-500 shadow-xs min-h-[450px] flex items-center justify-center">
                            <p className="text-sm md:text-base font-semibold">Selecciona una caja a la izquierda para comenzar la verificación.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Flotante Adaptado a Tablet: Ver Resumen / Finalizar Recepción */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-slate-200 p-3 sm:p-4 backdrop-blur-md z-30 shadow-2xl">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    <button
                        onClick={() => setMostrarModalResumen(true)}
                        className="px-4 sm:px-5 md:px-6 py-2.5 md:py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl md:rounded-2xl text-xs sm:text-sm md:text-base font-extrabold flex items-center gap-2 border border-slate-200 transition-all shadow-xs"
                    >
                        <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                        <span>Resumen Lote #{lote.numeroEnvio}</span>
                    </button>

                    <button
                        onClick={handleFinalizarRecepcion}
                        disabled={isPending || lote.estado === 'COMPLETADO'}
                        className={`px-5 sm:px-6 md:px-8 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-black text-xs sm:text-sm md:text-base flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                            lote.estado === 'COMPLETADO'
                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-600/30'
                        }`}
                    >
                        <Save className="w-4 h-4 md:w-5 md:h-5" />
                        <span>{lote.estado === 'COMPLETADO' ? 'COMPLETADO' : 'PROCESAR Y CARGAR STOCK'}</span>
                    </button>
                </div>
            </div>

            {/* Modal de Escáner con Cámara de la Tablet */}
            <BarcodeScannerModal
                onOpen={!!itemEscaneandoCamaraId}
                onClose={() => setItemEscaneandoCamaraId(null)}
                onScanSuccess={handleScannerBarcodeSuccess}
            />

            {/* Modal Consulta de Packing List Original (PDF / Referencia) */}
            {mostrarModalPdf && (() => {
                const pdfPath = lote.numeroEnvio === '123419'
                    ? '/referencias/QUALITY_DISTR_123419.pdf'
                    : '/referencias/PACKING_LIST_19918.pdf';
                const pdfName = lote.numeroEnvio === '123419'
                    ? 'QUALITY DISTR-123419.pdf (ECUADOR PREMIUM)'
                    : 'PACKIN LIST LUCIO SPS 28.08.26.pdf';

                return (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                        <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-3 sm:p-5 text-slate-800 space-y-3 max-h-[92vh] overflow-y-auto shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-emerald-600" />
                                        Consulta de Packing List Original - Envío #{lote.numeroEnvio}
                                    </h3>
                                </div>
                                <button onClick={() => setMostrarModalPdf(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Botón Abrir PDF en nueva pestaña */}
                            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs">
                                <div className="text-emerald-800 font-semibold flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                    {pdfName}
                                </div>
                                <a
                                    href={pdfPath}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Abrir PDF Completo
                                </a>
                            </div>

                            {/* Visualizador Embedded PDF iframe */}
                            <div className="w-full h-[400px] border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
                                <iframe 
                                    src={pdfPath} 
                                    className="w-full h-full border-none"
                                    title="Packing List PDF"
                                />
                            </div>

                            <div className="flex justify-end pt-2 border-t border-slate-100">
                                <button
                                    onClick={() => setMostrarModalPdf(false)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                                >
                                    Cerrar Consulta
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal Resumen de Recepción (Todo Matcheó vs Discrepancias) */}
            {mostrarModalResumen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-4 sm:p-6 text-slate-800 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                Resumen de Recepción - Envío #{lote.numeroEnvio}
                            </h3>
                            <button onClick={() => setMostrarModalResumen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Banner Matcheo Perfecto vs Discrepancias */}
                        {esMatcheoPerfecto ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-1">
                                <div className="inline-flex p-2.5 bg-emerald-100 text-emerald-700 rounded-full mb-1">
                                    <CheckCircle2 className="w-7 h-7" />
                                </div>
                                <h4 className="text-base font-black text-emerald-800">¡TODO MATCHEO AL 100% PERFECTO!</h4>
                                <p className="text-xs text-emerald-700">
                                    Todas las 7 cajas y los 168 bonches recibidos coinciden exactamente con el packing list y no hay reporte de daños.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                    Resumen de Discrepancias / Mermas Reportadas ({discrepanciasLista.length})
                                </div>
                                <p className="text-[11px] text-amber-700">
                                    A continuación se detallan los ítems que registraron diferencias en bonches o producto en mal estado:
                                </p>

                                {/* Tabla de Discrepancias */}
                                <div className="space-y-2 mt-2">
                                    {discrepanciasLista.map((d, index) => (
                                        <div key={index} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex justify-between items-center gap-2">
                                            <div>
                                                <div className="font-bold text-slate-900">
                                                    Caja #{d.cajaNumero} • {d.descripcion} <span className="font-mono text-emerald-700">({d.idQr})</span>
                                                </div>
                                                <div className="text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap text-[11px]">
                                                    <span>Recibidos del proveedor: {d.bonchesRecibidos} pqt</span>
                                                    <span>•</span>
                                                    <span className="text-emerald-700 font-bold">✓ Neto a Stock: {Math.max(0, d.bonchesRecibidos - d.bonchesDanados)} pqt</span>
                                                    <span>•</span>
                                                    <span className="text-rose-600 font-bold">⚠️ Merma: {d.bonchesDanados} pqt</span>
                                                </div>
                                                {d.motivoDano && (
                                                    <div className="text-rose-700 text-[11px] mt-0.5 font-medium">Motivo: {d.motivoDano}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setMostrarModalResumen(false)}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                            >
                                Seguir Revisando
                            </button>
                            <button
                                onClick={handleConfirmarFinalizacionModal}
                                disabled={isPending}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
                            >
                                Confirmar y Procesar Entrada de Stock
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Agregar Producto Extra no planificado a Caja */}
            {mostrarModalExtra && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-4 sm:p-5 text-slate-800 space-y-3.5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <PlusCircle className="w-5 h-5 text-emerald-600" />
                                Agregar Producto Extra a Caja #{cajaSeleccionada?.numeroCaja}
                            </h3>
                            <button onClick={() => setMostrarModalExtra(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500">
                            Utiliza esta opción cuando en la caja venga un producto diferente o bonches de más que no venían especificados en el packing list.
                        </p>

                        {/* Buscador de Activos en el Catálogo */}
                        <div className="space-y-2 text-xs">
                            <div>
                                <label className="text-slate-700 font-semibold block mb-1">Buscar Producto en Catálogo (QR / Nombre)</label>
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Ej: 000005, Freedom, Vendela..."
                                        value={filtroCatalogo}
                                        onChange={(e) => setFiltroCatalogo(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-slate-700 font-semibold block mb-1">Seleccionar Producto</label>
                                {cargandoCatalogo ? (
                                    <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                                        Cargando catálogo de productos...
                                    </div>
                                ) : (
                                    <select
                                        value={selectedActivoId}
                                        onChange={(e) => setSelectedActivoId(e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 text-xs focus:outline-none focus:border-emerald-600"
                                    >
                                        <option value="">-- Seleccionar flor / producto --</option>
                                        {activosCatalogo
                                            .filter(a => {
                                                if (!filtroCatalogo.trim()) return true;
                                                const q = filtroCatalogo.toLowerCase().trim();
                                                return a.descripcionCorta.toLowerCase().includes(q) || a.idQr.toLowerCase().includes(q) || (a.marca || '').toLowerCase().includes(q);
                                            })
                                            .map(a => (
                                                <option key={a.id} value={a.id}>
                                                    QR: {a.idQr} - {a.descripcionCorta} ({a.marca || 'Sin cultivo'})
                                                </option>
                                            ))
                                        }
                                    </select>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                    <label className="text-slate-700 font-semibold block mb-1">Cantidad Bonches Extra</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={extraBonches}
                                        onChange={(e) => setExtraBonches(parseInt(e.target.value, 10) || 1)}
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-xs focus:outline-none focus:border-emerald-600"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-700 font-semibold block mb-1">Cultivo (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: ROSA - Explorer"
                                        value={extraCultivo}
                                        onChange={(e) => setExtraCultivo(e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setMostrarModalExtra(false)}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmarAgregarExtra}
                                disabled={isPending || !selectedActivoId}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                            >
                                Agregar a Caja #{cajaSeleccionada?.numeroCaja}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Componente para Reportar Daño / Merma con Cámara Móvil y Compresión de Imagen a Cloudflare R2
function FormularioDanoMerma({
    item,
    onGuardar,
    onCancelar
}: {
    item: ItemRecepcion;
    onGuardar: (danados: number, motivo: string, fotos: string[]) => void;
    onCancelar: () => void;
}) {
    const [danadosCount, setDanadosCount] = useState<number>(item.bonchesDanados || 1);
    const [motivo, setMotivo] = useState<string>(item.motivoDano || 'Flor dañada/mal estado al recibir');
    const [fotoUrl, setFotoUrl] = useState<string>(item.fotosDano?.[0] || '');
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Función para comprimir cliente Canvas a JPEG ultra liviano (< 150KB) y subir a R2
    const handleCapturaCamara = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            const imageBitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');

            const maxDim = 1024;
            let width = imageBitmap.width;
            let height = imageBitmap.height;

            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(imageBitmap, 0, 0, width, height);

            const compressedBlob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.75);
            });

            if (!compressedBlob) {
                throw new Error('Error al comprimir imagen de la cámara');
            }

            const formData = new FormData();
            const fileName = `merma_${item.id}_${Date.now()}.jpg`;
            formData.append('file', compressedBlob, fileName);
            formData.append('fileName', fileName);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || 'Error al subir la imagen.');
            }

            const uploadedUrl = data.publicUrl || data.url;
            setFotoUrl(uploadedUrl);
        } catch (err: any) {
            console.error('Error al capturar/comprimir foto:', err);
            setUploadError(err.message || 'Error al procesar la foto');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-bold text-rose-800">
                <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Reportar Merma / Producto Dañado
                </span>
                <button onClick={onCancelar} className="text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                    <label className="text-slate-700 font-semibold block mb-0.5 text-[11px]">Bonches Dañados</label>
                    <input
                        type="number"
                        min={0}
                        max={item.bonchesEsperados}
                        value={danadosCount}
                        onChange={(e) => setDanadosCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs focus:outline-none focus:border-rose-500"
                    />
                </div>

                <div>
                    <label className="text-slate-700 font-semibold block mb-0.5 text-[11px]">Motivo del Daño</label>
                    <select
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 font-medium text-slate-800 text-xs focus:outline-none focus:border-rose-500"
                    >
                        <option value="Flor rota / tallo quebrado">Flor rota / tallo quebrado</option>
                        <option value="Manchada / maltratada">Manchada / maltratada</option>
                        <option value="Pudrición / humedad excesiva">Pudrición / humedad excesiva</option>
                        <option value="Variedad no coincide">Variedad no coincide</option>
                        <option value="Faltante en empaque">Faltante en empaque</option>
                    </select>
                </div>
            </div>

            {/* Nota Informativa sobre el Stock Neto resultante */}
            <div className="bg-white border border-rose-200 rounded p-2 text-[11px] text-slate-700 font-medium flex items-center justify-between">
                <span>Resultado al cargar:</span>
                <div className="flex items-center gap-2 font-bold">
                    <span className="text-emerald-700">✓ {Math.max(0, (item.verificado ? (item.bonchesRecibidos || item.bonchesEsperados) : item.bonchesEsperados) - danadosCount)} a Stock</span>
                    {danadosCount > 0 ? (
                        <>
                            <span className="text-slate-300">|</span>
                            <span className="text-rose-600">⚠️ {danadosCount} Merma</span>
                        </>
                    ) : (
                        <span className="text-emerald-600 text-[10px] font-normal">(100% en buen estado)</span>
                    )}
                </div>
            </div>

            {/* Captura de Foto Evidencia con Cámara Móvil */}
            <div>
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handleCapturaCamara}
                    className="hidden"
                />

                {isUploading ? (
                    <div className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-center gap-2 text-xs font-bold text-emerald-700">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        Comprimiendo y subiendo foto a R2...
                    </div>
                ) : fotoUrl ? (
                    <div className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={fotoUrl} alt="Evidencia Merma" className="w-10 h-10 object-cover rounded border border-slate-200 shrink-0" />
                            <div className="truncate text-xs">
                                <span className="font-bold text-slate-800 block truncate text-[11px]">Evidencia Lista</span>
                                <a href={fotoUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-mono text-[10px] underline truncate block">
                                    Ver en HD
                                </a>
                            </div>
                        </div>
                        <button
                            onClick={() => setFotoUrl('')}
                            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-bold border border-rose-200"
                        >
                            Quitar
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3.5 sm:py-4 bg-white hover:bg-rose-50/50 border-2 border-dashed border-rose-300 hover:border-rose-400 rounded-xl text-xs font-extrabold text-rose-800 flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-2xs"
                    >
                        <Camera className="w-5 h-5 text-rose-600 shrink-0" />
                        <span>Abrir Cámara del Móvil / Tomar Foto</span>
                    </button>
                )}

                {uploadError && (
                    <div className="mt-1 text-[10px] text-rose-600 font-semibold">{uploadError}</div>
                )}
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-1">
                {(item.bonchesDanados || 0) > 0 ? (
                    <button
                        onClick={() => onGuardar(0, '', [])}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-rose-100 text-rose-700 rounded text-xs font-bold border border-rose-200 flex items-center gap-1 transition-all"
                    >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Quitar / Eliminar Merma</span>
                    </button>
                ) : <div />}

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onCancelar}
                        className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-300"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onGuardar(danadosCount, motivo, fotoUrl ? [fotoUrl] : [])}
                        className={`px-3 py-1 text-white rounded text-xs font-bold shadow-xs ${
                            danadosCount === 0 ? 'bg-slate-700 hover:bg-slate-800' : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                    >
                        {danadosCount === 0 ? 'Guardar (Sin Merma)' : 'Guardar Merma'}
                    </button>
                </div>
            </div>
        </div>
    );
}
