'use client';

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
  Eye,
  Check,
  Building2,
  Calendar,
  Hash,
  Calculator,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EscanearFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompraGuardada: () => void;
}

const CATEGORIAS = [
  { id: 'FLORES_IMPORTACION', label: '🌸 Flores e Importación', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { id: 'INSUMOS_FLORISTERIA', label: '🎀 Insumos (Oasis, Listones)', color: 'bg-pink-100 text-pink-800 border-pink-300' },
  { id: 'FLETES_TRANSPORTE', label: '🚚 Fletes y Transporte', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'COMBUSTIBLE', label: '⛽ Combustible y Vehículos', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { id: 'SERVICIOS_PUBLICOS', label: '⚡ Servicios (Luz, Agua, Net)', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'GASTOS_OPERATIVOS', label: '📦 Gastos Operativos / Cuarto Frío', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'ALIMENTACION_VIATICOS', label: '🍲 Alimentación y Viáticos', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'OTROS', label: '📁 Otros Gastos', color: 'bg-slate-100 text-slate-800 border-slate-300' },
];

export default function EscanearFacturaModal({
  isOpen,
  onClose,
  onCompraGuardada
}: EscanearFacturaModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [escaneando, setEscaneando] = useState<boolean>(false);
  const [guardando, setGuardando] = useState<boolean>(false);

  // Datos extraídos por la IA (editables por el usuario)
  const [proveedor, setProveedor] = useState<string>('');
  const [rtn, setRtn] = useState<string>('');
  const [factura, setFactura] = useState<string>('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [categoria, setCategoria] = useState<string>('GASTOS_OPERATIVOS');
  const [descripcion, setDescripcion] = useState<string>('');
  const [exenta, setExenta] = useState<string>('0');
  const [gravada, setGravada] = useState<string>('0');
  const [isv15, setIsv15] = useState<string>('0');
  const [total, setTotal] = useState<string>('0');
  const [confianza, setConfianza] = useState<string | null>(null);

  const [datosListos, setDatosListos] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setDatosListos(false);

    // Auto-disparar escaneo
    procesarFacturaConIA(selectedFile);
  };

  const procesarFacturaConIA = async (archivo: File) => {
    try {
      setEscaneando(true);
      const formData = new FormData();
      formData.append('file', archivo);

      const res = await fetch('/api/compras/scan-ai', {
        method: 'POST',
        body: formData
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Error al escanear la factura');
      }

      const data = json.data;

      setProveedor(data.proveedor || '');
      setRtn(data.rtn || '');
      setFactura(data.factura || '');
      setFecha(data.fecha || new Date().toISOString().split('T')[0]);
      setCategoria(data.categoria || 'GASTOS_OPERATIVOS');
      setDescripcion(data.descripcion || '');
      setExenta(String(data.exenta ?? 0));
      setGravada(String(data.gravada ?? 0));
      setIsv15(String(data.isv15 ?? 0));
      setTotal(String(data.total ?? 0));
      setConfianza(data.confianza || 'ALTA');
      setDatosListos(true);

      toast.success('¡Factura analizada con éxito por IA!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'No se pudo leer la factura con IA');
    } finally {
      setEscaneando(false);
    }
  };

  const handleRecalcularTotal = (nuevaGrav: string, nuevaEx: string, nuevoIsv: string) => {
    const g = parseFloat(nuevaGrav || '0');
    const e = parseFloat(nuevaEx || '0');
    const i = parseFloat(nuevoIsv || '0');
    const t = g + e + i;
    setTotal(t > 0 ? t.toFixed(2) : '0');
  };

  const handleGuardarEnLibro = async () => {
    if (!proveedor.trim()) {
      toast.error('El nombre del proveedor es obligatorio');
      return;
    }

    const totalNum = parseFloat(total || '0');
    if (totalNum <= 0) {
      toast.error('El total debe ser mayor a 0');
      return;
    }

    try {
      setGuardando(true);

      const payload = {
        fecha,
        descripcion: `${proveedor.trim()}${descripcion ? ' - ' + descripcion.trim() : ''}`,
        factura: factura.trim() || undefined,
        rtn: rtn.trim() || undefined,
        categoria,
        exenta: parseFloat(exenta || '0'),
        gravada: parseFloat(gravada || '0'),
        isv15: parseFloat(isv15 || '0'),
        total: totalNum
      };

      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar la compra');

      toast.success('Compra agregada al Libro de Compras');
      onCompraGuardada();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar registro');
    } finally {
      setGuardando(false);
    }
  };

  // Validación de cuadre matemático
  const exVal = parseFloat(exenta || '0');
  const grVal = parseFloat(gravada || '0');
  const isvVal = parseFloat(isv15 || '0');
  const totVal = parseFloat(total || '0');
  const sumaEsperada = Math.round((exVal + grVal + isvVal) * 100) / 100;
  const totRedondeado = Math.round(totVal * 100) / 100;
  const descuadre = Math.abs(sumaEsperada - totRedondeado) > 0.05;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-900 via-purple-900 to-rose-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Escaneo Inteligente de Facturas (IA Visión)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 uppercase tracking-wider">
                  Gemini Flash OCR
                </span>
              </div>
              <p className="text-purple-200 text-xs font-medium">
                Sube una foto o PDF. La IA extrae proveedor, RTN, CAI, ISV y totales automáticamente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
          {/* Columna Izquierda: Carga y Vista previa del archivo (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {!previewUrl ? (
              <div className="flex-1 min-h-[300px] border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-3xl p-6 bg-purple-50/30 flex flex-col items-center justify-center text-center transition-all group">
                <div className="w-16 h-16 rounded-3xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                  <Upload className="w-8 h-8" />
                </div>
                <h4 className="font-black text-slate-800 text-sm mb-1">
                  Arrastra tu factura o comprobante aquí
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mb-5">
                  Soporta fotos tomadas con el celular (JPG, PNG) o facturas en formato PDF.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <FileText className="w-4 h-4" />
                    Seleccionar Archivo
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    Tomar Foto
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 p-4 shadow-sm relative overflow-hidden min-h-[350px]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <Eye className="w-4 h-4 text-purple-600" />
                    Comprobante Original
                  </span>
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                      setDatosListos(false);
                    }}
                    className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Cambiar archivo
                  </button>
                </div>

                <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center relative min-h-[260px]">
                  {file?.type.includes('pdf') ? (
                    <div className="p-8 text-center space-y-2">
                      <FileText className="w-16 h-16 text-rose-500 mx-auto" />
                      <p className="font-bold text-xs text-slate-800">{file.name}</p>
                      <span className="text-[10px] text-slate-500">Documento PDF cargado</span>
                    </div>
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Factura Preview"
                      className="max-h-[380px] w-auto object-contain rounded-xl"
                    />
                  )}

                  {escaneando && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 text-center animate-fadeIn">
                      <div className="relative mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-rose-600 flex items-center justify-center shadow-lg animate-spin">
                          <Sparkles className="w-7 h-7 text-white" />
                        </div>
                      </div>
                      <h5 className="font-black text-sm tracking-wide">
                        Analizando documento con IA...
                      </h5>
                      <p className="text-xs text-purple-200 mt-1">
                        Detectando RTN, número SAR, subtotales e impuestos
                      </p>
                    </div>
                  )}
                </div>

                {datosListos && confianza && (
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Nivel de confianza:</span>
                    <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                      confianza === 'ALTA' ? 'bg-emerald-100 text-emerald-800' :
                      confianza === 'MEDIA' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {confianza}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Columna Derecha: Formulario de Datos Extraídos (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Datos Fiscales de la Compra
                </span>
                {datosListos && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    ✓ Pre-llenado por IA
                  </span>
                )}
              </div>

              {/* Proveedor y RTN */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Proveedor / Razón Social *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={proveedor}
                      onChange={(e) => setProveedor(e.target.value)}
                      placeholder="Ej. GASOLINERA TEXACO / FLOREQUISA"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none uppercase"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    RTN Proveedor
                  </label>
                  <input
                    type="text"
                    value={rtn}
                    onChange={(e) => setRtn(e.target.value)}
                    placeholder="14 dígitos"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-medium text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Factura / Fecha / Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    N° Factura / CAI
                  </label>
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={factura}
                      onChange={(e) => setFactura(e.target.value)}
                      placeholder="000-001-01-..."
                      className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none uppercase"
                    />
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Fecha de Emisión *
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Categoría de Gasto
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripción / Concepto */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Concepto / Descripción del gasto
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej. Combustible camión placa HDB-1234 / 4 cajas de oasis"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Desglose Monetario (Exenta, Gravada, ISV 15%, Total) */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
                <span className="text-[11px] font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-purple-600" />
                  Valores Monetarios (Lempiras HNL)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Exenta */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Exenta L.
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={exenta}
                      onChange={(e) => {
                        setExenta(e.target.value);
                        handleRecalcularTotal(gravada, e.target.value, isv15);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-medium text-slate-900 text-right outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Gravada */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Gravada 15% L.
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={gravada}
                      onChange={(e) => {
                        setGravada(e.target.value);
                        const gr = parseFloat(e.target.value || '0');
                        const sugeridoIsv = (gr * 0.15).toFixed(2);
                        setIsv15(sugeridoIsv);
                        handleRecalcularTotal(e.target.value, exenta, sugeridoIsv);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-medium text-slate-900 text-right outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* ISV 15% */}
                  <div>
                    <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1">
                      ISV 15% (L0.15)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={isv15}
                      onChange={(e) => {
                        setIsv15(e.target.value);
                        handleRecalcularTotal(gravada, exenta, e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 bg-purple-50 border border-purple-300 rounded-xl font-mono text-xs font-bold text-purple-900 text-right outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Gran Total */}
                  <div>
                    <label className="block text-[10px] font-black text-rose-800 uppercase mb-1">
                      Gran Total L.
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={total}
                      onChange={(e) => setTotal(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-rose-50 border-2 border-rose-300 rounded-xl font-mono text-xs font-black text-rose-950 text-right outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Alerta de Descuadre si aplica */}
                {descuadre && (
                  <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-[11px]">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      Atención: La suma (Exenta + Gravada + ISV = L. {sumaEsperada.toFixed(2)}) difiere del Gran Total ingresado (L. {totRedondeado.toFixed(2)}). Revisa si hay redondeos o descuentos.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Botón de Confirmación y Guardado */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleGuardarEnLibro}
                disabled={guardando || escaneando || !proveedor.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-700 via-rose-700 to-rose-800 hover:from-purple-800 hover:to-rose-900 text-white rounded-xl font-black text-xs shadow-lg shadow-rose-900/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {guardando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar y Guardar en Libro</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
