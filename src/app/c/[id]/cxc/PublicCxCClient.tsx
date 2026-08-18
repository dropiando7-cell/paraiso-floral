'use client';

import React, { useState } from 'react';
import { 
  Flower2, Printer, CheckCircle2, Clock, 
  FileText, ShieldCheck, MessageCircle, BookOpen, DollarSign
} from 'lucide-react';

interface PublicCxCClientProps {
  initialData: {
    cliente: {
      id: string;
      nombre: string;
      telefono?: string | null;
      email?: string | null;
      direccion?: string | null;
      rtn?: string | null;
      limiteCredito: number;
      saldoInicial: number;
      diasCredito: number;
    };
    organization?: {
      name?: string | null;
      rtn?: string | null;
      telefono?: string | null;
      direccion?: string | null;
      correoContacto?: string | null;
      logoUrl?: string | null;
    } | null;
    resumen: {
      saldoTotal: number;
      totalFacturado: number;
      totalAbonado: number;
      totalNotasCredito: number;
      saldoInicial: number;
    };
    facturas: Array<{
      id: string;
      correlativo: string;
      fechaEmision: string;
      fechaVencimiento?: string | null;
      total: number;
      saldoPendiente: number;
      estadoPago?: string | null;
      metodoPago?: string | null;
      detalles: Array<{
        id: string;
        descripcion: string;
        cantidad: number;
        precioUnitario: number;
        totalLinea: number;
      }>;
    }>;
    pagos: Array<{
      id: string;
      correlativo?: string | null;
      monto: number;
      fecha: string;
      metodoPago: string;
      banco?: string | null;
      referencia?: string | null;
      notas?: string | null;
    }>;
    notasCredito: Array<{
      id: string;
      correlativo?: string | null;
      monto: number;
      fecha: string;
      motivo?: string | null;
      descripcion?: string | null;
      notas?: string | null;
    }>;
  };
}

