'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Calendar,
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  RefreshCw,
  Printer,
  CheckCircle2,
  Package,
  MapPin,
  Sparkles,
  X,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  ProductAutocompleteCell,
  ProductCatalogItem,
  upsertProductInCatalogCache
} from '@/components/mermas/ProductAutocompleteCell';
import { encolarCopiasNiimbot } from '@/app/(dashboard)/inventario/actions';
import { playSuccessChime } from '@/utils/audioAlerts';

export interface IngresoPlanillaItem {
  id: string;
  fecha: string;
  productoId: string;
  activoFijoId: string | null;
  codigoPadre: string;
  nombreProducto: string;
  categoria: string;
  area: string;
  cantidad: number;
  stockActual: number;
  motivo: string;
  referencia: string;
  usuario?: {
    nombre: string | null;
    apellido: string | null;
    email: string;
  } | null;
}

interface PlanillaKPIs {
  totalPaquetesMes: number;
  totalPaquetesHoy: number;
  totalRegistros: number;
  florMayorIngreso: { nombre: string; cantidad: number };
  mesSeleccionado: string;
}

const formatFechaDMY = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateStr;
};

interface PlanillaIngresoRapidoProps {
  onClose?: () => void;
  onStockChanged?: () => void;
  defaultArea?: string;
}

