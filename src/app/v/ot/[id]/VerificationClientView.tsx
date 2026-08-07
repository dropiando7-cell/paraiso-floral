'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Download, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  User, 
  Building2, 
  Smartphone, 
  ChevronRight, 
  X, 
  ExternalLink,
  ZoomIn,
  Activity,
  Calendar,
  Layers,
  Award
} from 'lucide-react';

interface VerificationClientViewProps {
  data: {
    activo?: any;
    singleOrden?: any;
    pdfDownloadUrl: string;
  };
}

export default function VerificationClientView({ data }: VerificationClientViewProps) {
  const { activo, singleOrden, pdfDownloadUrl } = data;

  // Determine main item info
  const ordenes = activo ? activo.ordenesTrabajo : (singleOrden ? [singleOrden] : []);
  const mainOrden = ordenes[0] || singleOrden;
  const cliente = activo?.cliente || singleOrden?.cliente;

  const equipoNombre = activo?.descripcionCorta || singleOrden?.equipoDano || 'Equipo Médico';
  const marca = activo?.marca || singleOrden?.marcaModelo?.split(' ')[0] || '';
  const modelo = activo?.modelo || singleOrden?.marcaModelo?.split(' ').slice(1).join(' ') || '';
  const serie = activo?.serie || singleOrden?.serie || 'N/A';
  const idQr = activo?.idQr || singleOrden?.codigoSeguridad || 'N/A';

  // Extract all media
  const allImages: { url: string; title: string; source: string }[] = [];
  const allVideos: { url: string; title: string; source: string }[] = [];
  const allAudios: { url: string; title: string; source: string }[] = [];

  ordenes.forEach((ord: any) => {
    // Photos from orden fields
    (ord.fotosEstadoInicial || []).forEach((imgUrl: string, idx: number) => {
      allImages.push({ url: imgUrl, title: `Foto Recepción #${idx + 1}`, source: `Orden #${ord.codigoSeguridad || 'N/A'}` });
    });
    (ord.fotosTecnico || []).forEach((imgUrl: string, idx: number) => {
      allImages.push({ url: imgUrl, title: `Foto Trabajo #${idx + 1}`, source: `Orden #${ord.codigoSeguridad || 'N/A'}` });
    });

    // Attachments from Kanban tasks
    (ord.kanbanTasks || []).forEach((task: any) => {
      (task.attachments || []).forEach((att: any) => {
        const type = (att.tipo || '').toLowerCase();
        const url = att.url;
        const ext = url.split('.').pop()?.toLowerCase() || '';

        if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
          if (!allImages.some(i => i.url === url)) {
            allImages.push({ url, title: att.nombre || 'Evidencia Fotográfica', source: task.title || task.titulo || 'Tarea de Servicio' });
          }
        } else if (type.startsWith('video/') || ['mp4', 'webm', 'mov', 'm4v', 'avi'].includes(ext)) {
          if (!allVideos.some(v => v.url === url)) {
            allVideos.push({ url, title: att.nombre || 'Video de Evidencia', source: task.title || task.titulo || 'Tarea de Servicio' });
          }
        } else if (type.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'ogg', 'aac'].includes(ext)) {
          if (!allAudios.some(a => a.url === url)) {
            allAudios.push({ url, title: att.nombre || 'Nota de Audio', source: task.title || task.titulo || 'Tarea de Servicio' });
          }
        }
      });
    });
  });

  const [activeTab, setActiveTab] = useState<'resumen' | 'evidencias' | 'historial'>('resumen');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Helper for status badge
  const getStatusBadge = (estado: string) => {
    const statusMap: Record<string, { label: string; color: string; bg: string }> = {
      RECIBIDO: { label: 'Recibido en Taller', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-950/60 border-amber-300' },
      DIAGNOSTICO: { label: 'En Diagnóstico', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-950/60 border-blue-300' },
      REPARACION: { label: 'En Reparación', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-950/60 border-purple-300' },
      LISTO: { label: 'Trabajo Concluido (Listo)', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300' },
      ENTREGADO: { label: 'Entregado al Cliente', color: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-100 dark:bg-teal-950/60 border-teal-300' }
    };
    const current = statusMap[estado?.toUpperCase()] || { label: estado || 'Procesado', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${current.bg} ${current.color}`}>
        <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
        {current.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500 selection:text-white pb-16">
      
      {/* HEADER INSTITUCIONAL */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 shadow-md shadow-blue-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center font-bold text-blue-400 text-xl tracking-tighter">
                BE
              </div>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                Bioelectrónica Honduras
              </h1>
              <p className="text-[11px] text-slate-400">Verificación Oficial de Servicio Biomédico</p>
            </div>
          </div>

          <a 
            href={pdfDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-lg shadow-md shadow-blue-600/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Descargar PDF</span>
          </a>
        </div>
      </header>

      {/* BANNER DE DOCUMENTO OFICIAL VERIFICADO */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-teal-900/40 to-slate-900 border-b border-emerald-800/40 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                Documento Auténtico y Verificado
              </p>
              <p className="text-[11px] text-emerald-400/80">
                Código de Seguridad: <span className="font-mono font-bold text-white">{idQr}</span>
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 bg-slate-800/80 rounded border border-slate-700">
            BIO-VERIFY v2
          </span>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">

        {/* TARJETA PRINCIPAL DEL EQUIPO */}
        <section className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-xl backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-semibold text-blue-400 bg-blue-950/80 border border-blue-800/50 px-2 py-0.5 rounded">
                  {idQr}
                </span>
                {mainOrden && getStatusBadge(mainOrden.estado)}
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {equipoNombre}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                {marca && <span>Marca: <strong className="text-slate-200">{marca}</strong></span>}
                {modelo && <span>• Modelo: <strong className="text-slate-200">{modelo}</strong></span>}
                <span>• Serie: <strong className="text-slate-200 font-mono">{serie}</strong></span>
              </p>
            </div>

            {cliente && (
              <div className="text-left sm:text-right border-t sm:border-t-0 border-slate-700/40 pt-2 sm:pt-0">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Cliente / Institución</p>
                <p className="text-sm font-bold text-slate-100 flex items-center sm:justify-end gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  {cliente.nombre}
                </p>
              </div>
            )}
          </div>

          {/* METRICAS RAPIDAS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400 text-[11px] block">Evidencias Fotos</span>
              <span className="text-base font-bold text-white flex items-center gap-1 mt-0.5">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                {allImages.length} HD
              </span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400 text-[11px] block">Videos Grabados</span>
              <span className="text-base font-bold text-white flex items-center gap-1 mt-0.5">
                <Video className="w-4 h-4 text-purple-400" />
                {allVideos.length} Clip{allVideos.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400 text-[11px] block">Notas de Voz</span>
              <span className="text-base font-bold text-white flex items-center gap-1 mt-0.5">
                <Mic className="w-4 h-4 text-emerald-400" />
                {allAudios.length} Audio{allAudios.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400 text-[11px] block">Historial de Ordenes</span>
              <span className="text-base font-bold text-white flex items-center gap-1 mt-0.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                {ordenes.length} Registro{ordenes.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </section>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-800 space-x-2">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'resumen'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Resumen & Diagnóstico
          </button>
          <button
            onClick={() => setActiveTab('evidencias')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'evidencias'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Evidencias Multimedia ({allImages.length + allVideos.length + allAudios.length})
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'historial'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Trazabilidad ({ordenes.length})
          </button>
        </div>

        {/* TAB 1: RESUMEN Y DIAGNOSTICO */}
        {activeTab === 'resumen' && (
          <div className="space-y-5 animate-fadeIn">
            {mainOrden?.diagnosticoTecnico && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2 mb-3">
                  <Wrench className="w-4 h-4" />
                  Diagnóstico e Intervención Técnica
                </h3>
                <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed font-sans bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  {mainOrden.diagnosticoTecnico}
                </p>
              </div>
            )}

            {/* REPUETOS Y PARTES REEMPLAZADAS */}
            {mainOrden?.repuestos && mainOrden.repuestos.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4" />
                  Repuestos y Componentes Sustituidos
                </h3>
                <div className="divide-y divide-slate-800 bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
                  {mainOrden.repuestos.map((rep: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{rep.descripcion || rep.nombre}</p>
                        <p className="text-[11px] text-slate-400">Cantidad: {rep.cantidad || 1}</p>
                      </div>
                      <span className="px-2 py-1 bg-cyan-950 text-cyan-400 rounded text-[10px] font-mono border border-cyan-800/60">
                        Componente Verificado
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FIRMAS Y CONFORMIDAD */}
            {(mainOrden?.firmaClienteUrl || mainOrden?.firmaTecnicoUrl) && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4" />
                  Firmas Digitales de Conformidad
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {mainOrden.firmaClienteUrl && (
                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl text-center">
                      <p className="text-[11px] font-bold text-slate-400 mb-2">FIRMA DEL CLIENTE</p>
                      <div className="bg-white p-2 rounded-lg inline-block mb-2 max-w-[200px]">
                        <img src={mainOrden.firmaClienteUrl} alt="Firma Cliente" className="max-h-20 object-contain mx-auto" />
                      </div>
                      <p className="text-xs font-bold text-white">{mainOrden.firmaClienteNombre || 'Cliente'}</p>
                    </div>
                  )}

                  {mainOrden.firmaTecnicoUrl && (
                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl text-center">
                      <p className="text-[11px] font-bold text-slate-400 mb-2">FIRMA TÉCNICO BIOMÉDICO</p>
                      <div className="bg-white p-2 rounded-lg inline-block mb-2 max-w-[200px]">
                        <img src={mainOrden.firmaTecnicoUrl} alt="Firma Técnico" className="max-h-20 object-contain mx-auto" />
                      </div>
                      <p className="text-xs font-bold text-white">{mainOrden.firmaTecnicoNombre || mainOrden.tecnicoReparacion?.nombre || 'Técnico Biomédico'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EVIDENCIAS MULTIMEDIA */}
        {activeTab === 'evidencias' && (
          <div className="space-y-6 animate-fadeIn">
            {allImages.length === 0 && allVideos.length === 0 && allAudios.length === 0 && (
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-8 text-center">
                <ImageIcon className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-slate-300">No hay archivos multimedia adjuntos en esta orden</p>
                <p className="text-xs text-slate-400 mt-1">Las evidencias se muestran automáticamente cuando el técnico las captura.</p>
              </div>
            )}

            {/* FOTOS HD */}
            {allImages.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2 mb-4">
                  <ImageIcon className="w-4 h-4" />
                  Fotografías de Inspección y Reparación HD ({allImages.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {allImages.map((img, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setSelectedImage(img.url)}
                      className="group relative aspect-square bg-slate-900 rounded-xl overflow-hidden border border-slate-700/80 cursor-pointer hover:border-blue-500 transition-all shadow-sm"
                    >
                      <img 
                        src={img.url} 
                        alt={img.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                        <div className="w-full flex items-center justify-between text-white text-[11px]">
                          <span className="truncate max-w-[80%] font-medium">{img.title}</span>
                          <ZoomIn className="w-4 h-4 text-blue-400 shrink-0" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIDEOS */}
            {allVideos.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2 mb-4">
                  <Video className="w-4 h-4" />
                  Videos de Funcionamiento y Pruebas ({allVideos.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allVideos.map((vid, idx) => (
                    <div key={idx} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                      <video controls className="w-full aspect-video bg-black">
                        <source src={vid.url} />
                        Tu navegador no soporta reproducción de video.
                      </video>
                      <div className="p-3 text-xs">
                        <p className="font-bold text-white">{vid.title}</p>
                        <p className="text-[11px] text-slate-400">{vid.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AUDIOS */}
            {allAudios.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2 mb-4">
                  <Mic className="w-4 h-4" />
                  Notas de Voz y Explicaciones Audibles ({allAudios.length})
                </h3>
                <div className="space-y-3">
                  {allAudios.map((aud, idx) => (
                    <div key={idx} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-white">{aud.title}</p>
                        <p className="text-[11px] text-slate-400">{aud.source}</p>
                      </div>
                      <audio controls className="w-full sm:w-64 h-9">
                        <source src={aud.url} />
                      </audio>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HISTORIAL & TRAZABILIDAD */}
        {activeTab === 'historial' && (
          <div className="space-y-4 animate-fadeIn">
            {ordenes.map((ord: any, index: number) => (
              <div key={ord.id || index} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-3">
                  <div>
                    <span className="text-xs font-mono text-blue-400 font-bold">
                      Orden #{ord.codigoSeguridad || ord.id.slice(0, 8)}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ingreso: {ord.fechaRecibido ? new Date(ord.fechaRecibido).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                  {getStatusBadge(ord.estado)}
                </div>

                <div className="text-xs space-y-2">
                  {ord.equipoDano && (
                    <p><strong className="text-slate-300">Trabajo:</strong> {ord.equipoDano}</p>
                  )}
                  {ord.diagnosticoTecnico && (
                    <p className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                      <strong>Diagnóstico:</strong> {ord.diagnosticoTecnico}
                    </p>
                  )}
                  {ord.tecnicoReparacion && (
                    <p className="text-slate-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      Técnico: <strong className="text-slate-200">{ord.tecnicoReparacion.nombre} {ord.tecnicoReparacion.apellido}</strong>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BOTON DE DESCARGA PDF FIJO AL FINAL */}
        <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div>
            <p className="text-sm font-bold text-white">¿Necesitas una copia física del reporte?</p>
            <p className="text-xs text-slate-400">Descarga el PDF oficial membretado y firmado digitalmente.</p>
          </div>
          <a 
            href={pdfDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            Descargar Reporte PDF
          </a>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="mt-12 text-center text-xs text-slate-500 space-y-1">
        <p>© {new Date().getFullYear()} Bioelectrónica Honduras. Todos los derechos reservados.</p>
        <p>Sistema de Verificación Segura de Servicios Biomédicos.</p>
      </footer>

      {/* MODAL LIGHTBOX FOTO FULLSCREEN */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={selectedImage} 
            alt="Evidencia Zoom" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

    </div>
  );
}
