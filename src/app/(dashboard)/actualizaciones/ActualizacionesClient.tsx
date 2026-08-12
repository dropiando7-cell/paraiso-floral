'use client';

import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Play, 
  Sparkles, 
  Video, 
  MessageSquare, 
  Eye, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  User as UserIcon, 
  Users, 
  ShieldAlert, 
  Send, 
  ThumbsUp, 
  Heart, 
  Lightbulb, 
  Search, 
  X, 
  ChevronRight,
  ExternalLink,
  Lock,
  Globe
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  crearActualizacionAction, 
  editarActualizacionAction, 
  eliminarActualizacionAction, 
  agregarComentarioAction, 
  eliminarComentarioAction, 
  registrarVistoAction 
} from './actions';

interface ActualizacionesClientProps {
  initialData: {
    success: boolean;
    dbUser?: any;
    actualizaciones?: any[];
    orgUsers?: any[];
    error?: string;
  };
}

// Utility to parse YouTube IDs and return embed URLs
function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  let videoId = null;

  // Match youtube.com/watch?v=ID
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) {
    videoId = watchMatch[1];
  }

  if (videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&autoplay=0`;
  }

  // Fallback if full embed url is already passed
  if (url.includes('youtube.com/embed')) return url;
  
  return null;
}

// Utility to get YouTube Thumbnail
function getYouTubeThumbnail(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return null;
}

const CATEGORIES = [
  'Todas',
  '🚀 Nueva Función',
  '🔧 Corrección / Mejora',
  '💡 Tutorial / Capacitación',
  '📢 Anuncio'
];

export default function ActualizacionesClient({ initialData }: ActualizacionesClientProps) {
  const { dbUser, orgUsers = [] } = initialData;
  const [actualizaciones, setActualizaciones] = useState<any[]>(initialData.actualizaciones || []);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Video Selection
  const [activeActualizacionId, setActiveActualizacionId] = useState<string | null>(
    actualizaciones.length > 0 ? actualizaciones[0].id : null
  );

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showVistosModal, setShowVistosModal] = useState<boolean>(false);
  const [editingActualizacion, setEditingActualizacion] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New Comment state
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    titulo: '',
    subtitulo: '',
    versionTag: 'v1.0.0',
    categoria: '🚀 Nueva Función',
    youtubeUrl: '',
    videoUrl: '',
    descripcion: '',
    publicado: true,
    destacado: false,
    visibilidad: 'ALL' as 'ALL' | 'ROLES' | 'USERS_SELECT',
    allowedRoles: [] as string[],
    allowedUserIds: [] as string[]
  });

  const isUserAdmin = ['SUPER_ADMIN', 'ORG_ADMIN'].includes(dbUser?.role);

  // Active Update Object
  const activeActualizacion = actualizaciones.find(a => a.id === activeActualizacionId) || actualizaciones[0];

  // Register view when active video changes
  useEffect(() => {
    if (activeActualizacionId) {
      registrarVistoAction(activeActualizacionId);
    }
  }, [activeActualizacionId]);

  // Filtered Playlist
  const filteredActualizaciones = actualizaciones.filter(act => {
    const matchesCategory = selectedCategory === 'Todas' || act.categoria === selectedCategory;
    const matchesSearch = 
      act.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.versionTag && act.versionTag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (act.descripcion && act.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Handlers for Form
  const handleOpenCreate = () => {
    setEditingActualizacion(null);
    setFormData({
      titulo: '',
      subtitulo: '',
      versionTag: 'v1.0.0',
      categoria: '🚀 Nueva Función',
      youtubeUrl: '',
      videoUrl: '',
      descripcion: '',
      publicado: true,
      destacado: false,
      visibilidad: 'ALL',
      allowedRoles: [],
      allowedUserIds: []
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (act: any) => {
    setEditingActualizacion(act);
    setFormData({
      titulo: act.titulo || '',
      subtitulo: act.subtitulo || '',
      versionTag: act.versionTag || 'v1.0.0',
      categoria: act.categoria || '🚀 Nueva Función',
      youtubeUrl: act.youtubeUrl || '',
      videoUrl: act.videoUrl || '',
      descripcion: act.descripcion || '',
      publicado: act.publicado ?? true,
      destacado: act.destacado ?? false,
      visibilidad: act.visibilidad || 'ALL',
      allowedRoles: act.allowedRoles || [],
      allowedUserIds: act.allowedUserIds || []
    });
    setShowCreateModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.descripcion.trim()) {
      toast.error('Por favor completa el título y la descripción.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingActualizacion) {
        const res = await editarActualizacionAction(editingActualizacion.id, formData);
        if (res.success && res.data) {
          toast.success('Actualización modificada correctamente.');
          setActualizaciones(prev => prev.map(a => a.id === editingActualizacion.id ? { ...a, ...res.data } : a));
          setShowCreateModal(false);
        } else {
          toast.error(res.error || 'Error al editar.');
        }
      } else {
        const res = await crearActualizacionAction(formData);
        if (res.success && res.data) {
          toast.success('¡Publicación creada exitosamente!');
          setActualizaciones(prev => [res.data, ...prev]);
          setActiveActualizacionId(res.data.id);
          setShowCreateModal(false);
        } else {
          toast.error(res.error || 'Error al publicar.');
        }
      }
    } catch (err: any) {
      toast.error('Ocurrió un error al guardar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteActualizacion = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta publicación de actualización?')) return;
    try {
      const res = await eliminarActualizacionAction(id);
      if (res.success) {
        toast.success('Publicación eliminada.');
        const updated = actualizaciones.filter(a => a.id !== id);
        setActualizaciones(updated);
        if (activeActualizacionId === id) {
          setActiveActualizacionId(updated.length > 0 ? updated[0].id : null);
        }
      } else {
        toast.error(res.error || 'No se pudo eliminar.');
      }
    } catch (e) {
      toast.error('Error al eliminar.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActualizacion) return;
    if (!newCommentText.trim() && !selectedReaction) {
      toast.error('Escribe un comentario o selecciona una reacción.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const res = await agregarComentarioAction({
        actualizacionId: activeActualizacion.id,
        contenido: newCommentText,
        reaccion: selectedReaction || undefined
      });

      if (res.success && res.data) {
        toast.success('Comentario enviado.');
        setNewCommentText('');
        setSelectedReaction(null);
        
        // Update local state for comments
        setActualizaciones(prev => prev.map(act => {
          if (act.id === activeActualizacion.id) {
            return {
              ...act,
              comentarios: [...(act.comentarios || []), res.data]
            };
          }
          return act;
        }));
      } else {
        toast.error(res.error || 'Error al enviar comentario.');
      }
    } catch (e) {
      toast.error('Error al comentar.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (comentarioId: string) => {
    if (!confirm('¿Deseas eliminar este comentario?')) return;
    try {
      const res = await eliminarComentarioAction(comentarioId);
      if (res.success) {
        toast.success('Comentario eliminado.');
        setActualizaciones(prev => prev.map(act => {
          if (act.id === activeActualizacionId) {
            return {
              ...act,
              comentarios: act.comentarios.filter((c: any) => c.id !== comentarioId)
            };
          }
          return act;
        }));
      } else {
        toast.error(res.error || 'No se pudo eliminar comentario.');
      }
    } catch (e) {
      toast.error('Error al eliminar.');
    }
  };

  const youtubeEmbedUrl = getYouTubeEmbedUrl(activeActualizacion?.youtubeUrl);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-slate-700/60 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-400 p-2 rounded-2xl border border-indigo-500/30">
              <Tv className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Novedades & Capacitaciones ERP
              <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                V3.0 ACTIVE
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            Explora las últimas mejoras, correcciones y videotutoriales explicativos del sistema. Comenta y danos tu retroalimentación directamente debajo de cada video.
          </p>
        </div>

        {isUserAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95 cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-5 h-5" />
            Publicar Novedad / Video
          </button>
        )}
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por versión o tema..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Main Grid: Left Video Player & Right Playlist Feed */}
      {actualizaciones.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-700/50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Video className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-200">No hay publicaciones disponibles</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Aún no se han registrado videos explicativos o no tienes permisos para ver las novedades actuales.
          </p>
          {isUserAdmin && (
            <button
              onClick={handleOpenCreate}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              Crear primera publicación
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Player & Active Details (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {activeActualizacion && (
              <>
                {/* Video Player Container */}
                <div className="bg-black/60 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative group">
                  {youtubeEmbedUrl ? (
                    <div className="relative w-full aspect-video">
                      <iframe
                        src={youtubeEmbedUrl}
                        title={activeActualizacion.titulo}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full border-0"
                      />
                    </div>
                  ) : activeActualizacion.videoUrl ? (
                    <div className="relative w-full aspect-video">
                      <video
                        src={activeActualizacion.videoUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-gradient-to-br from-slate-900 to-indigo-950 flex flex-col items-center justify-center text-center p-8 space-y-3">
                      <Sparkles className="w-12 h-12 text-indigo-400 animate-pulse" />
                      <h3 className="text-lg font-bold text-white">{activeActualizacion.titulo}</h3>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Esta publicación no contiene enlace de video. Revisa las notas escritas más abajo.
                      </p>
                    </div>
                  )}
                </div>

                {/* Active Update Header & Description */}
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-6 space-y-6 shadow-xl">
                  
                  {/* Badges & Meta Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-indigo-500/20 text-indigo-300 font-extrabold text-xs px-3 py-1 rounded-lg border border-indigo-500/30">
                        {activeActualizacion.versionTag || 'v1.0.0'}
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-300 font-bold text-xs px-3 py-1 rounded-lg border border-emerald-500/30">
                        {activeActualizacion.categoria}
                      </span>
                      {activeActualizacion.visibilidad !== 'ALL' && (
                        <span className="bg-amber-500/20 text-amber-300 font-bold text-xs px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Restringido ({activeActualizacion.visibilidad})
                        </span>
                      )}
                    </div>

                    {/* Admin Actions */}
                    {isUserAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(activeActualizacion)}
                          className="p-2 bg-slate-700/60 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                          title="Editar actualización"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteActualizacion(activeActualizacion.id)}
                          className="p-2 bg-slate-700/60 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                          title="Eliminar publicación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Date */}
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white leading-tight">
                      {activeActualizacion.titulo}
                    </h2>
                    {activeActualizacion.subtitulo && (
                      <p className="text-base text-slate-300 font-medium">
                        {activeActualizacion.subtitulo}
                      </p>
                    )}
                  </div>

                  {/* Author & Audience Button Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center text-sm">
                        {activeActualizacion.createdBy?.nombre?.[0] || 'A'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">
                          {[activeActualizacion.createdBy?.nombre, activeActualizacion.createdBy?.apellido].filter(Boolean).join(' ') || 'Administrador ERP'}
                        </div>
                        <div className="text-xs text-slate-400">
                          Publicado el {new Date(activeActualizacion.createdAt).toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    {/* Visto Tracker Button */}
                    <button
                      onClick={() => setShowVistosModal(true)}
                      className="flex items-center gap-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-600/60 transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>{activeActualizacion.vistos?.length || 0} Vistos</span>
                    </button>
                  </div>

                  {/* Detailed Notes / Description */}
                  <div className="prose prose-invert max-w-none text-sm text-slate-300 space-y-2 leading-relaxed bg-slate-900/60 p-4 rounded-2xl border border-slate-700/40">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Notas de la actualización:</h4>
                    <p className="whitespace-pre-wrap font-sans text-slate-200">
                      {activeActualizacion.descripcion}
                    </p>
                  </div>
                </div>

                {/* Feedback & Comments Section */}
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-6 space-y-6 shadow-xl">
                  
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-indigo-400" />
                      Retroalimentación & Comentarios ({activeActualizacion.comentarios?.length || 0})
                    </h3>
                  </div>

                  {/* Add Comment Form */}
                  <form onSubmit={handleAddComment} className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap pb-1">
                      <span className="text-xs font-bold text-slate-400">Reacción rápida:</span>
                      {[
                        { label: '👍 Entendido', value: '👍' },
                        { label: '💡 Sugerencia', value: '💡' },
                        { label: '❤️ Me sirvió', value: '❤️' },
                        { label: '👏 Excelente', value: '👏' }
                      ].map(r => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setSelectedReaction(selectedReaction === r.value ? null : r.value)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                            selectedReaction === r.value
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <textarea
                        rows={3}
                        placeholder="Escribe aquí tu duda, sugerencia o comentario sobre este video..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded-2xl p-3.5 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-500 resize-none"
                      />
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={isSubmittingComment}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {isSubmittingComment ? 'Enviando...' : 'Publicar Comentario'}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Comment Stream */}
                  <div className="space-y-4 pt-2">
                    {(!activeActualizacion.comentarios || activeActualizacion.comentarios.length === 0) ? (
                      <p className="text-xs text-slate-500 text-center py-6 font-medium">
                        Sé el primero en dejar retroalimentación sobre esta actualización.
                      </p>
                    ) : (
                      activeActualizacion.comentarios.map((com: any) => (
                        <div 
                          key={com.id} 
                          className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-4 space-y-2 relative group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs">
                                {com.usuario?.nombre?.[0] || 'U'}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-white">
                                  {[com.usuario?.nombre, com.usuario?.apellido].filter(Boolean).join(' ') || 'Usuario ERP'}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-2">
                                  {new Date(com.createdAt).toLocaleString('es-HN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Delete Comment Button */}
                            {(com.usuarioId === dbUser?.id || isUserAdmin) && (
                              <button
                                onClick={() => handleDeleteComment(com.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                title="Eliminar comentario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {com.reaccion && (
                            <span className="inline-block text-xs bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-md border border-indigo-500/30">
                              Reacción: {com.reaccion}
                            </span>
                          )}

                          {com.contenido && (
                            <p className="text-xs text-slate-300 font-normal leading-relaxed pl-1">
                              {com.contenido}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                </div>
              </>
            )}

          </div>

          {/* Right Column: Playlist Feed (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" />
                Historial de Videos ({filteredActualizaciones.length})
              </h3>
            </div>

            <div className="space-y-3 max-h-[850px] overflow-y-auto pr-1 no-scrollbar">
              {filteredActualizaciones.map((act) => {
                const isActive = act.id === activeActualizacionId;
                const thumbUrl = getYouTubeThumbnail(act.youtubeUrl);
                const hasWatched = act.vistos?.some((v: any) => v.usuarioId === dbUser?.id);

                return (
                  <div
                    key={act.id}
                    onClick={() => setActiveActualizacionId(act.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex gap-3.5 group ${
                      isActive
                        ? 'bg-indigo-950/60 border-indigo-500/80 shadow-lg shadow-indigo-950/50'
                        : 'bg-slate-800/70 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {/* Thumbnail Box */}
                    <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex-shrink-0 flex items-center justify-center">
                      {thumbUrl ? (
                        <img 
                          src={thumbUrl} 
                          alt={act.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center text-indigo-400">
                          <Play className="w-6 h-6 fill-current" />
                        </div>
                      )}
                      {/* Play Overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                            {act.versionTag || 'v1.0'}
                          </span>
                          {!hasWatched && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" title="Nuevo para ti" />
                          )}
                        </div>
                        <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${isActive ? 'text-white font-black' : 'text-slate-200'}`}>
                          {act.titulo}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>{new Date(act.createdAt).toLocaleDateString('es-HN', { day: '2-digit', month: 'short' })}</span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3 text-slate-500" /> {act.vistos?.length || 0}</span>
                          <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3 text-slate-500" /> {act.comentarios?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* Modal: Publicar / Editar Actualización */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8">
            
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-400" />
                {editingActualizacion ? 'Editar Publicación' : 'Publicar Nueva Novedad / Video'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-sm">
              
              {/* Titulo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Título del Video / Mejora *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Nuevo Módulo de Búsqueda por Código QR y Filtros Rápidos"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Grid: Version & Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Etiqueta de Versión (Release)</label>
                  <input
                    type="text"
                    placeholder="Ej. v2.5.0"
                    value={formData.versionTag}
                    onChange={(e) => setFormData({ ...formData, versionTag: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Categoría *</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="🚀 Nueva Función">🚀 Nueva Función</option>
                    <option value="🔧 Corrección / Mejora">🔧 Corrección / Mejora</option>
                    <option value="💡 Tutorial / Capacitación">💡 Tutorial / Capacitación</option>
                    <option value="📢 Anuncio">📢 Anuncio</option>
                  </select>
                </div>
              </div>

              {/* YouTube Link */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Enlace de Video de YouTube (No Listado / Público)</span>
                  <span className="text-[10px] text-indigo-400 font-normal">Recomendado</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Descripcion */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Descripción Explicativa / Notas del Cambios *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explica qué problemas resuelve esta actualización y cómo usar los nuevos botones..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Audience & Permissions */}
              <div className="space-y-3 pt-2 border-t border-slate-700">
                <label className="text-xs font-bold text-slate-300">Audiencia / ¿Quiénes pueden ver este video?</label>
                
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'Todos los usuarios', icon: Globe },
                    { id: 'ROLES', label: 'Por Roles', icon: ShieldAlert },
                    { id: 'USERS_SELECT', label: 'Usuarios Elegidos', icon: Users }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, visibilidad: item.id as any })}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                        formData.visibilidad === item.id
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Specific Roles */}
                {formData.visibilidad === 'ROLES' && (
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 space-y-2">
                    <span className="text-xs font-bold text-slate-400">Selecciona los roles permitidos:</span>
                    <div className="flex flex-wrap gap-2">
                      {['SUPER_ADMIN', 'ORG_ADMIN', 'TECNICO', 'USER'].map(role => {
                        const checked = formData.allowedRoles.includes(role);
                        return (
                          <label key={role} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, allowedRoles: [...formData.allowedRoles, role] });
                                } else {
                                  setFormData({ ...formData, allowedRoles: formData.allowedRoles.filter(r => r !== role) });
                                }
                              }}
                            />
                            <span>{role}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Specific Users Selector */}
                {formData.visibilidad === 'USERS_SELECT' && (
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 space-y-2">
                    <span className="text-xs font-bold text-slate-400">Selecciona los usuarios autorizados:</span>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {orgUsers.map(usr => {
                        const checked = formData.allowedUserIds.includes(usr.id);
                        return (
                          <label key={usr.id} className="flex items-center justify-between text-xs text-slate-300 cursor-pointer bg-slate-800 p-2 rounded-lg border border-slate-700/60 hover:bg-slate-700">
                            <span className="font-medium">{[usr.nombre, usr.apellido].filter(Boolean).join(' ') || usr.email}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, allowedUserIds: [...formData.allowedUserIds, usr.id] });
                                } else {
                                  setFormData({ ...formData, allowedUserIds: formData.allowedUserIds.filter(uId => uId !== usr.id) });
                                }
                              }}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-700 text-slate-300 font-bold hover:bg-slate-600 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : editingActualizacion ? 'Guardar Cambios' : 'Publicar Ahora'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal: Registro de Vistos / Lectores */}
      {showVistosModal && activeActualizacion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-400" />
                Usuarios que vieron esta actualización
              </h3>
              <button
                onClick={() => setShowVistosModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {(!activeActualizacion.vistos || activeActualizacion.vistos.length === 0) ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Aún ningún usuario ha reproducido o marcado como vista esta publicación.
                </p>
              ) : (
                activeActualizacion.vistos.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700/60 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                        {v.usuario?.nombre?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-white">
                          {[v.usuario?.nombre, v.usuario?.apellido].filter(Boolean).join(' ') || 'Usuario ERP'}
                        </div>
                        <div className="text-[10px] text-slate-400">{v.usuario?.role}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(v.vistoAt).toLocaleString('es-HN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
