'use client';

import React from 'react';
import { 
  Printer, CheckCircle2, Lock, MessageCircle, DollarSign, Activity, FileText
} from 'lucide-react';

interface PublicCierreClientProps {
  initialData: {
    organization: any;
    session: any;
    totals: any;
    summary: any;
  };
}

export default function PublicCierreClient({ initialData }: PublicCierreClientProps) {
  const { organization, session, totals, summary } = initialData;

  const fmt = (val: number) => `L. ${val.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fechaFmt = (dStr?: string | null) => dStr ? new Date(dStr).toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

  const fechaHoy = new Date().toLocaleDateString('es-HN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  const handleSendProofWA = () => {
    const orgPhone = (organization?.telefono || '+50431782368').replace(/\D/g, '');
    const phoneWithCountry = orgPhone.length === 8 ? `504${orgPhone}` : orgPhone;
    
    const diffText = session.diferencia === 0 ? "Cuadrada (Exacto)" : session.diferencia < 0 ? `Faltante de ${fmt(Math.abs(session.diferencia))}` : `Sobrante de ${fmt(session.diferencia)}`;
    
    const msg = `*Reporte de Cierre de Caja*\n\nHola Gerencia, envío el resumen del cierre de turno:\n\n*Apertura:* ${fechaFmt(session.aperturaAt)}\n*Cierre:* ${fechaFmt(session.cierreAt)}\n\n*Total Recaudado:* ${fmt(totals.totalIngresos)}\n*Efectivo Esperado:* ${fmt(totals.esperadoEfectivo)}\n*Efectivo Contado:* ${fmt(session.saldoFinalEfectivo || 0)}\n*Reconciliación:* ${diffText}\n\nPara ver el reporte completo y oficial: ${window.location.href}`;
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getMethodTransactions = (metodo: string) => {
    if (!session) return [];
    const txList: Array<{
        id: string;
        fechaStr: string;
        concepto: string;
        cliente: string;
        monto: number;
        isPendingTransfer?: boolean;
    }> = [];

    const facturas = session.facturas || [];
    facturas.filter((f: any) => (f.metodoPago || 'Efectivo') === metodo)
        .forEach((f: any) => {
            txList.push({
                id: f.id,
                fechaStr: f.fechaEmision,
                concepto: `Facturación POS (${f.correlativo})`,
                cliente: f.cliente?.nombre || 'Cliente General',
                monto: Number(f.total),
                isPendingTransfer: metodo === 'Transferencia' && f.transferenciaConfirmada === false
            });
        });

    const rentasPagos = session.rentasPagos || [];
    rentasPagos.filter((p: any) => (p.metodoPago || 'Efectivo') === metodo)
        .forEach((p: any) => {
            txList.push({
                id: p.id,
                fechaStr: p.fechaPago,
                concepto: p.notas || `Pago de Renta (${p.renta?.activoFijo?.nombre || 'Equipo'})`,
                cliente: p.renta?.cliente?.nombre || 'Cliente General',
                monto: Number(p.monto)
            });
        });

    const ordenesTrabajo = session.ordenesTrabajo || [];
    ordenesTrabajo.filter((o: any) => (o.metodoPagoRevision || 'Efectivo') === metodo)
        .forEach((o: any) => {
            txList.push({
                id: o.id,
                fechaStr: o.fechaRecibido,
                concepto: `Revisión Soporte #${o.codigoSeguridad} (${o.equipoDano})`,
                cliente: o.cliente?.nombre || 'Cliente General',
                monto: Number(o.costoRevision || 0)
            });
        });

    const movimientos = session.movimientos || [];
    movimientos.filter((m: any) => m.metodoPago === metodo && m.concepto !== 'REEMBOLSO_GARANTIA')
        .forEach((m: any) => {
            const isNegative = m.tipo === 'EGRESO';
            txList.push({
                id: m.id,
                fechaStr: m.createdAt,
                concepto: `${m.concepto === 'RETIRO_BANCARIO' ? 'Retiro Bancario / Remesa' : m.concepto === 'OTRO' ? 'Ingreso / Ajuste' : 'Movimiento de Caja'} ${m.anuladaAt ? '(ANULADO)' : ''}`,
                cliente: m.descripcion || 'Movimiento de Caja',
                monto: isNegative ? -Number(m.monto) : Number(m.monto)
            });
        });

    return txList.sort((a, b) => new Date(b.fechaStr).getTime() - new Date(a.fechaStr).getTime());
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16 font-sans print:bg-white print:pb-0">
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
            border-bottom: 2px solid #0f172a !important;
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

      {/* Top Fixed Bar */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-md print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-400">{organization?.name || 'Distribuidora Paraíso Floral'}</p>
              <p className="text-[10px] text-slate-400 font-medium truncate max-w-[180px] sm:max-w-none">Reporte de Cierre de Caja Diario</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendProofWA}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Enviar a Gerencia</span>
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

      <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 print:p-0 print:space-y-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6 print:shadow-none print:border-none print:p-0">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-slate-800 pb-4">
            <div className="flex items-center gap-3.5">
              {organization?.logoUrl && (
                <img
                    src={organization.logoUrl}
                    alt="Logo"
                    className="w-14 h-14 object-contain rounded-full border border-slate-200 shrink-0"
                />
              )}
              <div className="space-y-0.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {organization?.name || 'DISTRIBUIDORA PARAÍSO FLORAL'}
                </h1>
                <p className="text-xs font-bold text-slate-700">Reporte Oficial de Cierre de Turno</p>
                <p className="text-[11px] text-slate-600">{organization?.direccion || '8 Calle, 9 Avenida NO, Barrio Guamilito, San Pedro Sula'}</p>
                <p className="text-[11px] text-slate-600">Teléfono: {organization?.telefono || '+(504) 8854-2199'}</p>
              </div>
            </div>

            <div className="sm:text-right space-y-1 shrink-0">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-900 font-extrabold text-xs rounded-lg border border-slate-300">
                ARQUEO DE CAJA
              </span>
              <p className="text-[11px] text-slate-500 pt-1">Impresión: {fechaHoy}</p>
            </div>
          </div>

          {/* Session details and Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-300 rounded-2xl bg-slate-50/70 space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 tracking-wider">DETALLES DEL TURNO</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">ID Sesión:</span>
                  <span className="font-bold text-slate-900">{session.id.substring(0, 8).toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Operador:</span>
                  <span className="font-bold text-slate-900">{session.creadoPor ? `${session.creadoPor.nombre} ${session.creadoPor.apellido}` : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Apertura:</span>
                  <span className="font-bold text-slate-900">{fechaFmt(session.aperturaAt)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Cierre:</span>
                  <span className="font-bold text-slate-900">{fechaFmt(session.cierreAt)}</span>
                </div>
              </div>
              {session.observaciones && (
                <div className="pt-2 border-t border-slate-200 mt-2">
                    <span className="text-slate-500 block text-xs mb-1">Observaciones:</span>
                    <span className="text-xs italic text-slate-700">"{session.observaciones}"</span>
                </div>
              )}
            </div>

            <div className="p-4 border border-slate-300 rounded-2xl bg-slate-50/70 space-y-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-600">Fondo Inicial en Caja:</span>
                  <span className="font-bold text-slate-900">{fmt(session.saldoInicial)}</span>
                </div>
                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-600">Ventas en Efectivo:</span>
                  <span className="font-bold text-emerald-700">(+) {fmt(totals.ventasEfectivo)}</span>
                </div>
                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-600">Rentas en Efectivo:</span>
                  <span className="font-bold text-emerald-700">(+) {fmt(totals.rentasEfectivo)}</span>
                </div>
                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-600">Soporte en Efectivo:</span>
                  <span className="font-bold text-emerald-700">(+) {fmt(totals.soporteEfectivo)}</span>
                </div>
                {/* Egresos should be here if any, but kept simple as per original */}
              </div>

              <div className="pt-2 border-t border-slate-300">
                <div className="flex justify-between items-center text-sm font-black text-slate-900">
                  <span className="uppercase tracking-wider text-xs">EFECTIVO ESPERADO:</span>
                  <span className="text-base text-slate-900">{fmt(totals.esperadoEfectivo)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black mt-1">
                  <span className="uppercase tracking-wider text-xs text-slate-600">EFECTIVO CONTADO:</span>
                  <span className="text-base text-indigo-700">{fmt(session.saldoFinalEfectivo || 0)}</span>
                </div>
                <div className={`flex justify-between items-center text-sm font-black mt-2 pt-2 border-t border-slate-200 ${session.diferencia === 0 ? 'text-emerald-600' : session.diferencia < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  <span className="uppercase tracking-wider text-xs">DIFERENCIA (RECONCILIACIÓN):</span>
                  <span>{session.diferencia === 0 ? 'L. 0.00 (CUADRADA)' : fmt(session.diferencia)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desglose de Pagos Table */}
          <div className="space-y-2 mt-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" /> RESUMEN DE INGRESOS POR MÉTODO DE PAGO
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                    <th className="py-2.5 px-3">Método de Pago</th>
                    <th className="py-2.5 px-3 text-right">Facturación</th>
                    <th className="py-2.5 px-3 text-right">Rentas</th>
                    <th className="py-2.5 px-3 text-right">Soporte</th>
                    <th className="py-2.5 px-3 text-right text-emerald-800">Total Recaudado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque', 'Link de pago de Occidente'].map(m => {
                    const v = summary.ventas[m] || 0;
                    const r = summary.rentas[m] || 0;
                    const s = summary.soporte[m] || 0;
                    const tot = v + r + s;
                    const txs = getMethodTransactions(m);
                    return (
                      <React.Fragment key={m}>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-800">{m}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{fmt(v)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{fmt(r)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{fmt(s)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">{fmt(tot)}</td>
                        </tr>
                        {txs.length > 0 && (
                          <tr className="bg-slate-50/50 print:table-row">
                            <td colSpan={5} className="px-3 py-2 border-b border-slate-100">
                              <div className="bg-white rounded-lg border border-slate-200 p-2 ml-4">
                                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                                  Desglose de Transacciones ({txs.length})
                                </div>
                                <table className="w-full text-left text-[10px] text-slate-600">
                                  <thead>
                                    <tr className="text-slate-400 border-b border-slate-100">
                                      <th className="px-1 py-0.5">Hora</th>
                                      <th className="px-1 py-0.5">Concepto</th>
                                      <th className="px-1 py-0.5">Cliente</th>
                                      <th className="px-1 py-0.5 text-right">Monto</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {txs.map(tx => (
                                      <tr key={tx.id}>
                                        <td className="px-1 py-0.5 text-slate-500">
                                          {new Date(tx.fechaStr).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </td>
                                        <td className="px-1 py-0.5 text-slate-800 font-semibold">
                                          {tx.concepto}
                                          {tx.isPendingTransfer && (
                                              <span className="ml-1 px-1 rounded text-[8px] bg-amber-100 text-amber-800 uppercase print:border print:border-amber-400">
                                                  Pend. Confirmar
                                              </span>
                                          )}
                                        </td>
                                        <td className="px-1 py-0.5">{tx.cliente}</td>
                                        <td className={`px-1 py-0.5 text-right font-bold ${tx.isPendingTransfer ? 'text-amber-600/60 line-through' : tx.monto < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                                          {tx.monto < 0 ? '-' : '+'} {fmt(Math.abs(tx.monto))}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <tr className="bg-slate-800 text-white font-black">
                    <td className="py-3 px-3 uppercase text-[11px]">Total General Ingresos</td>
                    <td className="py-3 px-3 text-right">{fmt(totals.totalVentas)}</td>
                    <td className="py-3 px-3 text-right">{fmt(totals.totalRentas)}</td>
                    <td className="py-3 px-3 text-right">{fmt(totals.totalSoporte)}</td>
                    <td className="py-3 px-3 text-right text-emerald-400 text-sm">{fmt(totals.totalIngresos)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Firmas */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-center text-[11px] text-slate-600">
            <div className="border-t border-slate-400 pt-1">
              <p className="font-bold text-slate-800">{session.cerradoPor ? `${session.cerradoPor.nombre} ${session.cerradoPor.apellido}` : 'Operador de Caja'}</p>
              <p className="text-[10px] text-slate-400">Entregado por (Operador de Turno)</p>
            </div>
            <div className="border-t border-slate-400 pt-1">
              <p className="font-bold text-slate-800">Administración / Gerencia</p>
              <p className="text-[10px] text-slate-400">Recibido Conforme</p>
            </div>
          </div>

        </div>

        {/* Footer WhatsApp Notifier CTA (Hidden in Print) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center space-y-3 print:hidden shadow-xs">
          <p className="text-xs font-bold text-slate-700">¿Deseas compartir este cierre directamente por WhatsApp?</p>
          <button
            onClick={handleSendProofWA}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl inline-flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Notificar a Gerencia (+504 3178-2368)</span>
          </button>
        </div>
      </main>
    </div>
  );
}