export function PlanillaIngresoRapido({
  onClose,
  onStockChanged,
  defaultArea = 'CUARTO FRÍO'
}: PlanillaIngresoRapidoProps) {
  const [ingresos, setIngresos] = useState<IngresoPlanillaItem[]>([]);
  const [areasDisponibles, setAreasDisponibles] = useState<string[]>(['CUARTO FRÍO', 'BODEGA CENTRAL', ' SALA DE VENTAS']);
  const [nextSuggestedCode, setNextSuggestedCode] = useState<string>('010001');
  const [kpis, setKpis] = useState<PlanillaKPIs>({
    totalPaquetesMes: 0,
    totalPaquetesHoy: 0,
    totalRegistros: 0,
    florMayorIngreso: { nombre: 'Ninguna', cantidad: 0 },
    mesSeleccionado: ''
  });

  const [loading, setLoading] = useState(true);
  const [printingRowId, setPrintingRowId] = useState<string | null>(null);
  const [autoPrintOnInsert, setAutoPrintOnInsert] = useState(false);

  // Filtros de consulta
  const now = new Date();
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMes, setSelectedMes] = useState<string>(currentMonthValue);
  const [searchQuery, setSearchQuery] = useState('');

  // Paginación
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fila de Captura Rápida Superior (estilo Excel / Mermas)
  const todayStr = new Date().toISOString().split('T')[0];
  const [newFecha, setNewFecha] = useState(todayStr);
  const [fechaDisplay, setFechaDisplay] = useState(formatFechaDMY(todayStr));
  const hiddenDatePickerRef = useRef<HTMLInputElement>(null);

  const [newProductoNombre, setNewProductoNombre] = useState('');
  const [newProductoId, setNewProductoId] = useState<string | null>(null);
  const [newSku, setNewSku] = useState<string | null>(null);
  const [newCategoria, setNewCategoria] = useState('FLORISTERIA');
  const [newCantidad, setNewCantidad] = useState<string>('1');
  const [newArea, setNewArea] = useState<string>(defaultArea || 'CUARTO FRÍO');
  const [newMotivo, setNewMotivo] = useState<string>('Ingreso CEDI / Proveedor');
  const [newReferencia, setNewReferencia] = useState<string>('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const newFlorInputRef = useRef<HTMLInputElement>(null);
  const newCantidadInputRef = useRef<HTMLInputElement>(null);

  // Modal: Crear producto nuevo al vuelo (bajo un único código padre de 6 dígitos)
  const [crearOpen, setCrearOpen] = useState(false);
  const [crearNombre, setCrearNombre] = useState('');
  const [crearCodigo, setCrearCodigo] = useState('');
  const [crearCategoria, setCrearCategoria] = useState('FLORISTERIA');
  const [crearCosto, setCrearCosto] = useState('');
  const [crearPrecioVenta, setCrearPrecioVenta] = useState('');
  const [crearGuardando, setCrearGuardando] = useState(false);

  const handleFechaDisplayChange = (val: string) => {
    setFechaDisplay(val);
    const parts = val.trim().split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (d && m && y && y.length === 4) {
        const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        setNewFecha(iso);
      }
    }
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedMes) params.set('mes', selectedMes);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/inventario/ingresos-planilla?${params.toString()}`);
      if (!res.ok) throw new Error('Error al cargar planilla de ingresos');

      const data = await res.json();
      setIngresos(data.ingresos || []);
      if (data.kpis) setKpis(data.kpis);
      if (Array.isArray(data.areas) && data.areas.length > 0) {
        setAreasDisponibles(data.areas);
      }
      if (data.nextSuggestedCode) {
        setNextSuggestedCode(data.nextSuggestedCode);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error cargando planilla de ingresos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    cargarDatos();
  }, [selectedMes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      cargarDatos();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Al seleccionar producto del autocompletado -> salta automático a Cantidad
  const handleSelectProductNewRow = (p: ProductCatalogItem) => {
    setNewProductoId(p.id);
    setNewProductoNombre(p.name);
    setNewSku(p.code);
    setNewCategoria(p.category || 'FLORISTERIA');

    requestAnimationFrame(() => {
      if (newCantidadInputRef.current) {
        newCantidadInputRef.current.focus();
        newCantidadInputRef.current.select();
      }
      setTimeout(() => {
        if (newCantidadInputRef.current) {
          newCantidadInputRef.current.focus();
          newCantidadInputRef.current.select();
        }
      }, 40);
    });
  };

  const handleNombreNewRowChange = (val: string) => {
    setNewProductoNombre(val);
    if (newProductoId) {
      setNewProductoId(null);
      setNewSku(null);
    }
  };

  const abrirCrearProducto = (nombre: string) => {
    setCrearNombre(nombre.toUpperCase());
    setCrearCodigo(nextSuggestedCode || '010001');
    setCrearCategoria('FLORISTERIA');
    setCrearCosto('');
    setCrearPrecioVenta('');
    setCrearOpen(true);
  };

  const handleCrearProductoNuevo = async () => {
    const nombre = crearNombre.trim().toUpperCase();
    const codigo = crearCodigo.trim().toUpperCase();
    if (!nombre) {
      toast.error('El nombre de la flor/producto es obligatorio');
      return;
    }

    try {
      setCrearGuardando(true);
      const res = await fetch('/api/inventario/ingresos-planilla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_NEW_PRODUCT',
          nombre,
          codigo,
          categoria: crearCategoria.trim() || 'FLORISTERIA',
          area: newArea || 'CUARTO FRÍO',
          costoBase: crearCosto ? Number(crearCosto) : 0,
          precioVenta: crearPrecioVenta ? Number(crearPrecioVenta) : 0
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al crear producto');
      }

      toast.success(`Producto creado con código padre: ${data.producto.sku}`);
      setCrearOpen(false);

      const newCatalogItem: ProductCatalogItem = {
        id: data.producto.id,
        code: data.producto.sku,
        name: data.producto.nombre,
        category: data.producto.categoria,
        stock: 0,
        costoBase: data.producto.costoBase
      };
      upsertProductInCatalogCache(newCatalogItem);
      handleSelectProductNewRow(newCatalogItem);
    } catch (err: any) {
      toast.error(err.message || 'Error creando producto');
    } finally {
      setCrearGuardando(false);
    }
  };

  // Imprimir etiquetas serializadas hijas (010055-0001, 0002...) de una fila
  const handleImprimirEtiquetasFila = async (activoFijoId: string | null, cantidad: number, nombre: string, codigoPadre: string, rowId?: string) => {
    if (!activoFijoId) {
      toast.error('Este producto aún no tiene código de etiqueta vinculado');
      return;
    }
    const copias = Math.max(1, Number(cantidad) || 1);
    if (rowId) setPrintingRowId(rowId);

    try {
      const defaultPrinter = typeof window !== 'undefined' ? localStorage.getItem('default_printer') || 'Vorttek' : 'Vorttek';
      const res = await encolarCopiasNiimbot(activoFijoId, copias, '50x25', defaultPrinter);
      if (res.success) {
        toast.success(`🖨️ ${copias} etiquetas serializadas de ${codigoPadre} (${nombre}) enviadas a cola de impresión`);
      } else {
        toast.error(res.error || 'Error al encolar impresión');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar a impresora');
    } finally {
      if (rowId) setPrintingRowId(null);
    }
  };

  // Guardar nueva fila con Enter o Ctrl+Enter (permite pasar producto directo si se invocó con Ctrl+Enter desde el buscador)
  const handleGuardarNuevaFila = async (overrideProduct?: ProductCatalogItem) => {
    const targetId = overrideProduct ? overrideProduct.id : newProductoId;
    const targetNombre = overrideProduct ? overrideProduct.name : newProductoNombre;
    const targetSku = overrideProduct ? overrideProduct.code : newSku;
    const targetCat = overrideProduct ? (overrideProduct.category || 'FLORISTERIA') : newCategoria;

    if (!targetNombre.trim()) {
      toast.error('Escribe o selecciona una flor del catálogo');
      newFlorInputRef.current?.focus();
      return;
    }

    if (!targetId) {
      toast.error('Selecciona la flor de la lista desplegable o usa "+ Crear producto nuevo"');
      newFlorInputRef.current?.focus();
      return;
    }

    const cantNum = parseInt(newCantidad, 10);
    if (isNaN(cantNum) || cantNum <= 0) {
      toast.error('Ingresa una cantidad válida mayor a 0');
      newCantidadInputRef.current?.focus();
      return;
    }

    if (isSubmittingNew) return;

    try {
      setIsSubmittingNew(true);
      const res = await fetch('/api/inventario/ingresos-planilla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: newFecha,
          productoId: targetId,
          nombreProducto: targetNombre.trim().toUpperCase(),
          sku: targetSku,
          categoria: targetCat,
          area: newArea,
          cantidad: cantNum,
          motivo: newMotivo,
          referencia: newReferencia.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al registrar ingreso');
      }

      playSuccessChime();
      const nuevoIngreso: IngresoPlanillaItem = data.ingreso;

      toast.success(
        `+${cantNum} paq ingresados a [${nuevoIngreso.codigoPadre}] ${nuevoIngreso.nombreProducto} (Stock: ${nuevoIngreso.stockActual})`
      );

      // Si tiene activado Auto-Imprimir etiquetas al insertar, encolar automáticamente
      if (autoPrintOnInsert && nuevoIngreso.activoFijoId) {
        handleImprimirEtiquetasFila(
          nuevoIngreso.activoFijoId,
          cantNum,
          nuevoIngreso.nombreProducto,
          nuevoIngreso.codigoPadre
        );
      }

      // Actualizar tabla en vivo sin recargar toda la pantalla
      setIngresos((prev) => [
        nuevoIngreso,
        ...prev.map((item) =>
          item.productoId === nuevoIngreso.productoId
            ? { ...item, stockActual: nuevoIngreso.stockActual }
            : item
        )
      ]);

      setKpis((prev) => ({
        ...prev,
        totalPaquetesMes: prev.totalPaquetesMes + cantNum,
        totalPaquetesHoy: prev.totalPaquetesHoy + cantNum,
        totalRegistros: prev.totalRegistros + 1
      }));

      if (onStockChanged) onStockChanged();

      // Limpiar flor y cantidad, manteniendo Fecha, Área y Proveedor/Referencia para seguir digitando corrido
      setNewProductoNombre('');
      setNewProductoId(null);
      setNewSku(null);
      setNewCantidad('1');

      requestAnimationFrame(() => {
        newFlorInputRef.current?.focus();
      });
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar ingreso');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Atajo global Ctrl + Enter / Cmd + Enter en toda la Planilla para guardar directamente y abrir nueva línea
  const guardarRef = useRef(handleGuardarNuevaFila);
  guardarRef.current = handleGuardarNuevaFila;

  useEffect(() => {
    const handleGlobalCtrlEnter = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (crearOpen) return;
        e.preventDefault();
        if (newProductoId) {
          guardarRef.current();
        } else {
          newFlorInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalCtrlEnter);
    return () => window.removeEventListener('keydown', handleGlobalCtrlEnter);
  }, [newProductoId, crearOpen]);

  // Edición en línea de una fila existente (ajusta stock automáticamente)
  const handleActualizarFila = async (id: string, campo: string, valor: any) => {
    try {
      const res = await fetch('/api/inventario/ingresos-planilla', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [campo]: valor })
      });

      if (!res.ok) throw new Error('Error al actualizar fila');

      toast.success('Ingreso y stock actualizados', { duration: 1500 });
      cargarDatos();
      if (onStockChanged) onStockChanged();
    } catch (err) {
      toast.error('No se pudo actualizar la fila');
    }
  };

  // Eliminar / Revertir fila (descuenta del stock lo que se había sumado por error)
  const handleEliminarFila = async (item: IngresoPlanillaItem) => {
    if (
      !confirm(
        `¿Revertir este ingreso de +${item.cantidad} en [${item.codigoPadre}] ${item.nombreProducto}?\n\nSe descontarán ${item.cantidad} unidades del stock actual.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/inventario/ingresos-planilla?id=${item.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error al revertir ingreso');

      toast.success(`Ingreso revertido (-${item.cantidad} del stock de ${item.codigoPadre})`);
      cargarDatos();
      if (onStockChanged) onStockChanged();
    } catch (err) {
      toast.error('No se pudo revertir el ingreso');
    }
  };

  // Exportar planilla a Excel
  const handleExportarExcel = () => {
    if (ingresos.length === 0) {
      toast.error('No hay registros para exportar');
      return;
    }

    const rows = ingresos.map((r, index) => ({
      '#': index + 1,
      'Fecha': new Date(r.fecha).toLocaleDateString('es-HN'),
      'Hora': new Date(r.fecha).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }),
      'Código Padre': r.codigoPadre,
      'Producto / Flor': r.nombreProducto,
      'Área / Ubicación': r.area,
      'Cantidad Ingresada': r.cantidad,
      'Stock Resultante': r.stockActual,
      'Origen / Motivo': r.motivo,
      'Proveedor / Lote / Referencia': r.referencia || '',
      'Registrado Por': r.usuario ? `${r.usuario.nombre || ''} ${r.usuario.apellido || ''}`.trim() : 'Sistema'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ingresos_Inventario');
    XLSX.writeFile(wb, `Planilla_Ingresos_${selectedMes || 'Historico'}.xlsx`);
    toast.success('Archivo Excel descargado');
  };

  const mesesOpciones = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-HN', { month: 'long', year: 'numeric' });
    return { value: val, label: label.charAt(0).toUpperCase() + label.slice(1) };
  });
  mesesOpciones.unshift({ value: 'TODOS', label: 'Todo el Histórico' });

  const totalItems = ingresos.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedIngresos = ingresos.slice(startIndex, startIndex + itemsPerPage);
  const correlativoOficial = selectedMes === 'TODOS' ? 'ING-HISTÓRICO' : `ING-${selectedMes}`;

  return (
    <div className="space-y-4">
      {/* Cabecera de la Planilla Rápida */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
              title="Volver a la vista normal de Inventario"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Planilla Rápida de Ingresos (Modo Excel)
              </h2>
              <span className="text-[11px] font-mono font-black bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                Mismo Código Padre • Cero Duplicados
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Busca la flor, digita la cantidad de paquetes y presiona <strong>Enter</strong>. Todo suma siempre al mismo código padre (ej. <code className="font-mono font-bold text-slate-700">010055</code>).
            </p>
          </div>
        </div>

        {/* Resumen rápido + Acciones */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-3.5 py-2 flex items-center gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Ingresado Hoy</span>
              <span className="text-sm font-black font-mono text-emerald-950">+{kpis.totalPaquetesHoy} paq</span>
            </div>
            <div className="h-6 w-px bg-emerald-200" />
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Total Mes</span>
              <span className="text-sm font-black font-mono text-emerald-950">+{kpis.totalPaquetesMes} paq</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportarExcel}
            className="px-3.5 py-2.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95 rounded-2xl text-xs font-bold shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={cargarDatos}
            className="p-2.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95 rounded-2xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center cursor-pointer"
            title="Actualizar planilla"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* BARRA SUPERIOR FIJA DE CAPTURA RÁPIDA (IDÉNTICA A MERMAS) */}
      <div className="bg-emerald-50/70 border-2 border-emerald-300/80 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-emerald-200">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300 shadow-2xs">
              <Zap className="w-4 h-4 text-emerald-700" />
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase text-emerald-950 flex items-center gap-2">
                <span>Captura Rápida de Mercadería Recién Llegada</span>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                  {correlativoOficial}
                </span>
              </h3>
              <p className="text-[11px] text-emerald-800/80 font-medium">
                1. Escribe la flor y presiona <kbd className="px-1 py-0.5 bg-white text-emerald-900 rounded font-mono font-bold border border-emerald-300">Enter</kbd> → 2. Digita la cantidad y presiona <kbd className="px-1.5 py-0.5 bg-white text-emerald-900 rounded font-mono font-bold border border-emerald-300">Enter</kbd> o <kbd className="px-1.5 py-0.5 bg-white text-emerald-900 rounded font-mono font-bold border border-emerald-300 shadow-2xs">Ctrl + Enter</kbd> para guardar directo y abrir nueva línea.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Indicador de atajo rápido Ctrl + Enter */}
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-emerald-900 font-bold bg-emerald-100/80 px-2.5 py-1.5 rounded-xl border border-emerald-300">
              <span>Guardar directo + Nueva línea:</span>
              <kbd className="px-2 py-0.5 bg-white border border-emerald-300 rounded text-emerald-950 font-mono font-black shadow-2xs">
                Ctrl + Enter ↵
              </kbd>
            </div>

            {/* Toggle de Auto-Impresión de Etiquetas Serializadas al Insertar */}
            <label className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 cursor-pointer shadow-2xs select-none">
              <input
                type="checkbox"
                checked={autoPrintOnInsert}
                onChange={(e) => setAutoPrintOnInsert(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <Printer className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-[11px] font-extrabold text-emerald-950">
                Auto-Imprimir etiquetas serializadas al dar Enter
              </span>
            </label>
          </div>
        </div>

        {/* Fila Principal de Captura - Altura Uniforme h-10 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* 1. Fecha (dd/mm/aaaa) */}
          <div className="lg:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
              Fecha Ingreso
            </label>
            <div className="relative">
              <input
                type="text"
                value={fechaDisplay}
                onChange={(e) => handleFechaDisplayChange(e.target.value)}
                placeholder="dd/mm/aaaa"
                className="w-full h-10 pl-3 pr-8 text-xs font-bold text-slate-900 bg-white border border-emerald-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs font-mono"
              />
              <input
                ref={hiddenDatePickerRef}
                type="date"
                value={newFecha}
                onChange={(e) => {
                  if (e.target.value) {
                    setNewFecha(e.target.value);
                    setFechaDisplay(formatFechaDMY(e.target.value));
                  }
                }}
                className="sr-only"
                tabIndex={-1}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  try {
                    hiddenDatePickerRef.current?.showPicker();
                  } catch {
                    hiddenDatePickerRef.current?.focus();
                  }
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. Flor / Producto con Buscador Inteligente de Mermas */}
          <div className="lg:col-span-4 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
              <span>Flor / Producto (Catálogo)</span>
              {newSku && (
                <span className="font-mono text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded text-[10px] font-black border border-emerald-300">
                  CÓDIGO PADRE: {newSku}
                </span>
              )}
            </div>
            <ProductAutocompleteCell
              value={newProductoNombre}
              onChange={handleNombreNewRowChange}
              onSelectProduct={handleSelectProductNewRow}
              onCtrlEnterSelectAndSubmit={(prod) => {
                setNewProductoId(prod.id);
                setNewProductoNombre(prod.name);
                setNewSku(prod.code);
                setNewCategoria(prod.category || 'FLORISTERIA');
                handleGuardarNuevaFila(prod);
              }}
              onCreateNew={abrirCrearProducto}
              inputRef={newFlorInputRef}
              placeholder="Escribe flor o código (ej. Rosa Roja, Girasol, 010055)..."
              className={`!h-10 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 shadow-2xs ${
                newProductoNombre.trim() && !newProductoId ? 'border-amber-400' : 'border-emerald-300'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleGuardarNuevaFila();
                }
              }}
            />
          </div>

          {/* 3. Cantidad a Ingresar (Paquetes / Unidades) */}
          <div className="lg:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
              Cantidad (+ Stock)
            </label>
            <input
              ref={newCantidadInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newCantidad}
              onChange={(e) => {
                const onlyDigits = e.target.value.replace(/\D/g, '');
                setNewCantidad(onlyDigits);
              }}
              onFocus={(e) => {
                const target = e.currentTarget;
                requestAnimationFrame(() => target.select());
              }}
              onClick={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleGuardarNuevaFila();
                }
              }}
              className="w-full h-10 text-center px-3 font-mono font-black text-slate-900 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm shadow-2xs"
              placeholder="1"
            />
          </div>

          {/* 4. Área / Ubicación Destino */}
          <div className="lg:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
              Ubicación / Área
            </label>
            <select
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleGuardarNuevaFila();
                }
              }}
              className="w-full h-10 px-2.5 text-xs font-bold text-slate-900 bg-white border border-emerald-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
            >
              {Array.from(new Set(['CUARTO FRÍO', ...areasDisponibles])).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Botón Insertar (Enter / Ctrl+Enter) */}
          <div className="lg:col-span-2 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider block opacity-0 select-none hidden lg:block">
              &nbsp;
            </label>
            <button
              type="button"
              onClick={() => handleGuardarNuevaFila()}
              disabled={isSubmittingNew || !newProductoId}
              className="w-full h-10 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-500"
              title="Guardar línea y saltar a la siguiente (Enter o Ctrl+Enter)"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{isSubmittingNew ? 'Guardando...' : 'Ingresar (Ctrl+Enter)'}</span>
            </button>
          </div>
        </div>

        {/* Fila Secundaria: Proveedor / Lote / Nota fija */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 text-[11px] whitespace-nowrap font-bold">
            <span>Origen / Motivo:</span>
            <select
              value={newMotivo}
              onChange={(e) => setNewMotivo(e.target.value)}
              className="bg-white text-emerald-950 font-bold px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs outline-none cursor-pointer"
            >
              <option value="Ingreso CEDI / Proveedor">Ingreso CEDI / Proveedor</option>
              <option value="Compra Local / Finca">Compra Local / Finca</option>
              <option value="Importación Aérea">Importación Aérea</option>
              <option value="Ajuste Positivo / Reingreso">Ajuste Positivo / Reingreso</option>
            </select>
          </div>
          <div className="flex-1 w-full">
            <input
              type="text"
              value={newReferencia}
              onChange={(e) => setNewReferencia(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGuardarNuevaFila();
                }
              }}
              placeholder="Proveedor, Finca o N° de Envío opcional (se mantiene fijo para todas las filas que ingreses)..."
              className="w-full py-1.5 px-3 text-xs text-slate-800 bg-white border border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-slate-400 transition shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA DE LA PLANILLA */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Período:</span>
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(e.target.value)}
              className="bg-transparent border-none outline-none font-black text-slate-900 cursor-pointer"
            >
              {mesesOpciones.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar planilla por flor, código 010055 o proveedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <div className="text-right text-xs font-bold text-slate-500 self-center">
          Filas en planilla: <span className="text-slate-900 font-black">{totalItems}</span>
        </div>
      </div>

      {/* TABLA PRINCIPAL TIPO EXCEL DE INGRESOS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-10">#</th>
                <th className="py-3 px-3 w-28">Fecha / Hora</th>
                <th className="py-3 px-3 w-28">Código Padre</th>
                <th className="py-3 px-3 min-w-[220px]">Producto / Flor</th>
                <th className="py-3 px-3 w-32">Ubicación</th>
                <th className="py-3 px-3 text-center w-32">Cant. Ingresada</th>
                <th className="py-3 px-3 text-center w-28">Stock Total</th>
                <th className="py-3 px-3 min-w-[170px]">Proveedor / Referencia</th>
                <th className="py-3 px-3 text-center w-40">Etiquetas Seriales</th>
                <th className="py-3 px-3 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Cargando planilla de ingresos...
                  </td>
                </tr>
              ) : ingresos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">Sin ingresos registrados en este período</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Usa la barra verde superior para empezar a ingresar mercadería como en Excel.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedIngresos.map((item, idx) => {
                  const rowNumber = startIndex + idx + 1;
                  const fechaObj = new Date(item.fecha);
                  const fechaStr = fechaObj.toLocaleDateString('es-HN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });
                  const horaStr = fechaObj.toLocaleTimeString('es-HN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr
                      key={item.id}
                      className="group hover:bg-emerald-50/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] font-bold text-slate-400">
                        {rowNumber}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-800 text-xs">{fechaStr}</div>
                        <div className="font-mono text-[10px] text-slate-400">{horaStr}</div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-[#0500A3] border border-blue-200">
                          {item.codigoPadre}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-black text-slate-900 text-xs uppercase">
                          {item.nombreProducto}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">
                          {item.motivo}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {item.area}
                        </span>
                      </td>

                      {/* Cantidad Ingresada (Editable en línea igual a Mermas) */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center justify-center bg-emerald-50 border border-emerald-200 rounded-xl px-2 py-0.5">
                          <span className="text-emerald-700 font-black mr-0.5">+</span>
                          <input
                            type="number"
                            min={1}
                            defaultValue={item.cantidad}
                            onFocus={(e) => e.currentTarget.select()}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val > 0 && val !== item.cantidad) {
                                handleActualizarFila(item.id, 'cantidad', val);
                              } else {
                                e.target.value = String(item.cantidad);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="w-14 text-center font-mono font-black text-emerald-900 bg-transparent outline-none text-xs"
                          />
                        </div>
                      </td>

                      {/* Stock Actual del Código Padre */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {item.stockActual}
                        </span>
                      </td>

                      {/* Proveedor / Referencia (Editable en línea) */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          defaultValue={item.referencia || ''}
                          placeholder="Sin nota / proveedor..."
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val !== (item.referencia || '')) {
                              handleActualizarFila(item.id, 'referencia', val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-full text-xs text-slate-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-400 rounded-lg px-2 py-1 outline-none transition"
                        />
                      </td>

                      {/* Botón 1-Clic para Imprimir las N Etiquetas Serializadas Hijas (010055-0001...) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!item.activoFijoId || printingRowId === item.id}
                          onClick={() =>
                            handleImprimirEtiquetasFila(
                              item.activoFijoId,
                              item.cantidad,
                              item.nombreProducto,
                              item.codigoPadre,
                              item.id
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-[11px] transition-all active:scale-95 cursor-pointer disabled:opacity-40"
                          title={`Imprimir ${item.cantidad} etiquetas serializadas hijas (${item.codigoPadre}-0001...)`}
                        >
                          {printingRowId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Printer className="w-3.5 h-3.5" />
                          )}
                          <span>Imprimir ({item.cantidad})</span>
                        </button>
                      </td>

                      {/* Revertir / Eliminar fila */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleEliminarFila(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Revertir este ingreso y descontar del stock"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación inferior */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>
              Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
              >
                Anterior
              </button>
              <span className="px-2">
                Página {safeCurrentPage} de {totalPages}
              </span>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal para Crear Flor / Producto Nuevo al Vuelo con Código Padre Único */}
      {crearOpen && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Crear Producto Nuevo en Catálogo</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Se vinculará automáticamente en Inventario y Facturación bajo un único código padre.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCrearOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nombre de la Flor / Producto *
                </label>
                <input
                  type="text"
                  value={crearNombre}
                  onChange={(e) => setCrearNombre(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl uppercase"
                  placeholder="EJ. ROSA ROJA FREEDOM 50CM"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Código Padre (6 dígitos) *
                  </label>
                  <input
                    type="text"
                    value={crearCodigo}
                    onChange={(e) => setCrearCodigo(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono font-black border border-slate-300 rounded-xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Categoría / Grupo
                  </label>
                  <input
                    type="text"
                    value={crearCategoria}
                    onChange={(e) => setCrearCategoria(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl uppercase"
                    placeholder="FLORISTERIA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Costo por Paquete (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={crearCosto}
                    onChange={(e) => setCrearCosto(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Precio Venta (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={crearPrecioVenta}
                    onChange={(e) => setCrearPrecioVenta(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCrearOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={crearGuardando}
                onClick={handleCrearProductoNuevo}
                className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md disabled:opacity-50"
              >
                {crearGuardando ? 'Creando...' : 'Crear y Seleccionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
