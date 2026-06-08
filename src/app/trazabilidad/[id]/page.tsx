import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { 
  Wrench, 
  Calendar, 
  User, 
  Settings, 
  Shield, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Laptop, 
  UserCheck, 
  MessageSquare,
  ChevronRight,
  TrendingUp,
  Tag
} from 'lucide-react';

export const metadata = {
  title: 'Trazabilidad de Equipos | Bioelectrónica',
  description: 'Historial de servicio y mantenimiento técnico',
};

export default async function TrazabilidadPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const uppercaseId = resolvedParams.id.toUpperCase();

  // Try fetching by security code first
  let orden = await prisma.ordenTrabajo.findFirst({
    where: { codigoSeguridad: uppercaseId },
    include: {
      cliente: true,
      usuarioRecepcion: true,
      tecnicoReparacion: true,
      tecnicosAsignados: true,
      repuestos: { include: { producto: true, activoFijo: true } }
    }
  });

  // Fallback to UUID
  if (!orden && resolvedParams.id.length === 36) {
    orden = await prisma.ordenTrabajo.findUnique({
      where: { id: resolvedParams.id },
      include: {
        cliente: true,
        usuarioRecepcion: true,
        tecnicoReparacion: true,
        tecnicosAsignados: true,
        repuestos: { include: { producto: true, activoFijo: true } }
      }
    });
  }

  if (!orden) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl flex items-center justify-center mb-6">
          <Wrench className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Orden No Encontrada</h1>
        <p className="text-slate-400 max-w-md mb-8">
          El código QR o ID especificado no coincide con ninguna orden registrada en Bioelectrónica Honduras.
        </p>
        <Link href="/" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-2xl transition">
          Ir al Inicio
        </Link>
      </div>
    );
  }

  // Cargar tarea de Kanban, comentarios y adjuntos vinculados a esta OrdenTrabajo
  const kanbanTask = await prisma.kanbanTask.findFirst({
    where: { ordenTrabajoId: orden.id },
    include: {
      comments: {
        include: { usuario: true },
        orderBy: { createdAt: 'asc' }
      },
      attachments: true
    }
  });

  // Fetch authentication status
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let dbUser = null;
  if (user?.email) {
    dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  }
  const isStaff = !!dbUser;

  // Retrieve the device history timeline. We group by serial number (if exists)
  let timelineOrders = [orden];
  if (orden.serie) {
    const historical = await prisma.ordenTrabajo.findMany({
      where: {
        serie: orden.serie,
        id: { not: orden.id },
        organizationId: orden.organizationId
      },
      orderBy: { fechaRecibido: 'desc' },
      include: {
        cliente: true,
        usuarioRecepcion: true,
        tecnicoReparacion: true,
        tecnicosAsignados: true,
        repuestos: { include: { producto: true, activoFijo: true } }
      }
    });
    timelineOrders = [...timelineOrders, ...historical].sort(
      (a, b) => new Date(b.fechaRecibido).getTime() - new Date(a.fechaRecibido).getTime()
    );
  }

  // Determine current status configuration
  const est = orden.estado;
  const statusConfig = {
    RECIBIDO: { label: 'RECIBIDO', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', desc: 'Equipo recepcionado en taller. Pendiente de evaluación.' },
    EN_EVALUACION: { label: 'EN EVALUACIÓN', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', desc: 'Técnicos realizando diagnóstico de hardware y software.' },
    ESPERANDO_APROBACION: { label: 'REVISIÓN DE PRESUPUESTO', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', desc: 'Diagnóstico realizado. Preparando y revisando presupuesto de reparación.' },
    APROBACION_PRESUPUESTO: { label: 'PENDIENTE APROBACIÓN CLIENTE', color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20', desc: 'Presupuesto enviado al cliente. Esperando confirmación de aceptación.' },
    REPARACION: { label: 'EN REPARACIÓN', color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', desc: 'Presupuesto aprobado. Procediendo con la reparación del equipo.' },
    LISTO_ENTREGA: { label: 'LISTO PARA ENTREGA', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', desc: 'Reparación y pruebas de control de calidad completadas exitosamente.' },
    ENTREGADO: { label: 'ENTREGADO', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', desc: 'Equipo retirado por el cliente de forma conforme.' }
  }[est] || { label: est, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', desc: 'Estado desconocido.' };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white pb-16 font-sans">
      
      {/* Background radial effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-indigo-900/15 blur-[120px]" />
        <div className="absolute top-[30%] -right-[20%] w-[60%] h-[70%] rounded-full bg-emerald-950/20 blur-[100px]" />
      </div>

      {/* Floating Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-4 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-white block">BIOELECTRÓNICA</span>
            <span className="text-[10px] text-slate-400 font-bold tracking-widest block uppercase">Honduras</span>
          </div>
        </div>
        {isStaff ? (
          <Link href={`/soporte/${orden.id}`} className="inline-flex items-center gap-2 px-4.5 py-2 bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold text-indigo-400 transition-all">
            <Shield className="w-3.5 h-3.5" />
            <span>Panel de Taller</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <Link href="/login" className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-350 transition-colors">
            <User className="w-3.5 h-3.5" />
            <span>Acceso Personal</span>
          </Link>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 mt-8 grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Main device card and current status */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          
          {/* Main Info Card */}
          <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-[10px] font-bold text-slate-450 tracking-wide mb-3 border border-slate-700/50 uppercase">
                <Tag className="w-3 h-3 text-indigo-400" />
                <span>ID: {orden.codigoSeguridad}</span>
                {kanbanTask?.codigo && (
                  <>
                    <span className="text-slate-600 font-normal">|</span>
                    <span className="text-indigo-400 font-black">TAREA: {kanbanTask.codigo}</span>
                  </>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                {orden.equipoDano.toUpperCase()}
              </h2>
              <p className="text-sm text-slate-400 font-medium mt-1 uppercase">
                {orden.marcaModelo || 'Marca/Modelo no especificado'}
              </p>
            </div>

            {/* Glowing Status Ring & Info */}
            <div className={`p-5 rounded-2xl border ${statusConfig.border} ${statusConfig.bg} flex items-start gap-4`}>
              <div className="mt-1 flex-shrink-0">
                {est === 'LISTO_ENTREGA' || est === 'ENTREGADO' ? (
                  <CheckCircle2 className={`w-6 h-6 ${statusConfig.color}`} />
                ) : (
                  <Clock className={`w-6 h-6 animate-pulse ${statusConfig.color}`} />
                )}
              </div>
              <div>
                <span className={`text-xs font-black tracking-wider uppercase block ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                <p className="text-xs text-slate-200 mt-1 font-medium leading-relaxed">
                  {statusConfig.desc}
                </p>
              </div>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Número de Serie</span>
                <span className="text-sm font-semibold font-mono text-slate-100 mt-0.5 block">{orden.serie || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Fecha de Recepción</span>
                <span className="text-sm font-semibold text-slate-100 mt-0.5 block">
                  {orden.fechaRecibido ? new Date(orden.fechaRecibido).toLocaleDateString("es-HN") : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Cliente / Empresa</span>
                <span className="text-sm font-semibold text-slate-100 mt-0.5 block truncate">
                  {isStaff ? orden.cliente.nombre.toUpperCase() : 'CLIENTE REGISTRADO'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Tipo de Servicio</span>
                <span className="text-sm font-semibold text-slate-100 mt-0.5 block">
                  {orden.tipoAparato === 'MEDICO' ? '🏥 CLINICO / MEDICO' : orden.tipoAparato === 'AIRE' ? '❄️ CLIMATIZACION' : '🔧 INDUSTRIAL / COMERCIAL'}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic & Details (Only visible if authenticated Staff, otherwise basic public view) */}
          {isStaff ? (
            <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col gap-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <span>Detalles Técnicos Internos</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-400 font-semibold block mb-1">Falla Reportada por Cliente:</span>
                  <div className="bg-slate-950 p-4 rounded-xl text-sm border border-slate-800 text-slate-300 leading-relaxed font-mono">
                    {orden.descripcionFalla || 'Sin detalles'}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 font-semibold block mb-1">Diagnóstico Técnico:</span>
                  <div className="bg-slate-950 p-4 rounded-xl text-sm border border-slate-800 text-slate-350 leading-relaxed">
                    {orden.diagnosticoTecnico || <span className="italic text-slate-500">Sin diagnóstico registrado aún.</span>}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 font-semibold block mb-1">Técnicos Asignados:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {orden.tecnicosAsignados.map((t: any) => {
                      const displayName = [t.nombre, t.apellido].filter(Boolean).join(" ");
                      return (
                        <span key={t.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase shadow-sm">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{displayName} {t.puesto ? `· ${t.puesto}` : ''}</span>
                        </span>
                      );
                    })}
                    {orden.tecnicosAsignados.length === 0 && (
                      <span className="text-xs text-slate-500 italic">No hay técnicos asignados.</span>
                    )}
                  </div>
                </div>

                {/* Costs & Replaced parts summary */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-850">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Revisión</span>
                    <span className="text-lg font-black text-indigo-400 mt-1 block">L. {Number(orden.costoRevision).toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Mano de Obra + Repuestos</span>
                    <span className="text-lg font-black text-emerald-400 mt-1 block">L. {Number(orden.costoReparacion || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Public friendly summary details
            <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-indigo-400" />
                <span>Garantía y Confianza</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Este equipo cuenta con una etiqueta de trazabilidad única enlazada a nuestro sistema de taller. 
                Los técnicos autorizados de Bioelectrónica pueden acceder al historial de mantenimientos para 
                garantizar el correcto funcionamiento de su equipo médico e industrial.
              </p>
              <div className="flex items-center gap-3 p-3 bg-indigo-600/5 border border-indigo-500/10 rounded-xl mt-1">
                <span className="text-xs font-bold text-indigo-300">¿Necesitas soporte?</span>
                <a href="https://wa.me/50499990000" target="_blank" rel="noopener noreferrer" className="text-xs font-black text-white hover:underline ml-auto flex items-center gap-1">
                  WhatsApp Directo <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Workshop Interventions Card */}
          <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col gap-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <span>Evidencias y Notas del Taller</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Bitácora de intervenciones técnicas e imágenes de soporte registradas durante el mantenimiento.
              </p>
            </div>

            {/* Kanban Task comments list */}
            {kanbanTask && (kanbanTask.comments.length > 0 || kanbanTask.attachments.length > 0) ? (
              <div className="space-y-6">
                
                {/* Images / Attachments section */}
                {kanbanTask.attachments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Imágenes y Evidencias de Soporte:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {kanbanTask.attachments.map((att: any) => {
                        const isImage = att.tipo.startsWith('image/');
                        return (
                          <div key={att.id} className="relative group rounded-xl overflow-hidden border border-slate-850 bg-slate-950/50 aspect-video flex flex-col items-center justify-center">
                            {isImage ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={att.url}
                                  alt={att.nombre}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                                />
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity gap-1"
                                >
                                  Ver Imagen
                                </a>
                              </>
                            ) : (
                              <div className="p-3 text-center flex flex-col items-center gap-1.5 w-full">
                                <FileText className="w-8 h-8 text-indigo-455" />
                                <span className="text-[10px] text-slate-350 truncate w-full px-1">{att.nombre}</span>
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-indigo-400 hover:underline font-bold"
                                >
                                  Descargar
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Comments section */}
                {kanbanTask.comments.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Historial de Comentarios Técnicos:</span>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {kanbanTask.comments.map((comm: any) => {
                        const initials = comm.usuario.nombre
                          ? comm.usuario.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                          : '?';
                        const dateText = comm.createdAt
                          ? new Date(comm.createdAt).toLocaleDateString("es-HN") + ' ' + new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '';

                        return (
                          <div key={comm.id} className="flex gap-3 items-start bg-slate-950/40 border border-slate-850 rounded-2xl p-4.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-md">
                              {initials}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-100 uppercase">{comm.usuario.nombre}</span>
                                <span className="text-[9px] text-slate-505 font-mono">{dateText}</span>
                              </div>
                              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {comm.contenido}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-8 bg-slate-950/20 rounded-2xl border border-dashed border-slate-800">
                <MessageSquare className="h-8 w-8 text-slate-700 mb-2" />
                <p className="text-xs text-slate-500 font-bold">Sin intervenciones registradas</p>
                <p className="text-[10px] text-slate-400 max-w-[250px] mt-0.5 leading-relaxed">
                  Una vez que el técnico registre comentarios o fotos de evidencia en el tablero Kanban, se sincronizarán aquí automáticamente.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Ficha Histórica / Timeline of all maintenance orders */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <span>Historial de Trazabilidad</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Historial completo de mantenimientos para este equipo (S/N: {orden.serie || 'N/A'})
              </p>
            </div>

            {/* Timeline component */}
            <div className="relative border-l border-slate-800 ml-3 pl-6 space-y-8 py-2">
              {timelineOrders.map((histOrder, idx) => {
                const isCurrent = histOrder.id === orden.id;
                const dateText = histOrder.fechaRecibido 
                  ? new Date(histOrder.fechaRecibido).toLocaleDateString("es-HN", { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'N/A';
                
                const typeText = histOrder.tipoAparato === 'MEDICO' ? 'Mant. Médico' : histOrder.tipoAparato === 'AIRE' ? 'Climatización' : 'Mant. General';
                
                return (
                  <div key={histOrder.id} className="relative group">
                    {/* Timeline bullet */}
                    <div className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      isCurrent 
                        ? 'bg-indigo-500 border-indigo-400 ring-4 ring-indigo-500/20' 
                        : 'bg-slate-950 border-slate-700 hover:border-slate-500'
                    }`} />

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-slate-400 tracking-wider">
                          {dateText.toUpperCase()}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-extrabold text-indigo-400 tracking-wide uppercase">
                            ACTUAL
                          </span>
                        )}
                      </div>
                      
                      <span className="text-sm font-bold text-white leading-tight group-hover:text-indigo-400 transition-colors">
                        {typeText} · {histOrder.codigoSeguridad}
                      </span>

                      {/* Display public vs staff details for past orders */}
                      {isStaff ? (
                        <div className="mt-1.5 text-xs text-slate-400 space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-300 uppercase text-[10px]">Técnicos:</span>
                            <span className="text-slate-100 font-bold truncate max-w-[150px]">
                              {histOrder.tecnicosAsignados.map((u: any) => u.nombre).join(', ') || 'No asignado'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-900 pt-1 mt-1">
                            <span className="font-semibold text-slate-300 uppercase text-[10px]">Repuestos:</span>
                            <span className="text-slate-200">
                              {histOrder.repuestos?.length || 0} pza(s)
                            </span>
                          </div>
                          {histOrder.diagnosticoTecnico && (
                            <div className="text-[11px] text-slate-550 border-t border-slate-900 pt-1.5 mt-1.5 italic line-clamp-2">
                              "{histOrder.diagnosticoTecnico}"
                            </div>
                          )}
                        </div>
                      ) : (
                        // Basic timeline for client
                        <span className="text-xs text-slate-450 mt-0.5 leading-relaxed font-medium">
                          Servicio técnico completado bajo estado <span className="text-slate-300 font-bold">{histOrder.estado}</span>.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {timelineOrders.length === 1 && (
              <div className="p-4 bg-slate-950/20 rounded-2xl border border-slate-850 text-center text-xs text-slate-500 italic">
                Primer servicio técnico registrado para este número de serie.
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Branded footer */}
      <footer className="mt-auto w-full text-center text-[10px] text-slate-500 font-bold tracking-widest uppercase">
        © 2026 Bioelectrónica Honduras · Soluciones Médicas e Industriales
      </footer>
    </div>
  );
}
