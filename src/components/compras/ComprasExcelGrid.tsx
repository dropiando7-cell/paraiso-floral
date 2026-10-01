'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  CheckCircle,
  Calculator
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface RegistroCompraFila {
  id: string;
  fecha: string;
  descripcion: string;
  factura: string | null;
  exenta: number;
  gravada: number;
  isv15: number;
  total: number;
}

export default function ComprasExcelGrid() {
  const [compras, setCompras] = useState<RegistroCompraFila[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fila de Entrada Rápida estilo Excel
  const [nuevaFecha, setNuevaFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nuevaDesc, setNuevaDesc] = useState<string>('');
  const [nuevaFactura, setNuevaFactura] = useState<string>('');
  const [nuevaExenta, setNuevaExenta] = useState<string>('');
  const [nuevaGravada, setNuevaGravada] = useState<string>('');
  const [nuevoIsv15, setNuevoIsv15] = useState<string>('');
  const [nuevoTotal, setNuevoTotal] = useState<string>('');
  
  const [guardandoFila, setGuardandoFila] = useState<boolean>(false);

  const descInputRef = useRef<HTMLInputElement>(null);

  const cargarCompras = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/compras');
      if (res.ok) {
        const data = await res.json();
        setCompras(data);
      }
    } catch (err) {
      console.error('Error cargando compras:', err);
      toast.error('Error al cargar los registros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCompras();
  }, []);

  // Autocalcular ISV y Total cuando cambian Exenta o Gravada
  useEffect(() => {
    const exenta = parseFloat(nuevaExenta || '0');
    const gravada = parseFloat(nuevaGravada || '0');
    
    // Si hay valor gravado, sugerir ISV (15%)
    const isvCalculado = gravada > 0 ? (gravada * 0.15) : 0;
    
    // Solo actualizar ISV si el usuario no lo ha tocado manualmente o está en 0
    // Para simplificar, si cambian gravada, actualizamos ISV sugerido.
    setNuevoIsv15(isvCalculado > 0 ? isvCalculado.toFixed(2) : '');
    
    const isvFinal = isvCalculado;
    const totalCalc = exenta + gravada + isvFinal;
    
    if (totalCalc > 0) {
      setNuevoTotal(totalCalc.toFixed(2));
    } else {
      setNuevoTotal('');
    }
  }, [nuevaExenta, nuevaGravada]);

  // Si el usuario cambia el ISV manualmente, recalcular el total
  useEffect(() => {
    const exenta = parseFloat(nuevaExenta || '0');
    const gravada = parseFloat(nuevaGravada || '0');
    const isv = parseFloat(nuevoIsv15 || '0');
    const totalCalc = exenta + gravada + isv;
    
    if (totalCalc > 0) {
      setNuevoTotal(totalCalc.toFixed(2));
    }
  }, [nuevoIsv15, nuevaExenta, nuevaGravada]);

  const handleAgregarFila = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!nuevaDesc.trim()) {
      toast.error('La descripción (proveedor/concepto) es obligatoria');
      descInputRef.current?.focus();
      return;
    }

    const exentaNum = parseFloat(nuevaExenta || '0');
    const gravadaNum = parseFloat(nuevaGravada || '0');
    const isv15Num = parseFloat(nuevoIsv15 || '0');
    const totalNum = parseFloat(nuevoTotal || '0');

    if (totalNum <= 0) {
      toast.error('El total debe ser mayor a 0');
      return;
    }

    try {
      setGuardandoFila(true);
      const payload = {
        fecha: nuevaFecha,
        descripcion: nuevaDesc.trim(),
        factura: nuevaFactura.trim() || undefined,
        exenta: exentaNum,
        gravada: gravadaNum,
        isv15: isv15Num,
        total: totalNum
      };

      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar la fila');
      }

      toast.success('Compra registrada correctamente');

      // Limpiar campos, mantener fecha
      setNuevaDesc('');
      setNuevaFactura('');
      setNuevaExenta('');
      setNuevaGravada('');
      setNuevoIsv15('');
      setNuevoTotal('');
      descInputRef.current?.focus();

      cargarCompras();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al agregar registro');
    } finally {
      setGuardandoFila(false);
    }
  };

  const handleEliminarCompra = async (id: string) => {
    const confirmar = confirm('¿Estás seguro de eliminar este registro de compra?');
    if (!confirmar) return;

    try {
      const res = await fetch(`/api/compras?id=${id}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al eliminar');

      toast.success('Registro eliminado');
      cargarCompras();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar registro');
    }
  };

  const handleExportarExcel = () => {
    if (compras.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const wsData = [
      ['DISTRIBUIDORA PARAISO FLORAL - LIBRO DE COMPRAS'],
      ['FECHA', 'DESCRIPCION', 'FACTURA', 'EXENTA', 'GRAVADA', 'L0.15', 'TOTAL'],
      ...compras.map(c => [
        new Date(c.fecha).toLocaleDateString('es-HN'),
        c.descripcion,
        c.factura || '',
        Number(c.exenta),
        Number(c.gravada),
        Number(c.isv15),
        Number(c.total)
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compras');
    XLSX.writeFile(wb, `Libro_Compras_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Descargando Excel...');
  };

  // Calcular totales para el footer
  const totalExenta = compras.reduce((acc, c) => acc + Number(c.exenta), 0);
  const totalGravada = compras.reduce((acc, c) => acc + Number(c.gravada), 0);
  const totalIsv15 = compras.reduce((acc, c) => acc + Number(c.isv15), 0);
  const granTotal = compras.reduce((acc, c) => acc + Number(c.total), 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[750px] animate-fadeIn">
      {/* 1. Barra Superior Estilo Excel */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-pink-950 p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 border-b border-rose-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400 font-black shadow-inner">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Libro de Compras
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-slate-950">
                  EXCEL MODE
                </span>
              </h2>
            </div>
            <p className="text-rose-200 text-xs font-medium">
              Gestión rápida de facturas de compras y gastos de la empresa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportarExcel}
            className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl font-bold text-xs transition-all border border-slate-600 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Totales Generales */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-rose-800 font-black uppercase text-xs tracking-wider">
          <Calculator className="w-4 h-4" />
          Totales Acumulados
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Total Exenta</div>
            <div className="text-sm font-black text-slate-700">L. {totalExenta.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Total Gravada</div>
            <div className="text-sm font-black text-slate-700">L. {totalGravada.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Total L0.15</div>
            <div className="text-sm font-black text-rose-600">L. {totalIsv15.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-white border-2 border-rose-500/40 px-3 py-1.5 rounded-xl shadow-xs text-right ml-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Gran Total</div>
            <div className="text-lg font-black text-rose-700 font-mono">
              L. {granTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Fila de Entrada Rápida de Datos */}
      <div className="bg-rose-50/50 p-3.5 border-b border-rose-200/80">
        <form onSubmit={handleAgregarFila} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-black text-xs text-rose-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="w-4 h-4 text-rose-600" />
              Ingresar Nueva Compra (Presiona Enter)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2 text-xs">
            {/* Fecha */}
            <div className="md:col-span-2">
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none"
                title="Fecha"
                required
              />
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <input
                ref={descInputRef}
                type="text"
                value={nuevaDesc}
                onChange={(e) => setNuevaDesc(e.target.value)}
                placeholder="Descripción (Proveedor/Gasto)"
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none uppercase"
              />
            </div>

            {/* Factura */}
            <div className="md:col-span-1">
              <input
                type="text"
                value={nuevaFactura}
                onChange={(e) => setNuevaFactura(e.target.value)}
                placeholder="Nro Factura"
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none uppercase"
              />
            </div>

            {/* Exenta */}
            <div className="md:col-span-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={nuevaExenta}
                onChange={(e) => setNuevaExenta(e.target.value)}
                placeholder="Exenta L."
                className="w-full px-2 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none text-right"
              />
            </div>

            {/* Gravada */}
            <div className="md:col-span-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={nuevaGravada}
                onChange={(e) => setNuevaGravada(e.target.value)}
                placeholder="Gravada L."
                className="w-full px-2 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none text-right"
              />
            </div>

            {/* L0.15 (ISV) */}
            <div className="md:col-span-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={nuevoIsv15}
                onChange={(e) => setNuevoIsv15(e.target.value)}
                placeholder="L0.15"
                className="w-full px-2 py-2 bg-rose-50 border border-rose-300 rounded-xl font-medium text-rose-900 focus:ring-2 focus:ring-rose-500 outline-none text-right"
              />
            </div>

            {/* Total */}
            <div className="md:col-span-2">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-rose-600 text-xs">
                  L.
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={nuevoTotal}
                  onChange={(e) => setNuevoTotal(e.target.value)}
                  placeholder="Total"
                  className="w-full pl-6 pr-2 py-2 bg-rose-100/60 border-2 border-rose-300 rounded-xl font-black text-rose-900 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none text-right"
                />
              </div>
            </div>

            {/* Botón Guardar */}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={guardandoFila}
                className="w-full py-2 bg-rose-700 hover:bg-rose-800 active:scale-95 text-white font-extrabold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
              >
                {guardandoFila ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Agregar Fila</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 4. Tabla de Datos */}
      <div className="flex-1 overflow-auto bg-slate-50/30">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-rose-600" />
            <p className="text-xs font-semibold text-slate-600">Cargando libro de compras...</p>
          </div>
        ) : compras.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="font-black text-slate-900 text-base">Sin registros de compra</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Utiliza la fila de ingreso rápido arriba para añadir tu primera compra.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead className="sticky top-0 z-10 bg-slate-200/95 border-b border-slate-300 backdrop-blur-xs text-[11px] font-black text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">#</th>
                <th className="py-2.5 px-3 w-28 border-r border-slate-300">FECHA</th>
                <th className="py-2.5 px-3 border-r border-slate-300">DESCRIPCION</th>
                <th className="py-2.5 px-3 w-28 border-r border-slate-300">FACTURA</th>
                <th className="py-2.5 px-3 w-28 text-right border-r border-slate-300">EXENTA</th>
                <th className="py-2.5 px-3 w-28 text-right border-r border-slate-300">GRAVADA</th>
                <th className="py-2.5 px-3 w-28 text-right border-r border-slate-300">L0.15</th>
                <th className="py-2.5 px-4 w-32 text-right border-r border-slate-300 bg-rose-100/70 text-rose-950 font-black">
                  TOTAL
                </th>
                <th className="py-2.5 px-2 w-14 text-center">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {compras.map((c, index) => (
                <tr
                  key={c.id}
                  className={`hover:bg-rose-50/40 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  <td className="py-2 px-3 text-center font-mono text-[10px] text-slate-400 border-r border-slate-200">
                    {index + 1}
                  </td>
                  <td className="py-2 px-3 font-mono font-medium text-slate-800 border-r border-slate-200">
                    {new Date(c.fecha).toLocaleDateString('es-HN')}
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200 truncate max-w-xs">
                    {c.descripcion}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-600 border-r border-slate-200">
                    {c.factura || '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200">
                    {c.exenta > 0 ? c.exenta.toLocaleString('es-HN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200">
                    {c.gravada > 0 ? c.gravada.toLocaleString('es-HN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200">
                    {c.isv15 > 0 ? c.isv15.toLocaleString('es-HN', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-2 px-4 text-right font-mono font-black border-r border-slate-200 bg-rose-50/30 text-rose-800">
                    L. {c.total.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={() => handleEliminarCompra(c.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar compra"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
