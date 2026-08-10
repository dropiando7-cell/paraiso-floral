'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, CheckCircle2, FileText, Calendar, Package, 
  Download, Printer, Phone, Mail, Award, Clock, ArrowRight, UserCheck
} from 'lucide-react';
import Link from 'next/link';

interface EntregaValidationClientViewProps {
  orden: any;
  equipos: any[];
}

export default function EntregaValidationClientView({ orden, equipos }: EntregaValidationClientViewProps) {
  const [activeTab, setActiveTab] = useState<'entrega' | 'garantia' | 'mantenimientos'>('entrega');

  const factura = orden.factura;
  const cliente = factura.cliente;
  const org = orden.organization || {};
  const detalles = (factura.detalles || []).filter((d: any) => !d.isSection);
  const excludedIds = orden.detallesExcluidos || [];
  const validItems = detalles.filter((d: any) => !excludedIds.includes(d.id));

  const fechaEmisionStr = factura.fechaEmision 
    ? new Date(factura.fechaEmision).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  // Firma del cliente
  const rawSettings = factura.templateSettings || {};
  const signaturesList = rawSettings.signaturesList || [];
  const clientSigObj = signaturesList.find((s: any) => s.id === 'cliente_firma' || s.id === 'cliente');
  const clientSigUrl = clientSigObj?.imageUrl || factura.firmaClienteBase64 || orden.firmaClienteUrl;
  const firmaFecha = factura.firmaClienteAt ? new Date(factura.firmaClienteAt).toLocaleString('es-HN') : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white pb-24">
      
      {/* Top Banner Header */}
      <header className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 border-b border-blue-800/40 pt-10 pb-8 px-4 sm:px-8 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center gap-4">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt={org.name || 'Bioelectrónica'} className="h-14 object-contain rounded-xl bg-white/10 p-2 border border-white/10 shadow-lg" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center font-black text-xl text-blue-400 shadow-inner">
                BE
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck size={14} className="animate-pulse" /> Trazabilidad Digital Verificada
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                Orden de Entrega <span className="text-blue-400 font-mono">{orden.correlativo}</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {org.name || 'Bioelectrónica Honduras'} • Emisión: {fechaEmisionStr}
              </p>
            </div>
          </div>

          {/* Quick PDF Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Link 
              href={`/api/pdf/${factura.id}?type=entrega`}
              target="_blank"
              className="flex-1 md:flex-initial px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-95"
            >
              <Download size={16} /> Orden PDF
            </Link>
            <Link 
              href={`/api/pdf/${factura.id}?type=garantia`}
              target="_blank"
              className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Award size={16} /> Garantía PDF
            </Link>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 mt-8 space-y-8">

        {/* Client & Delivery Metadata Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cliente Beneficiario</p>
            <p className="font-bold text-white text-base truncate">{cliente?.nombre || '—'}</p>
            {cliente?.rtn && <p className="text-xs font-mono text-slate-400 mt-0.5">RTN: {cliente.rtn}</p>}
            {cliente?.telefono && <p className="text-xs text-slate-400 mt-0.5">Tel: {cliente.telefono}</p>}
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Documento Asociado</p>
            <p className="font-bold text-blue-400 font-mono text-base">{factura.correlativo}</p>
            <p className="text-xs text-slate-400 mt-0.5">Estado: <span className="text-emerald-400 font-bold uppercase">{factura.estado}</span></p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estado de Firma</p>
            {clientSigUrl ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <CheckCircle2 size={16} /> Firma Digital Registrada
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                <Clock size={16} /> Pendiente de Firma
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('entrega')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'entrega'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-2xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package size={18} /> Orden de Entrega Firmada
          </button>

          <button
            onClick={() => setActiveTab('garantia')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'garantia'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-2xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award size={18} /> Certificado de Garantía
          </button>

          <button
            onClick={() => setActiveTab('mantenimientos')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'mantenimientos'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-2xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar size={18} /> Mantenimientos Programados
          </button>
        </div>

        {/* TAB 1: Orden de Entrega Firmada */}
        {activeTab === 'entrega' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Delivered Items Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Package size={18} className="text-blue-400" /> Artículos Entregados
                </h3>
                <span className="text-xs text-slate-400 font-medium">Total: {validItems.length} ítem(s)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">No.</th>
                      <th className="p-4">Serie / Identificador</th>
                      <th className="p-4">Descripción del Equipo</th>
                      <th className="p-4 text-center">Garantía</th>
                      <th className="p-4 text-right">Cant.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                    {validItems.map((item: any, idx: number) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-4 font-mono font-bold text-blue-400">{item.serie || 'N/A'}</td>
                        <td className="p-4 font-semibold text-white">{item.shortDesc}</td>
                        <td className="p-4 text-center">
                          <span className="inline-block px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg font-bold text-[11px]">
                            {item.garantia || 'Según póliza'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-base text-white">{item.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signature Showcase Block */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-slate-800 pb-3">
                <UserCheck size={18} className="text-emerald-400" /> Firma Digital de Conformidad
              </h3>

              {clientSigUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-950/80 p-6 rounded-2xl border border-emerald-500/20">
                  <div className="w-full sm:w-64 h-32 bg-white rounded-xl p-3 border border-slate-200 flex items-center justify-center shadow-inner shrink-0">
                    <img src={clientSigUrl} alt="Firma del Cliente" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                  </div>

                  <div className="space-y-2 text-center sm:text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold">
                      <CheckCircle2 size={14} /> Recepción Verificada
                    </div>
                    <p className="font-bold text-white text-lg">{cliente?.nombre || 'Cliente Beneficiario'}</p>
                    <p className="text-xs text-slate-400 font-mono">
                      Firma estampada el: <span className="text-slate-200 font-semibold">{firmaFecha || 'Fecha confirmada'}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed max-w-md">
                      El cliente declaró haber recibido los equipos detallados en perfecto estado de funcionamiento y a entera conformidad.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-center space-y-3">
                  <Clock size={32} className="mx-auto text-amber-400 animate-pulse" />
                  <h4 className="font-bold text-white text-base">Firma Digital Pendiente</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Esta orden de entrega aún no ha sido firmada digitalmente por el cliente. Si eres el beneficiario, puedes firmarla ingresando desde el enlace enviado a tu celular.
                  </p>
                  <Link 
                    href={`/c/${factura.id}/entrega`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Firmar Entrega Ahora <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: Certificado de Garantía */}
        {activeTab === 'garantia' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <Award size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Póliza de Garantía Limitada</h3>
                    <p className="text-xs text-slate-400">Bioelectrónica Honduras — Respaldo Técnico Oficial</p>
                  </div>
                </div>
              </div>

              {equipos.length > 0 ? (
                <div className="space-y-4">
                  {equipos.map((eq: any) => (
                    <div key={eq.id} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div>
                          <p className="font-bold text-white text-base">{eq.nombre}</p>
                          <p className="text-xs text-slate-400">Marca: <span className="text-slate-200 font-semibold">{eq.marca || '—'}</span> • Modelo: <span className="text-slate-200 font-semibold">{eq.modelo || '—'}</span></p>
                        </div>
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold font-mono">
                          Serie: {eq.serie || 'N/A'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Duración Póliza</p>
                          <p className="font-bold text-white text-sm mt-0.5">{eq.garantiaMeses ? `${eq.garantiaMeses} Meses` : '12 Meses'}</p>
                        </div>

                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Fecha Instalación</p>
                          <p className="font-bold text-white text-sm mt-0.5">
                            {eq.fechaInstalacion ? new Date(eq.fechaInstalacion).toLocaleDateString('es-HN') : fechaEmisionStr}
                          </p>
                        </div>

                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Vencimiento Póliza</p>
                          <p className="font-bold text-emerald-400 text-sm mt-0.5">
                            {eq.fechaVencimientoGarantia ? new Date(eq.fechaVencimientoGarantia).toLocaleDateString('es-HN') : 'Vigente'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                  <p className="font-bold text-white text-sm">Cobertura Estándar Bioelectrónica</p>
                  <p>
                    Bioelectrónica Honduras garantiza que los equipos médicos e industriales entregados se encuentran libres de defectos de fabricación en materiales y mano de obra bajo condiciones normales de uso.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    <li>La garantía cubre reparación o reemplazo de componentes defectuosos.</li>
                    <li>No cubre daños por variaciones severas de voltaje no protegidas, negligencia u operación fuera de especificaciones.</li>
                    <li>Para mantener la vigencia de la garantía es obligatorio cumplir con el calendario de mantenimientos programados.</li>
                  </ul>
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 3: Calendario de Mantenimientos Programados */}
        {activeTab === 'mantenimientos' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Cronograma de Mantenimientos Preventivos</h3>
                    <p className="text-xs text-slate-400">Visitas programadas para conservación de la garantía</p>
                  </div>
                </div>
              </div>

              {equipos.some(e => e.mantenimientos && e.mantenimientos.length > 0) ? (
                <div className="space-y-6">
                  {equipos.map((eq: any) => (
                    <div key={eq.id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        <h4 className="font-bold text-white text-sm">{eq.nombre} (Serie: {eq.serie || 'N/A'})</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {eq.mantenimientos.map((m: any, idx: number) => {
                          const fechaProg = new Date(m.fechaProgramada).toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' });
                          const isCompletado = m.estado === 'COMPLETADO' || m.fechaRealizada;

                          return (
                            <div 
                              key={m.id} 
                              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                                isCompletado 
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                                  : 'bg-slate-950/80 border-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Mantenimiento #{idx + 1}
                                </span>
                                <p className="font-bold text-white text-sm">{fechaProg}</p>
                                <p className="text-[11px] text-slate-400">{m.notas || 'Mantenimiento de Garantía'}</p>
                              </div>

                              <div>
                                {isCompletado ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold">
                                    <CheckCircle2 size={14} /> Realizado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold">
                                    <Clock size={14} /> Programado
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-950/60 p-8 rounded-2xl border border-slate-800 text-center space-y-3">
                  <Calendar size={36} className="mx-auto text-slate-600" />
                  <h4 className="font-bold text-white text-base">Sin Mantenimientos Activos</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Los mantenimientos preventivos se programan automáticamente cuando la orden de entrega activa la opción de mantenimientos incluidos.
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* Footer Branding */}
      <footer className="max-w-4xl mx-auto px-4 text-center mt-12 pt-6 border-t border-slate-800/80 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">{org.name || 'Bioelectrónica Honduras'} — Soluciones Médicas e Industriales</p>
        <p>Tel: +504 2552-0491 • E-mail: soporte@bioelectronicahn.com</p>
        <p className="text-[10px] text-slate-600 font-mono pt-2">Sistema de Trazabilidad Digital • Documento Validado Criptográficamente</p>
      </footer>

    </div>
  );
}