export default function PublicCxCClient({ initialData }: PublicCxCClientProps) {
  const { cliente, organization, resumen, facturas, pagos, notasCredito } = initialData;
  const [activeTab, setActiveTab] = useState<'MAYOR' | 'FACTURAS' | 'PAGOS' | 'NOTAS'>('MAYOR');

  const fmt = (val: number) => `L. ${val.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fechaFmt = (dStr?: string | null) => dStr ? new Date(dStr).toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

  const fechaHoy = new Date().toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Construcción del Libro Mayor Contable Unificado
  const movimientosContables = React.useMemo(() => {
    const list: Array<{
      id: string;
      fecha: Date;
      tipo: 'SALDO_INICIAL' | 'FACTURA' | 'ABONO' | 'NOTA_CREDITO';
      documento: string;
      detalles: string;
      debito: number;
      credito: number;
    }> = [];

    // 1. Saldo Inicial
    if (resumen.saldoInicial && resumen.saldoInicial > 0) {
      list.push({
        id: 'saldo-inicial-excel',
        fecha: new Date('2026-01-01'),
        tipo: 'SALDO_INICIAL',
        documento: '#SALDO INICIAL EXCEL',
        detalles: 'Carga de deuda previa registrada de libreta Excel',
        debito: resumen.saldoInicial,
        credito: 0
      });
    }

    // 2. Facturas
    (facturas || []).forEach(f => {
      if (f.correlativo !== 'SALDO INICIAL EXCEL') {
        const desc = f.detalles && f.detalles.length > 0
          ? f.detalles.map(d => `${d.cantidad}x ${d.descripcion}`).join(', ')
          : 'Venta a Crédito Comercial';

        list.push({
          id: f.id,
          fecha: new Date(f.fechaEmision),
          tipo: 'FACTURA',
          documento: `#${f.correlativo}`,
          detalles: desc,
          debito: f.total,
          credito: 0
        });
      }
    });

    // 3. Abonos
    (pagos || []).forEach(p => {
      const desc = `Abono (${p.metodoPago})${p.banco ? ` en ${p.banco}` : ''}${p.referencia ? ` Ref: ${p.referencia}` : ''}${p.notas ? ` [${p.notas}]` : ''}`;
      list.push({
        id: p.id,
        fecha: new Date(p.fecha),
        tipo: 'ABONO',
        documento: p.correlativo || 'REC-ABONO',
        detalles: desc,
        debito: 0,
        credito: p.monto
      });
    });

    // 4. Notas de Crédito
    (notasCredito || []).forEach(n => {
      const desc = `Ajuste (${n.motivo || 'Flor Dañada'})${n.descripcion ? ` - ${n.descripcion}` : (n.notas ? ` - ${n.notas}` : '')}`;
      list.push({
        id: n.id,
        fecha: new Date(n.fecha),
        tipo: 'NOTA_CREDITO',
        documento: n.correlativo || 'NC-001',
        detalles: desc,
        debito: 0,
        credito: n.monto
      });
    });

    list.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    let saldoAcumulado = 0;
    return list.map(item => {
      saldoAcumulado = saldoAcumulado + item.debito - item.credito;
      return {
        ...item,
        saldoAcumulado: Math.max(0, saldoAcumulado)
      };
    });
  }, [facturas, pagos, notasCredito, resumen.saldoInicial]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendProofWA = () => {
    const orgPhone = (organization?.telefono || '+50431782368').replace(/\D/g, '');
    const phoneWithCountry = orgPhone.length === 8 ? `504${orgPhone}` : orgPhone;
    const msg = `Hola *Distribuidora Paraiso Floral*,\n\nAdjunto mi comprobante de pago para mi estado de cuenta a nombre de *${cliente.nombre}*.\n\nSaldo Pendiente Actual: *${fmt(resumen.saldoTotal)}*\n\n¡Quedo atento a su confirmación!`;
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16 font-sans print:bg-white print:pb-0">
      {/* Estilos Específicos para Impresión Oficial de Documento */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 11px !important;
          }
          .no-print {
            display: none !important;
          }
          .print-header {
            border-bottom: 2px solid #059669 !important;
            padding-bottom: 12px !important;
            margin-bottom: 16px !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 6px 8px !important;
          }
          th {
            background-color: #f8fafc !important;
            color: #1e293b !important;
            font-weight: 700 !important;
          }
        }
      `}</style>

      {/* Top Fixed Bar (Hidden in Print) */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-md print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Flower2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-400">Distribuidora Paraíso Floral</p>
              <p className="text-[10px] text-slate-400 font-medium truncate max-w-[180px] sm:max-w-none">Estado de Cuenta Oficial del Cliente</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendProofWA}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Notificar pago vía WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Enviar Comprobante</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Document Content */}
      <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 print:p-0 print:space-y-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6 print:shadow-none print:border-none print:p-0">

          {/* Encabezado Membretado Oficial con Logo */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-emerald-600 pb-4">
            <div className="flex items-center gap-3.5">
              <img
                src={organization?.logoUrl || '/icon.png'}
                alt="Paraíso Floral"
                className="w-14 h-14 object-contain rounded-full border border-slate-200 shrink-0"
              />
              <div className="space-y-0.5">
                <h1 className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight">
                  {organization?.name || 'DISTRIBUIDORA PARAÍSO FLORAL'}
                </h1>
                <p className="text-xs font-bold text-slate-700">Venta de Flores al Mayoreo y Detalle</p>
                <p className="text-[11px] text-slate-600">RTN: {organization?.rtn || '08011990123456'} | Tegucigalpa, Honduras</p>
                <p className="text-[11px] text-slate-600">Teléfono / WhatsApp: {organization?.telefono || '+(504) 9538-0113 | +(504) 3178-2368'}</p>
              </div>
            </div>

            <div className="sm:text-right space-y-1 shrink-0">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-lg border border-emerald-300">
                ESTADO DE CUENTA
              </span>
              <p className="text-[11px] text-slate-500 pt-1">Emisión: {fechaHoy}</p>
            </div>
          </div>

          {/* Datos del Cliente y Resumen Financiero */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-300 rounded-2xl bg-slate-50/70 space-y-1">
              <h3 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 tracking-wider">DATOS DEL CLIENTE</h3>
              <p className="text-base font-black text-slate-900">{cliente.nombre}</p>
              <p className="text-xs text-slate-700"><strong>Teléfono:</strong> {cliente.telefono || 'N/A'}</p>
              <p className="text-xs text-slate-700"><strong>RTN:</strong> {cliente.rtn || 'Consumidor Final'}</p>
              <p className="text-xs text-slate-700"><strong>Dirección:</strong> {cliente.direccion || 'Tegucigalpa, Honduras'}</p>
            </div>

            <div className="p-4 border border-emerald-300 rounded-2xl bg-emerald-50/40 space-y-1 text-right flex flex-col justify-between">
              <div>
                {resumen.saldoInicial > 0 && (
                  <div className="flex justify-between text-xs py-0.5 text-amber-900 font-bold">
                    <span>Saldo Inicial Deuda (Excel):</span>
                    <span>{fmt(resumen.saldoInicial)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-600">Total Facturado Nuevos:</span>
                  <span className="font-bold">{fmt(resumen.totalFacturado - resumen.saldoInicial)}</span>
                </div>
                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-600">Total Abonos:</span>
                  <span className="font-bold text-teal-700">(-) {fmt(resumen.totalAbonado)}</span>
                </div>
                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-600">Notas de Crédito / Mermas:</span>
                  <span className="font-bold text-amber-700">(-) {fmt(resumen.totalNotasCredito)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm pt-2 border-t border-emerald-300 font-black text-emerald-900">
                <span className="uppercase tracking-wider">SALDO A PAGAR:</span>
                <span className="text-lg font-mono font-black text-emerald-700">{fmt(resumen.saldoTotal)}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Hidden in Print) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 print:hidden">
            <button
              onClick={() => setActiveTab('MAYOR')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'MAYOR'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📖 Libro Mayor Contable ({movimientosContables.length})
            </button>
            <button
              onClick={() => setActiveTab('FACTURAS')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'FACTURAS'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              1. Detalle Facturas ({facturas.length})
            </button>
            <button
              onClick={() => setActiveTab('PAGOS')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'PAGOS'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              2. Historial de Abonos ({pagos.length})
            </button>
            <button
              onClick={() => setActiveTab('NOTAS')}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'NOTAS'
                  ? 'bg-amber-600 text-white shadow-xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              3. Ajustes / Flor Dañada ({notasCredito.length})
            </button>
          </div>

          {/* TAB 0: LIBRO MAYOR CONTABLE */}
          {activeTab === 'MAYOR' && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" /> LIBRO MAYOR CONTABLE (HISTORIAL COMPLETO DE DÉBITOS Y CRÉDITOS)
              </h3>
              {movimientosContables.length === 0 ? (
                <p className="text-xs italic text-slate-500 p-2">No hay movimientos contables registrados.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Comprobante</th>
                        <th className="py-2.5 px-3">Concepto / Detalles</th>
                        <th className="py-2.5 px-3 text-right">Débito (+)</th>
                        <th className="py-2.5 px-3 text-right">Crédito (-)</th>
                        <th className="py-2.5 px-3 text-right">Saldo Acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movimientosContables.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                            {m.fecha.toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                            {m.documento}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">
                            {m.detalles}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            {m.debito > 0 ? `+ ${fmt(m.debito)}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                            {m.credito > 0 ? `- ${fmt(m.credito)}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-950 whitespace-nowrap bg-indigo-50/40">
                            {fmt(m.saldoAcumulado)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: DETALLE DE FACTURAS PENDIENTES */}
          {activeTab === 'FACTURAS' && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> 1. DETALLE DE FACTURAS PENDIENTES
              </h3>
              {facturas.length === 0 ? (
                <p className="text-xs italic text-slate-500 p-2">El cliente no tiene facturas pendientes a la fecha.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                        <th className="py-2.5 px-3 text-left"># Factura</th>
                        <th className="py-2.5 px-3 text-left">Fecha Emisión</th>
                        <th className="py-2.5 px-3 text-right">Monto Total</th>
                        <th className="py-2.5 px-3 text-right">Saldo Pendiente</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {facturas.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold">#{f.correlativo}</td>
                          <td className="py-2.5 px-3">{fechaFmt(f.fechaEmision)}</td>
                          <td className="py-2.5 px-3 text-right">{fmt(f.total)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-800">{fmt(f.saldoPendiente)}</td>
                          <td className="py-2.5 px-3 text-center font-semibold">{f.estadoPago || 'PENDIENTE'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HISTORIAL DE ABONOS Y PAGOS RECIBIDOS */}
          {activeTab === 'PAGOS' && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" /> 2. HISTORIAL DE ABONOS Y PAGOS RECIBIDOS
              </h3>
              {pagos.length === 0 ? (
                <p className="text-xs italic text-slate-500 p-2">No hay abonos registrados en el historial.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                        <th className="py-2.5 px-3 text-left">Recibo #</th>
                        <th className="py-2.5 px-3 text-left">Fecha Pago</th>
                        <th className="py-2.5 px-3 text-left">Método</th>
                        <th className="py-2.5 px-3 text-left">Banco / Referencia</th>
                        <th className="py-2.5 px-3 text-right">Monto Abonado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagos.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold">{p.correlativo || 'REC-ABONO'}</td>
                          <td className="py-2.5 px-3">{fechaFmt(p.fecha)}</td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-800">{p.metodoPago}</td>
                          <td className="py-2.5 px-3 text-slate-600">{p.banco ? `${p.banco} - ` : ''}{p.referencia || 'N/A'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-teal-800">{fmt(p.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AJUSTES Y DEVOLUCIONES POR FLOR DAÑADA */}
          {activeTab === 'NOTAS' && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center gap-2">
                <Flower2 className="w-4 h-4 text-amber-600" /> 3. AJUSTES Y DEVOLUCIONES POR FLOR DAÑADA / MERMAS
              </h3>
              {notasCredito.length === 0 ? (
                <p className="text-xs italic text-slate-500 p-2">No hay notas de crédito o mermas registradas.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                        <th className="py-2.5 px-3 text-left">Nota #</th>
                        <th className="py-2.5 px-3 text-left">Fecha</th>
                        <th className="py-2.5 px-3 text-left">Motivo / Justificación</th>
                        <th className="py-2.5 px-3 text-right">Monto Descontado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {notasCredito.map(nc => (
                        <tr key={nc.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold">{nc.correlativo || 'NC-001'}</td>
                          <td className="py-2.5 px-3">{fechaFmt(nc.fecha)}</td>
                          <td className="py-2.5 px-3 text-slate-700">{nc.motivo ? nc.motivo.replace('_', ' ') : 'Flor Dañada'} - {nc.descripcion || nc.notas || 'Sin detalle'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-800">{fmt(nc.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Cuentas Bancarias de Pago */}
          <div className="p-3 border border-slate-300 rounded-xl bg-slate-50 text-[11px] space-y-1">
            <p className="font-bold text-slate-800 uppercase">CUENTAS BANCARIAS AUTORIZADAS PARA DEPÓSITO / TRANSFERENCIA:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700">
              <div>• <strong>Banco Atlántida:</strong> 1100-2233-4455 (Paraíso Floral)</div>
              <div>• <strong>Banco Ficohsa:</strong> 2000-4455-6677 (Paraíso Floral)</div>
              <div>• <strong>Tigo Money / BAC:</strong> 9988-7766</div>
            </div>
          </div>

          {/* Firmas de Conformidad */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[11px] text-slate-600">
            <div className="border-t border-slate-400 pt-1">
              <p className="font-bold text-slate-800">Departamento de Crédito y Cobros</p>
              <p className="text-[10px] text-slate-400">Distribuidora Paraíso Floral</p>
            </div>
            <div className="border-t border-slate-400 pt-1">
              <p className="font-bold text-slate-800">Firma de Conformidad del Cliente</p>
              <p className="text-[10px] text-slate-400">{cliente.nombre}</p>
            </div>
          </div>
        </div>

        {/* Footer WhatsApp Notifier CTA (Hidden in Print) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center space-y-3 print:hidden shadow-xs">
          <p className="text-xs font-bold text-slate-700">¿Deseas realizar un pago o tienes consultas sobre tu estado de cuenta?</p>
          <button
            onClick={handleSendProofWA}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl inline-flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Notificar Pago por WhatsApp (+504 3178-2368)</span>
          </button>
          <p className="text-[10px] text-slate-400 font-medium">Distribuidora Paraíso Floral • Sistema de Facturación y Cuentas por Cobrar</p>
        </div>
      </main>
    </div>
  );
}
