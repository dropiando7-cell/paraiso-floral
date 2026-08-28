'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, 
  Sparkles, 
  Printer, 
  CheckCircle2, 
  User, 
  Search, 
  Filter, 
  AlertCircle, 
  Play, 
  ExternalLink,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { Pedido } from '@/types/pedido';
import { asignarAuxiliarPedido, iniciarPreparacionPedido } from './actions';
import { toast } from 'react-hot-toast';

interface PedidosAdminClientProps {
  dbUser: any;
  initialPedidos: Pedido[];
  assistants: { id: string; nombre: string; avatar?: string; role: string }[];
}

export default function PedidosAdminClient({
  dbUser,
  initialPedidos,
  assistants
}: PedidosAdminClientProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>(initialPedidos);
  const [filterTab, setFilterTab] = useState<'todos' | 'pendiente' | 'en_preparacion' | 'completado'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Handle assistant assignment
  const handleAssignAssistant = async (pedidoId: string, assistantId: string) => {
    try {
      const result = await asignarAuxiliarPedido(pedidoId, assistantId || null);
      if (result.success) {
        toast.success('Auxiliar asignado correctamente');
        // Update local state
        setPedidos(prev => prev.map(p => {
          if (p.id === pedidoId) {
            const assistant = assistants.find(a => a.id === assistantId);
            return {
              ...p,
              auxiliarAsignado: assistant ? {
                id: assistant.id,
                nombre: assistant.nombre,
                avatar: assistant.avatar
              } : undefined
            };
          }
          return p;
        }));
      } else {
        toast.error(result.error || 'Error al asignar');
      }
    } catch (e) {
      toast.error('Error de comunicación');
    }
  };

  // Start preparation manually
  const handleStartPrep = async (pedidoId: string) => {
    setLoadingId(pedidoId);
    try {
      const result = await iniciarPreparacionPedido(pedidoId);
      if (result.success) {
        toast.success('Preparación iniciada');
        setPedidos(prev => prev.map(p => 
          p.id === pedidoId ? { ...p, estado: 'en_preparacion' } : p
        ));
      } else {
        toast.error(result.error || 'Error al iniciar');
      }
    } catch (e) {
      toast.error('Error de comunicación');
    } finally {
      setLoadingId(null);
    }
  };

  // Filtering logic
  const filteredPedidos = pedidos.filter(p => {
    const matchesTab = filterTab === 'todos' || p.estado === filterTab;
    const matchesSearch = 
      p.codigoPedido.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cliente.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.destino.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'en_preparacion':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completado':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendiente': return 'Pendiente';
      case 'en_preparacion': return 'En Preparación';
      case 'completado': return 'Completado';
      default: return status;
    }
  };

  const getPayStatusColor = (status: string) => {
    switch (status) {
      case 'pagado': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'contra_entrega': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'credito': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPayStatusText = (status: string) => {
    switch (status) {
      case 'pagado': return 'Pagado';
      case 'contra_entrega': return 'Contra Entrega';
      case 'credito': return 'Crédito';
      default: return status;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Control de Pedidos y Picking</h1>
            <p className="text-sm text-slate-500 font-medium">Asigna pedidos a auxiliares y gestiona la preparación en bodega</p>
          </div>
        </div>
        
        <Link
          href="/inventario-ventas/pedidos/nuevo"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Sparkles className="w-4 h-4" />
          Nuevo Pedido (IA Parser)
        </Link>
      </div>

      {/* Filters and search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl w-full md:w-auto">
          {(['todos', 'pendiente', 'en_preparacion', 'completado'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-lg font-bold text-xs capitalize transition-all ${
                filterTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab === 'todos' ? 'Todos' : tab === 'en_preparacion' ? 'En Preparación' : tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, cliente o destino..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-medium"
          />
        </div>
      </div>

      {/* Grid of orders */}
      {filteredPedidos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No se encontraron pedidos</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">No hay registros cargados que coincidan con los criterios seleccionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPedidos.map(pedido => (
            <div
              key={pedido.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all"
            >
              {/* Order summary info */}
              <div className="flex-1 flex flex-col md:flex-row gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">{pedido.codigoPedido}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${getStatusColor(pedido.estado)}`}>
                      {getStatusText(pedido.estado)}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${getPayStatusColor(pedido.estadoPago)}`}>
                      {getPayStatusText(pedido.estadoPago)}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-1.5">{pedido.cliente.nombre}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-bold">Teléfono: {pedido.cliente.telefono || 'Sin teléfono'}</p>
                  
                  <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                    <span>📍 {pedido.destino}</span>
                    <span>📦 {pedido.items.length} productos</span>
                  </div>
                  {pedido.notas && (
                    <p className="mt-2 text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-lg">
                      Nota: {pedido.notas}
                    </p>
                  )}
                </div>
              </div>

              {/* Assignment and Action block */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                {/* Assistant Assignment Dropdown */}
                <div className="flex flex-col gap-1.5 min-w-[200px]">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> Asignado a:
                  </label>
                  <select
                    value={pedido.auxiliarAsignado?.id || ''}
                    onChange={(e) => handleAssignAssistant(pedido.id, e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Sin asignar --</option>
                    {assistants.map(assistant => (
                      <option key={assistant.id} value={assistant.id}>
                        {assistant.nombre} ({assistant.role === 'AUXILIAR_BODEGA' ? 'Bodega' : 'Personal'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Main Action buttons */}
                <div className="flex flex-wrap sm:flex-nowrap gap-2 pt-4 sm:pt-0">
                  {pedido.estado === 'pendiente' && (
                    <button
                      onClick={() => handleStartPrep(pedido.id)}
                      disabled={loadingId === pedido.id}
                      className="px-4 py-2.5 rounded-xl border border-emerald-600 hover:bg-emerald-50 text-emerald-600 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5" /> Iniciar
                    </button>
                  )}

                  {pedido.estado === 'en_preparacion' && (
                    <Link
                      href={`/inventario-ventas/pedidos/preparar/${pedido.id}`}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <ChevronRight className="w-3.5 h-3.5" /> Preparar
                    </Link>
                  )}

                  {pedido.estado === 'completado' && (
                    <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Completado
                    </div>
                  )}

                  {/* Print Command Button */}
                  <Link
                    href={`/inventario-ventas/pedidos/imprimir/${pedido.id}`}
                    target="_blank"
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all flex items-center justify-center"
                    title="Imprimir comanda de picking"
                  >
                    <Printer className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
