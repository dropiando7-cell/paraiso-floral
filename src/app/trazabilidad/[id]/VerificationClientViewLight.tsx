'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Download, 
  Clock, 
  Wrench, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  User, 
  Building2, 
  X, 
  ZoomIn,
  Activity,
  Layers,
  Award,
  CheckCircle2,
  Calendar,
  ChevronRight,
  ExternalLink,
  Info,
  AlertTriangle
} from 'lucide-react';

interface VerificationClientViewLightProps {
  data: {
    activo?: any;
    singleOrden?: any;
    ordenesList?: any[];
    pdfDownloadUrl?: string;
  };
}

export default function VerificationClientViewLight({ data }: VerificationClientViewLightProps) {
  const { activo, singleOrden, ordenesList, pdfDownloadUrl } = data;

  // Helper to safely render text or HTML content without leaking HTML tags
  const renderFormattedContent = (content: string) => {
    if (!content) return null;
    const hasHtml = /<[a-z][\s\S]*>/i.test(content);
    if (hasHtml) {
      return (
        <div 
          className="prose prose-xs max-w-none text-xs text-inherit [&_p]:my-0.5 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      );
    }
    return <div className="whitespace-pre-line">{content}</div>;
  };

  // Determine main asset info
  const ordenes: any[] = (ordenesList && ordenesList.length > 0) 
    ? ordenesList 
    : (activo?.ordenesTrabajo?.length ? activo.ordenesTrabajo : (singleOrden ? [singleOrden] : []));

  const mainOrden = ordenes[0] || singleOrden || {};
  const cliente = activo?.cliente || mainOrden?.cliente;

  const equipoNombre = activo?.descripcionCorta || mainOrden?.equipoDano || 'Equipo Biomédico';
  const marca = activo?.marca || mainOrden?.marcaModelo?.split(' ')[0] || '';
  const modelo = activo?.modelo || mainOrden?.marcaModelo?.split(' ').slice(1).join(' ') || '';
  const serie = activo?.serie || mainOrden?.serie || 'N/A';
  const idQr = activo?.idQr || mainOrden?.codigoSeguridad || 'N/A';
  const fechaRegistro = activo?.createdAt || mainOrden?.fechaRecibido;

  // Helper to extract media for a single order
  const extractMediaForOrden = (ord: any) => {
    const images: { url: string; title: string }[] = [];
    const videos: { url: string; title: string }[] = [];
    const audios: { url: string; title: string }[] = [];

    // Photos from order explicit fields
    (ord.fotosEstadoInicial || []).forEach((imgUrl: string, idx: number) => {
      if (imgUrl && !images.some(i => i.url === imgUrl)) {
        images.push({ url: imgUrl, title: `Foto Recepción #${idx + 1}` });
      }
    });
    (ord.fotosTecnico || []).forEach((imgUrl: string, idx: number) => {
      if (imgUrl && !images.some(i => i.url === imgUrl)) {
        images.push({ url: imgUrl, title: `Foto Trabajo #${idx + 1}` });
      }
    });

    const processAtt = (att: any, sourceName: string) => {
      if (!att || !att.url) return;
      const url = att.url;
      const type = (att.tipo || '').toLowerCase();
      const cleanUrl = url.split('?')[0].split('#')[0];
      const ext = cleanUrl.split('.').pop()?.toLowerCase() || '';

      const isVideo = type.startsWith('video/') || ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv'].includes(ext);
      const isAudio = type.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'weba'].includes(ext);

      if (isVideo) {
        if (!videos.some(v => v.url === url)) {
          videos.push({ url, title: att.nombre || `Video (${sourceName})` });
        }
      } else if (isAudio) {
        if (!audios.some(a => a.url === url)) {
          audios.push({ url, title: att.nombre || `Nota de Voz (${sourceName})` });
        }
      } else {
        if (!images.some(i => i.url === url)) {
          images.push({ url, title: att.nombre || `Evidencia (${sourceName})` });
        }
      }
    };

    // Direct attachments on order
    (ord.attachments || []).forEach((att: any) => processAtt(att, 'Orden'));

    // Attachments from Kanban tasks
    (ord.kanbanTasks || []).forEach((task: any) => {
      (task.attachments || []).forEach((att: any) => processAtt(att, task.title || 'Tarea'));
    });

    return { images, videos, audios };
  };

  // State for fullscreen photo lightbox
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Helper for status badge
  const getStatusBadge = (estado: string) => {
    const statusMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
      RECIBIDO: { label: 'Recibido en Taller', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
      DIAGNOSTICO: { label: 'En Diagnóstico', color: 'text-blue-800', bg: 'bg-blue-50', border: 'border-blue-200' },
      EN_EVALUACION: { label: 'En Evaluación', color: 'text-blue-800', bg: 'bg-blue-50', border: 'border-blue-200' },
      REPARACION: { label: 'En Reparación', color: 'text-purple-800', bg: 'bg-purple-50', border: 'border-purple-200' },
      LISTO: { label: 'Trabajo Concluido', color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' },
      LISTO_ENTREGAR: { label: 'Listo para Entrega', color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' },
      COMPLETADO: { label: 'Servicio Concluido', color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' },
      ENTREGADO: { label: 'Entregado al Cliente', color: 'text-teal-800', bg: 'bg-teal-50', border: 'border-teal-200' }
    };
    const current = statusMap[estado?.toUpperCase()] || { label: estado || 'Procesado', color: 'text-slate-800', bg: 'bg-slate-100', border: 'border-slate-300' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${current.bg} ${current.color} ${current.border}`}>
        <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
        {current.label}
      </span>
    );
  };

  // Calculate totals across all orders
  let totalPhotosCount = 0;
  let totalVideosCount = 0;
  let totalAudiosCount = 0;

  ordenes.forEach(ord => {
    const { images, videos, audios } = extractMediaForOrden(ord);
    totalPhotosCount += images.length;
    totalVideosCount += videos.length;
    totalAudiosCount += audios.length;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white pb-16">
      
      {/* HEADER INSTITUCIONAL LUMINOSO */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 p-0.5 shadow-md shadow-blue-500/10">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center font-black text-blue-700 text-lg tracking-tighter">
                BE
              </div>
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                Bioelectrónica Honduras
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">Hoja de Vida y Trazabilidad del Equipo</p>
            </div>
          </div>

          <a 
            href={pdfDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 active:scale-95 transition-all rounded-xl shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Descargar PDF Unificado</span>
          </a>
        </div>
      </header>

      {/* BANNER DE DOCUMENTO VERIFICADO */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border-b border-emerald-200/80 px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-600/15 flex items-center justify-center text-emerald-700 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                Registro Oficial de Trazabilidad Biomédica
              </p>
              <p className="text-[11px] text-emerald-800/80">
                Código QR del Activo: <span className="font-mono font-bold text-slate-900">{idQr}</span>
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-500 px-2 py-0.5 bg-white rounded border border-slate-200 shadow-2xs">
            BIO-VERIFY v2
          </span>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">

        {/* TARJETA PRINCIPAL DE ESPECIFICACIONES DEL EQUIPO */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                  QR: {idQr}
                </span>
                {mainOrden && getStatusBadge(mainOrden.estado)}
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">
                {equipoNombre}
              </h2>
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                {marca && <span>Marca: <strong className="text-slate-800 font-semibold">{marca}</strong></span>}
                {modelo && <span>• Modelo: <strong className="text-slate-800 font-semibold">{modelo}</strong></span>}
                <span>• N° Serie: <strong className="text-slate-800 font-mono font-semibold">{serie}</strong></span>
              </p>
            </div>

            {cliente && (
              <div className="text-left sm:text-right border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Cliente Propietario</p>
                <p className="text-sm font-bold text-slate-900 flex items-center sm:justify-end gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  {cliente.nombre}
                </p>
              </div>
            )}
          </div>

          {/* BARRA DE METRICAS RAPIDAS DEL EQUIPO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
              <span className="text-slate-500 text-[11px] font-medium block">Órdenes Registradas</span>
              <span className="text-base font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                <Activity className="w-4 h-4 text-blue-600" />
                {ordenes.length} Histórica{ordenes.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
              <span className="text-slate-500 text-[11px] font-medium block">Fotos de Evidencia HD</span>
              <span className="text-base font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                {totalPhotosCount} Foto{totalPhotosCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
              <span className="text-slate-500 text-[11px] font-medium block">Videos de Pruebas</span>
              <span className="text-base font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                <Video className="w-4 h-4 text-purple-600" />
                {totalVideosCount} Clip{totalVideosCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
              <span className="text-slate-500 text-[11px] font-medium block">Notas de Voz</span>
              <span className="text-base font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                <Mic className="w-4 h-4 text-teal-600" />
                {totalAudiosCount} Audio{totalAudiosCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </section>

        {/* TITULO DE LA BITACORA HISTORICA */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 pt-2">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-700" />
            <h3 className="text-base font-black tracking-tight text-slate-900">
              Cronología de Servicios e Histórico Unificado ({ordenes.length})
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Modo Consulta de Cliente (Read-Only)
          </span>
        </div>

        {/* BITACORA HISTORICA: RENDERIZADO ORDEN POR ORDEN EN ORDEN CRONOLOGICO */}
        <div className="space-y-6">
          {ordenes.map((ord: any, index: number) => {
            const { images, videos, audios } = extractMediaForOrden(ord);
            const ordenIdDisplay = ord.codigoSeguridad || (ord.id ? ord.id.slice(0, 8) : `N° ${index + 1}`);
            const fechaDisplay = ord.fechaRecibido || ord.createdAt;

            return (
              <article key={ord.id || index} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-5">
                
                {/* ENCABEZADO DE LA ORDEN INDIVIDUAL */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                        Orden #{ordenIdDisplay}
                      </span>
                      {getStatusBadge(ord.estado)}
                    </div>
                    {fechaDisplay && (
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Fecha de Registro: <strong className="text-slate-700">{new Date(fechaDisplay).toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                      </p>
                    )}
                  </div>

                  {ord.tecnicoReparacion && (
                    <div className="text-left sm:text-right border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Técnico Biomédico</p>
                      <p className="text-xs font-bold text-slate-800 flex items-center sm:justify-end gap-1 mt-0.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        {ord.tecnicoReparacion.nombre} {ord.tecnicoReparacion.apellido}
                      </p>
                    </div>
                  )}
                </div>

                {/* 1. FALLA REPORTADA Y DIAGNOSTICO DE ESTA ORDEN */}
                {(ord.descripcionFalla || ord.equipoDano || ord.diagnosticoTecnico) && (
                  <div className="space-y-3">
                    {/* Falla Reportada */}
                    {(ord.descripcionFalla || ord.equipoDano) && (
                      <div className="space-y-1">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Falla Reportada / Trabajo Solicitado
                        </h4>
                        <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/70 text-xs text-amber-950 font-medium leading-relaxed">
                          {renderFormattedContent(ord.descripcionFalla || ord.equipoDano)}
                        </div>
                      </div>
                    )}

                    {/* Diagnóstico Técnico */}
                    {ord.diagnosticoTecnico && (
                      <div className="space-y-1">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-blue-600" />
                          Diagnóstico Técnico & Intervención Realizada
                        </h4>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans">
                          {renderFormattedContent(ord.diagnosticoTecnico)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. EVIDENCIAS FOTOGRAFICAS DE ESTA ORDEN (CON ZOOM LIGHTBOX) */}
                {images.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                      Fotos de Evidencia HD ({images.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {images.map((img, imgIdx) => (
                        <div 
                          key={imgIdx}
                          onClick={() => setSelectedImage(img.url)}
                          className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:border-blue-600 transition-all shadow-2xs"
                        >
                          <img 
                            src={img.url} 
                            alt={img.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <div className="w-full flex items-center justify-between text-white text-[10px]">
                              <span className="truncate max-w-[80%] font-semibold">{img.title}</span>
                              <ZoomIn className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. VIDEOS DE PRUEBAS DE ESTA ORDEN */}
                {videos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-purple-600" />
                      Videos de Funcionamiento y Pruebas ({videos.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {videos.map((vid, vidIdx) => (
                        <div key={vidIdx} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                          <video controls className="w-full aspect-video bg-black">
                            <source src={vid.url} />
                            Tu navegador no soporta reproducción de video.
                          </video>
                          <p className="p-2.5 text-[11px] font-bold text-slate-800">{vid.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. NOTAS DE VOZ DE ESTA ORDEN */}
                {audios.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-teal-600" />
                      Notas de Voz y Explicaciones ({audios.length})
                    </h4>
                    <div className="space-y-2">
                      {audios.map((aud, audIdx) => (
                        <div key={audIdx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-800">{aud.title}</p>
                          <audio controls className="w-full sm:w-60 h-8">
                            <source src={aud.url} />
                          </audio>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. REPUESTOS Y COMPONENTES SUSTITUIDOS EN ESTA ORDEN */}
                {ord.repuestos && ord.repuestos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      Repuestos Sustituidos en esta Intervención
                    </h4>
                    <div className="divide-y divide-slate-100 bg-slate-50 rounded-xl border border-slate-200/60 overflow-hidden">
                      {ord.repuestos.map((rep: any, idx: number) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-900">{rep.descripcion || rep.nombre}</p>
                            <p className="text-[11px] text-slate-500">Cantidad: {rep.cantidad || 1}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold border border-emerald-200">
                            Verificado
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. FIRMAS DIGITALES DE CONFORMIDAD DE ESTA ORDEN */}
                {(ord.firmaClienteUrl || ord.firmaTecnicoUrl) && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      Firmas Digitales de Conformidad
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ord.firmaClienteUrl && (
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                          <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase">Firma del Cliente</p>
                          <div className="bg-white p-1.5 rounded-lg inline-block mb-1 border border-slate-200 max-w-[180px]">
                            <img src={ord.firmaClienteUrl} alt="Firma Cliente" className="max-h-16 object-contain mx-auto" />
                          </div>
                          <p className="text-xs font-bold text-slate-900">{ord.firmaClienteNombre || cliente?.nombre || 'Cliente'}</p>
                        </div>
                      )}

                      {ord.firmaTecnicoUrl && (
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                          <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase">Firma Técnico Biomédico</p>
                          <div className="bg-white p-1.5 rounded-lg inline-block mb-1 border border-slate-200 max-w-[180px]">
                            <img src={ord.firmaTecnicoUrl} alt="Firma Técnico" className="max-h-16 object-contain mx-auto" />
                          </div>
                          <p className="text-xs font-bold text-slate-900">{ord.firmaTecnicoNombre || ord.tecnicoReparacion?.nombre || 'Técnico Biomédico'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </article>
            );
          })}
        </div>

        {/* BOTON DE DESCARGA PDF AL FINAL DE LA BITACORA */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <p className="text-sm font-bold text-slate-900">¿Deseas descargar el reporte técnico en PDF?</p>
            <p className="text-xs text-slate-500">Obtén el documento oficial membretado con toda la bitácora histórica y firmas.</p>
          </div>
          <a 
            href={pdfDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            Descargar PDF Membretado
          </a>
        </div>

      </main>

      {/* FOOTER INSTITUCIONAL */}
      <footer className="mt-12 text-center text-xs text-slate-500 space-y-1">
        <p>© {new Date().getFullYear()} Bioelectrónica Honduras. Todos los derechos reservados.</p>
        <p>Sistema de Verificación Pública y Trazabilidad Biomédica.</p>
      </footer>

      {/* MODAL LIGHTBOX FOTO FULLSCREEN (MODO DIA) */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={selectedImage} 
            alt="Evidencia Zoom" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}

    </div>
  );
}
