'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  Share2,
  MessageCircle,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  ChevronRight,
  Printer,
  FileText,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportarCarteraGeneralExcel, exportarEstadoCuentaClienteExcel } from '@/utils/cxcExportUtils';

interface ClienteTab {
  id: string;
  nombre: string;
  departamento?: string | null;
  telefono?: string | null;
  rtn?: string | null;
  saldoTotal: number;
  facturasCount: number;
}

interface MovimientoFila {
  id: string;
  originalId: string;
  fecha: string;
  tipo: 'SALDO_INICIAL' | 'FACTURA' | 'PAGO_EFECTIVO' | 'TRANSFERENCIA' | 'AJUSTE_FLOR';
  tipoEtiqueta: string;
  documento: string;
  detalles: string;
  debito: number;
  credito: number;
  saldoAcumulado: number;
}

interface ExcelLiveGridProps {
  initialClienteId?: string | null;
  onOpenModalFactura?: (cliente?: any) => void;
  onOpenModalAbono?: (cliente?: any) => void;
  onOpenModalNC?: (cliente?: any) => void;
}

export default function ExcelLiveGrid({
  initialClienteId,
  onOpenModalFactura,
  onOpenModalAbono,
  onOpenModalNC
}: ExcelLiveGridProps) {
  const [clientes, setClientes] = useState<ClienteTab[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>(initialClienteId || '');
  const [searchTab, setSearchTab] = useState<string>('');
  const [loadingClientes, setLoadingClientes] = useState<boolean>(true);

  // Datos del libro mayor del cliente seleccionado
  const [movimientos, setMovimientos] = useState<MovimientoFila[]>([]);
  const [clienteActual, setClienteActual] = useState<any>(null);
  const [loadingMovimientos, setLoadingMovimientos] = useState<boolean>(false);

  // Fila de Entrada Rápida estilo Excel
  const [nuevaFecha, setNuevaFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nuevoTipo, setNuevoTipo] = useState<'FACTURA' | 'PAGO_EFECTIVO' | 'TRANSFERENCIA' | 'AJUSTE_FLOR'>('FACTURA');
  const [nuevoDoc, setNuevoDoc] = useState<string>('');
  const [nuevoDetalle, setNuevoDetalle] = useState<string>('');
  const [nuevoCargo, setNuevoCargo] = useState<string>('');
  const [nuevoAbono, setNuevoAbono] = useState<string>('');
  const [guardandoFila, setGuardandoFila] = useState<boolean>(false);

  // Modal de WhatsApp
  const [modalWhatsAppOpen, setModalWhatsAppOpen] = useState<boolean>(false);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<'ESTADO' | 'CORDIAL' | 'COBRO'>('ESTADO');

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const cargoInputRef = useRef<HTMLInputElement>(null);

  // Cargar lista de clientes
  const cargarClientes = async () => {
    try {
      setLoadingClientes(true);
      const res = await fetch('/api/cxc/clientes?filtro=TODOS');
      if (res.ok) {
        const data = await res.json();
        const tabs: ClienteTab[] = data.map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          departamento: c.departamento,
          telefono: c.telefono,
          rtn: c.rtn,
          saldoTotal: Number(c.saldoTotal || 0),
          facturasCount: c.facturasPendientesCount || 0
        }));

        setClientes(tabs);
        if (!selectedClienteId && tabs.length > 0) {
          setSelectedClienteId(tabs[0].id);
        }
      }
    } catch (err) {
      console.error('Error cargando clientes para Excel Grid:', err);
    } finally {
      setLoadingClientes(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  // Cargar movimientos del cliente seleccionado
  const cargarMovimientos = async (cId: string) => {
    if (!cId) return;
    try {
      setLoadingMovimientos(true);
      const res = await fetch(`/api/cxc/movimientos?clienteId=${cId}`);
      if (res.ok) {
        const json = await res.json();
        setClienteActual(json.cliente);
        setMovimientos(json.movimientos || []);
      }
    } catch (err) {
      console.error('Error cargando movimientos de cliente:', err);
    } finally {
      setLoadingMovimientos(false);
    }
  };

  useEffect(() => {
    if (selectedClienteId) {
      cargarMovimientos(selectedClienteId);
    }
  }, [selectedClienteId]);

  // Manejar creación rápida de fila desde la cuadrícula
  const handleAgregarFila = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedClienteId) {
      toast.error('Selecciona un cliente primero');
      return;
    }

    const cargoNum = parseFloat(nuevoCargo || '0');
    const abonoNum = parseFloat(nuevoAbono || '0');

    if (nuevoTipo === 'FACTURA' && (isNaN(cargoNum) || cargoNum <= 0)) {
      toast.error('Ingresa un monto de Cargo / Factura mayor a 0');
      cargoInputRef.current?.focus();
      return;
    }

    if (['PAGO_EFECTIVO', 'TRANSFERENCIA', 'AJUSTE_FLOR'].includes(nuevoTipo) && (isNaN(abonoNum) || abonoNum <= 0)) {
      toast.error('Ingresa un monto de Abono / Pago mayor a 0');
      return;
    }

    try {
      setGuardandoFila(true);
      const payload = {
        clienteId: selectedClienteId,
        fecha: nuevaFecha,
        tipo: nuevoTipo,
        documento: nuevoDoc.trim() || undefined,
        detalles: nuevoDetalle.trim() || undefined,
        debito: cargoNum > 0 ? cargoNum : undefined,
        credito: abonoNum > 0 ? abonoNum : undefined
      };

      const res = await fetch('/api/cxc/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar la fila');
      }

      toast.success('Movimiento registrado en Excel Live');

      // Limpiar campos de fila
      setNuevoCargo('');
      setNuevoAbono('');
      setNuevoDoc('');
      setNuevoDetalle('');

      // Recargar movimientos y lista general
      await cargarMovimientos(selectedClienteId);
      cargarClientes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al agregar movimiento');
    } finally {
      setGuardandoFila(false);
    }
  };

  // Manejar anulación de movimiento
  const handleEliminarMovimiento = async (m: MovimientoFila) => {
    if (m.tipo === 'SALDO_INICIAL') {
      toast.error('El saldo inicial se gestiona desde el botón "Saldo Excel"');
      return;
    }

    const confirmar = confirm(`¿Estás seguro de anular el movimiento ${m.documento} (${m.tipoEtiqueta})?`);
    if (!confirmar) return;

    try {
      setLoadingMovimientos(true);
      const tipoApi = m.tipo === 'FACTURA' ? 'FACTURA' : (m.tipo === 'AJUSTE_FLOR' ? 'AJUSTE_FLOR' : 'PAGO');
      const res = await fetch(`/api/cxc/movimientos?id=${m.originalId}&tipo=${tipoApi}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al anular');

      toast.success('Movimiento anulado correctamente');
      await cargarMovimientos(selectedClienteId);
      cargarClientes();
    } catch (err: any) {
      toast.error(err.message || 'Error al anular movimiento');
    } finally {
      setLoadingMovimientos(false);
    }
  };

  // Exportar Excel individual del cliente
  const handleExportarExcelCliente = () => {
    if (!clienteActual || movimientos.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    const exportMovs = movimientos.map(m => ({
      fecha: m.fecha,
      tipo: m.tipoEtiqueta,
      documento: m.documento,
      detalles: m.detalles,
      debito: m.debito,
      credito: m.credito,
      saldoAcumulado: m.saldoAcumulado
    }));

    exportarEstadoCuentaClienteExcel(
      {
        nombre: clienteActual.nombre,
        telefono: clienteActual.telefono,
        rtn: clienteActual.rtn,
        departamento: clienteActual.departamento,
        saldoTotal: clienteActual.saldoTotal
      },
      exportMovs
    );
    toast.success('Descargando archivo Excel del cliente...');
  };

  // Generar texto de WhatsApp
  const generarTextoWhatsApp = () => {
    if (!clienteActual) return '';
    const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/c/${clienteActual.id}/cxc` : '';
    const saldoFormat = `L. ${Number(clienteActual.saldoTotal || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;

    if (plantillaSeleccionada === 'CORDIAL') {
      return `¡Hola ${clienteActual.nombre}! 🌸\nEsperamos que te encuentres muy bien.\nTe saludamos cordialmente de *Distribuidora Paraíso Floral* para compartirte tu estado de cuenta actualizado con un saldo pendiente de *${saldoFormat}*.\n\nPuedes revisar el detalle completo aquí:\n${publicUrl}\n\n¡Muchas gracias por tu preferencia!`;
    }

    if (plantillaSeleccionada === 'COBRO') {
      return `*AVISO IMPORTANTE - DISTRIBUIDORA PARAISO FLORAL*\n\nEstimado(a) *${clienteActual.nombre}*,\nLe recordamos que mantiene un saldo pendiente de *${saldoFormat}* correspondiente a entregas de flor.\n\nAgradeceremos confirmar su fecha de pago o enviarnos su comprobante de transferencia al presente número.\n\nVer estado de cuenta desglosado:\n${publicUrl}\n\nQuedamos a su disposición.`;
    }

    // Default ESTADO
    return `*DISTRIBUIDORA PARAISO FLORAL*\n*Estado de Cuenta Oficial*\n\nCliente: *${clienteActual.nombre}*\n• *Saldo Pendiente Total:* ${saldoFormat}\n• *Ubicación:* ${clienteActual.departamento || 'General'}\n\n• *Ver o Descargar Estado de Cuenta en PDF:*\n${publicUrl}\n\n¡Agradecemos su puntualidad y confianza!`;
  };

  const handleAbrirWhatsApp = () => {
    if (!clienteActual?.telefono) {
      toast.error('Este cliente no tiene teléfono registrado');
      return;
    }
    const cleanPhone = clienteActual.telefono.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 8 ? `504${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(generarTextoWhatsApp())}`;
    window.open(url, '_blank');
    setModalWhatsAppOpen(false);
  };

  const filteredTabs = clientes.filter(c =>
    c.nombre.toLowerCase().includes(searchTab.toLowerCase()) ||
    (c.departamento && c.departamento.toLowerCase().includes(searchTab.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[750px] animate-fadeIn">
      {/* 1. Barra Superior / Barra de Herramientas Estilo Google Sheets */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-black shadow-inner">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Modo Hoja de Cálculo (Excel Live Grid)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                  EN VIVO
                </span>
              </h2>
            </div>
            <p className="text-slate-300 text-xs font-medium">
              Gestión rápida de cargos, abonos y libro mayor con cálculo continuo de saldos.
            </p>
          </div>
        </div>

        {/* Botones de acción general */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón Nueva Factura */}
          <button
            onClick={() => onOpenModalFactura && onOpenModalFactura(clienteActual)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nueva Factura</span>
          </button>

          {/* Botón Nuevo Abono */}
          <button
            onClick={() => onOpenModalAbono && onOpenModalAbono(clienteActual)}
            className="px-3 py-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white rounded-xl font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>+ Registrar Abono</span>
          </button>

          {/* Botón Exportar Todo a Excel */}
          <button
            onClick={() => {
              exportarCarteraGeneralExcel(clientes as any);
              toast.success('Exportando Cartera General a Excel...');
            }}
            className="px-3 py-2 bg-slate-700/80 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl font-bold text-xs transition-all border border-slate-600 flex items-center gap-1.5"
            title="Exportar toda la cartera a Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Exportar Cartera</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Información del Cliente Activo & Métricas de Hoja */}
      {clienteActual && (
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                HOJA DE CLIENTE ACTIVA:
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black rounded-lg text-xs">
                {clienteActual.departamento || 'RUTA OCCIDENTE'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-slate-900">{clienteActual.nombre}</h3>
              <Link
                href={`/cxc/cliente/${clienteActual.id}`}
                className="text-emerald-700 hover:text-emerald-800 text-xs font-bold flex items-center gap-0.5 hover:underline"
                title="Ver perfil completo"
              >
                <span>Ver Perfil</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              📱 {clienteActual.telefono || 'Sin teléfono'} | Movimientos registrados: {movimientos.length}
            </p>
          </div>

          {/* Badge de Saldo Total Grande & Botones de Cliente */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-white border-2 border-emerald-500/40 p-3 rounded-2xl shadow-xs text-right min-w-[180px]">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Saldo Pendiente Actual</div>
              <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                L. {Number(clienteActual.saldoTotal || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* Botón WhatsApp */}
              <button
                onClick={() => setModalWhatsAppOpen(true)}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl font-extrabold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Cobrar por WhatsApp</span>
              </button>

              {/* Botón Exportar Hoja a Excel */}
              <button
                onClick={handleExportarExcelCliente}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 active:scale-95 text-slate-800 border border-slate-300 rounded-xl font-extrabold text-xs transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Descargar Hoja Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Fila de Entrada Rápida de Datos ("Fast Data Entry Row") */}
      <div className="bg-emerald-50/50 p-3.5 border-b border-emerald-200/80">
        <form onSubmit={handleAgregarFila} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-black text-xs text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="w-4 h-4 text-emerald-600" />
              Ingreso Rápido de Fila (Presiona Enter o botón para guardar en BD)
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Los saldos se recalculan automáticamente
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2 text-xs">
            {/* Columna Fecha */}
            <div className="md:col-span-2">
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                title="Fecha del movimiento"
                required
              />
            </div>

            {/* Columna Tipo de Movimiento */}
            <div className="md:col-span-2">
              <select
                value={nuevoTipo}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setNuevoTipo(val);
                  if (val === 'FACTURA') {
                    setNuevoAbono('');
                  } else {
                    setNuevoCargo('');
                  }
                }}
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="FACTURA">📄 Factura (+)</option>
                <option value="PAGO_EFECTIVO">💵 Pago Efectivo (-)</option>
                <option value="TRANSFERENCIA">🏦 Transferencia (-)</option>
                <option value="AJUSTE_FLOR">🌸 Flor Dañada / Ajuste (-)</option>
              </select>
            </div>

            {/* Columna Nro Referencia / Documento */}
            <div className="md:col-span-2">
              <input
                type="text"
                value={nuevoDoc}
                onChange={(e) => setNuevoDoc(e.target.value)}
                placeholder="Nro. Factura / Ref"
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
              />
            </div>

            {/* Columna Detalle */}
            <div className="md:col-span-3">
              <input
                type="text"
                value={nuevoDetalle}
                onChange={(e) => setNuevoDetalle(e.target.value)}
                placeholder="Detalle (Ej. 10 Bonches rosas, flete...)"
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Columna Cargo (+) o Abono (-) */}
            <div className="md:col-span-2">
              {nuevoTipo === 'FACTURA' ? (
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                    +L.
                  </span>
                  <input
                    ref={cargoInputRef}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={nuevoCargo}
                    onChange={(e) => setNuevoCargo(e.target.value)}
                    placeholder="Monto Cargo"
                    className="w-full pl-8 pr-2 py-2 bg-rose-50/60 border-2 border-rose-200 rounded-xl font-black text-rose-900 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none text-right"
                  />
                </div>
              ) : (
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-emerald-600 text-xs">
                    -L.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={nuevoAbono}
                    onChange={(e) => setNuevoAbono(e.target.value)}
                    placeholder="Monto Abono"
                    className="w-full pl-8 pr-2 py-2 bg-emerald-100/60 border-2 border-emerald-300 rounded-xl font-black text-emerald-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-right"
                  />
                </div>
              )}
            </div>

            {/* Botón Guardar Fila */}
            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={guardandoFila}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-extrabold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                title="Guardar fila en base de datos"
              >
                {guardandoFila ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Fila</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 4. Tabla de Datos Estilo Hoja de Cálculo / Google Sheets */}
      <div className="flex-1 overflow-auto bg-slate-50/30">
        {loadingMovimientos ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
            <p className="text-xs font-semibold text-slate-600">Calculando libro mayor y saldos continuos...</p>
          </div>
        ) : movimientos.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="font-black text-slate-900 text-base">Sin movimientos registrados aún</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Utiliza la fila de ingreso rápido arriba o los botones de acción para añadir la primera factura o abono.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead className="sticky top-0 z-10 bg-slate-200/95 border-b border-slate-300 backdrop-blur-xs text-[11px] font-black text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">#</th>
                <th className="py-2.5 px-3 w-28 border-r border-slate-300">A: Fecha</th>
                <th className="py-2.5 px-3 w-36 border-r border-slate-300">B: Tipo</th>
                <th className="py-2.5 px-3 w-36 border-r border-slate-300">C: Nro. Doc / Ref</th>
                <th className="py-2.5 px-3 border-r border-slate-300">D: Detalle / Concepto</th>
                <th className="py-2.5 px-3 w-32 text-right border-r border-slate-300">E: Cargo (+)</th>
                <th className="py-2.5 px-3 w-32 text-right border-r border-slate-300">F: Abono (-)</th>
                <th className="py-2.5 px-4 w-36 text-right border-r border-slate-300 bg-emerald-100/70 text-emerald-950 font-black">
                  G: Saldo (=)
                </th>
                <th className="py-2.5 px-2 w-14 text-center">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {movimientos.map((m, index) => {
                const esFactura = m.tipo === 'FACTURA' || m.tipo === 'SALDO_INICIAL';
                const esAbono = m.tipo === 'PAGO_EFECTIVO' || m.tipo === 'TRANSFERENCIA';
                const esAjuste = m.tipo === 'AJUSTE_FLOR';

                return (
                  <tr
                    key={m.id}
                    className={`hover:bg-emerald-50/40 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    {/* Fila # */}
                    <td className="py-2 px-3 text-center font-mono text-[10px] text-slate-400 border-r border-slate-200">
                      {index + 1}
                    </td>

                    {/* Fecha */}
                    <td className="py-2 px-3 font-mono font-medium text-slate-800 whitespace-nowrap border-r border-slate-200">
                      {new Date(m.fecha).toLocaleDateString('es-HN')}
                    </td>

                    {/* Tipo Badge */}
                    <td className="py-2 px-3 border-r border-slate-200">
                      {esFactura ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                          📄 {m.tipoEtiqueta}
                        </span>
                      ) : esAbono ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                          💵 {m.tipoEtiqueta}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                          🌸 {m.tipoEtiqueta}
                        </span>
                      )}
                    </td>

                    {/* Documento */}
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">
                      {m.documento}
                    </td>

                    {/* Detalle */}
                    <td className="py-2 px-3 font-medium text-slate-600 border-r border-slate-200 truncate max-w-xs">
                      {m.detalles}
                    </td>

                    {/* Cargo / Débito (+) */}
                    <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900 border-r border-slate-200">
                      {m.debito > 0 ? (
                        <span className="text-slate-900">
                          L. {m.debito.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Abono / Crédito (-) */}
                    <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-700 border-r border-slate-200">
                      {m.credito > 0 ? (
                        <span className="text-emerald-700">
                          -L. {m.credito.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Saldo Resultante (=) */}
                    <td className="py-2 px-4 text-right font-mono font-black border-r border-slate-200 bg-emerald-50/50 text-slate-900 text-sm">
                      L. {m.saldoAcumulado.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Acciones */}
                    <td className="py-2 px-2 text-center">
                      {m.tipo !== 'SALDO_INICIAL' && (
                        <button
                          onClick={() => handleEliminarMovimiento(m)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Anular movimiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. Pestañas de Clientes Estilo Hojas de Excel / Google Sheets en el Pie */}
      <div className="bg-slate-100 border-t border-slate-300 p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
        {/* Buscador de Pestañas */}
        <div className="relative min-w-[200px] shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTab}
            onChange={(e) => setSearchTab(e.target.value)}
            placeholder="Buscar hoja de cliente..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Lista Horizontal de Pestañas */}
        <div
          ref={tabsContainerRef}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300"
        >
          {loadingClientes ? (
            <span className="text-xs text-slate-400 px-3">Cargando hojas de clientes...</span>
          ) : filteredTabs.length === 0 ? (
            <span className="text-xs text-slate-400 px-3">No hay clientes con ese nombre</span>
          ) : (
            filteredTabs.map(tab => {
              const isSelected = selectedClienteId === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedClienteId(tab.id)}
                  className={`px-3 py-1.5 rounded-t-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border-t border-x cursor-pointer ${
                    isSelected
                      ? 'bg-white text-emerald-900 border-slate-300 shadow-xs font-black'
                      : 'bg-slate-200/80 text-slate-600 hover:bg-slate-200 border-transparent'
                  }`}
                >
                  <span>{tab.nombre}</span>
                  {tab.saldoTotal > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                      L. {tab.saldoTotal >= 1000 ? `${(tab.saldoTotal / 1000).toFixed(1)}k` : tab.saldoTotal.toFixed(0)}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Envío por WhatsApp con Plantillas */}
      {modalWhatsAppOpen && clienteActual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-black text-base">Enviar Estado por WhatsApp</h3>
              </div>
              <button
                onClick={() => setModalWhatsAppOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800">{clienteActual.nombre}</div>
                <div className="text-slate-500 font-medium">📱 {clienteActual.telefono || 'Sin teléfono'}</div>
                <div className="text-sm font-black text-emerald-700 font-mono">
                  Saldo: L. {Number(clienteActual.saldoTotal || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Selector de Plantilla */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Seleccionar Plantilla de Mensaje:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'ESTADO', label: '📊 Formal' },
                    { id: 'CORDIAL', label: '🌸 Cordial' },
                    { id: 'COBRO', label: '⚠️ Recordatorio' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlantillaSeleccionada(p.id as any)}
                      className={`py-2 rounded-xl font-bold text-[11px] transition-all ${
                        plantillaSeleccionada === p.id
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vista Previa del Mensaje */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Vista Previa del Texto:</label>
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl text-[11px] text-slate-800 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                  {generarTextoWhatsApp()}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalWhatsAppOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAbrirWhatsApp}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Abrir en WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
