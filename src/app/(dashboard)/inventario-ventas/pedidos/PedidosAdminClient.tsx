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
  UserCheck,
  Mic,
  Plus,
  PlusCircle,
  X,
  Package,
  Layers
} from 'lucide-react';
import { Pedido } from '@/types/pedido';
import { asignarAuxiliarPedido, iniciarPreparacionPedido, agregarItemAPedido, getPedidos } from './actions';
import { toast } from 'react-hot-toast';
import { VoiceOrderAssistantModal, FloatingVoiceOrderButton } from '@/components/pedidos/VoiceOrderAssistantModal';
import { ProductSmartAutocomplete } from '@/components/pedidos/ProductSmartAutocomplete';
import { playSuccessChime } from '@/utils/audioAlerts';

interface AssistantMember {
  id: string;
  nombre: string;
  avatar?: string;
  role?: string;
  customRoleName?: string;
  puesto?: string;
  roleGroup?: string;
}

interface PedidosAdminClientProps {
  dbUser: any;
  initialPedidos: Pedido[];
  assistants: AssistantMember[];
  products?: { id: string; nombre: string; sku: string; stockActual: number; precioVenta?: number }[];
}

export default function PedidosAdminClient({
  dbUser,
  initialPedidos,
  assistants,
  products = []
}: PedidosAdminClientProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>(initialPedidos);
  const [filterTab, setFilterTab] = useState<'todos' | 'pendiente' | 'en_preparacion' | 'completado'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const userModules = dbUser?.accessibleModules || [];
  const isSuperOrOrgAdmin = dbUser?.role === 'SUPER_ADMIN' || dbUser?.role === 'ORG_ADMIN';
  
  const canCreateOrders = isSuperOrOrgAdmin || 
    userModules.includes('/inventario-ventas/pedidos/nuevo') || 
    userModules.includes('crear_pedidos') ||
    (!userModules.includes('/inventario-ventas/pedidos/preparar') && userModules.includes('/inventario-ventas/pedidos'));

  // Group assistants by roleGroup
  const groupedAssistants = assistants.reduce((acc, a) => {
    const group = a.roleGroup || (a.role === 'AUXILIAR_BODEGA' ? 'AUXILIARES DE BODEGA' : 'ADMINISTRACIÓN');
    if (!acc[group]) acc[group] = [];
    acc[group].push(a);
    return acc;
  }, {} as Record<string, AssistantMember[]>);

  const sortedGroupKeys = Object.keys(groupedAssistants).sort((a, b) => {
    const isAuxA = a.includes('AUXILIAR') || a.includes('BODEGA');
    const isAuxB = b.includes('AUXILIAR') || b.includes('BODEGA');
    if (isAuxA && !isAuxB) return -1;
    if (!isAuxA && isAuxB) return 1;
    return a.localeCompare(b);
  });

  // Voice Assistant Modal state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Add Item to existing order modal state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [selectedPedidoForAdd, setSelectedPedidoForAdd] = useState<Pedido | null>(null);
  const [addSearchProduct, setAddSearchProduct] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addVariedad, setAddVariedad] = useState('');
  const [addCantidad, setAddCantidad] = useState(1);
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Handle assistant assignment
  const handleAssignAssistant = async (pedidoId: string, assistantId: string) => {
    try {
      const result = await asignarAuxiliarPedido(pedidoId, assistantId || null);
      if (result.success) {
        toast.success('Auxiliar asignado correctamente');
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

  // Open add item modal
  const openAddItemModal = (pedido: Pedido) => {
    setSelectedPedidoForAdd(pedido);
    setSelectedProductId('');
    setAddSearchProduct('');
    setAddVariedad('');
    setAddCantidad(1);
    setIsAddItemModalOpen(true);
  };

  // Submit adding item to order in real-time
  const handleSaveAddedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPedidoForAdd) return;

    const matchedProduct = products.find(p => p.id === selectedProductId);
    if (!matchedProduct) {
      toast.error('Por favor selecciona un producto del catálogo');
      return;
    }

    if (addCantidad < 1) {
      toast.error('La cantidad debe ser al menos 1');
      return;
    }

    setIsAddingItem(true);
    try {
      const result = await agregarItemAPedido({
        pedidoId: selectedPedidoForAdd.id,
        productoId: matchedProduct.id,
        nombreProducto: matchedProduct.nombre,
        variedadTono: addVariedad || undefined,
        codigoBarras: matchedProduct.sku,
        cantidadSolicitada: addCantidad
      });

      if (result.success && result.item) {
        playSuccessChime();
        toast.success(`¡Ítem "${matchedProduct.nombre}" agregado! Se notificó a la bodega.`);
        
        // Update local order items
        setPedidos(prev => prev.map(p => {
          if (p.id === selectedPedidoForAdd.id) {
            return {
              ...p,
              items: [
                ...p.items,
                {
                  id: result.item.id,
                  productoId: result.item.productoId,
                  nombreProducto: result.item.nombreProducto,
                  variedadTono: result.item.variedadTono || undefined,
                  codigoBarras: result.item.codigoBarras || undefined,
                  cantidadSolicitada: result.item.cantidadSolicitada,
                  cantidadPreparada: 0,
                  recolectado: false
                }
              ]
            };
          }
          return p;
        }));

        setIsAddItemModalOpen(false);
      } else {
        toast.error(result.error || 'Error al agregar el producto');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error de comunicación');
    } finally {
      setIsAddingItem(false);
    }
  };

  // Callback when a voice order is created
  const handleVoiceOrderCreated = async () => {
    const freshPedidos = await getPedidos();
    setPedidos(freshPedidos as any);
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

  const filteredCatalogProducts = products.filter(p =>
    p.nombre.toLowerCase().includes(addSearchProduct.toLowerCase()) ||
    p.sku.toLowerCase().includes(addSearchProduct.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-20">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Control de Pedidos y Picking</h1>
            <p className="text-sm text-slate-500 font-medium">Asigna pedidos a auxiliares y gestiona la preparación en bodega</p>
          </div>
        </div>
        
        {canCreateOrders && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Voice AI Assistant Trigger */}
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Dictar por Voz (IA)</span>
            </button>

            {/* New Order Link */}
            <Link
              href="/inventario-ventas/pedidos/nuevo"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Nuevo Pedido</span>
            </Link>
          </div>
        )}
      </div>

      {/* Filters and search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
          {(['todos', 'pendiente', 'en_preparacion', 'completado'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-lg font-bold text-xs capitalize transition-all whitespace-nowrap ${
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
          {filteredPedidos.map(pedido => {
            const readyCount = pedido.items.filter(i => i.recolectado).length;
            const isCompleted = pedido.estado === 'completado';

            return (
              <div
                key={pedido.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all"
              >
                {/* Order summary info */}
                <div className="flex-1 flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-slate-900">{pedido.codigoPedido}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${getStatusColor(pedido.estado)}`}>
                        {getStatusText(pedido.estado)}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${getPayStatusColor(pedido.estadoPago)}`}>
                        {getPayStatusText(pedido.estadoPago)}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mt-1.5">{pedido.cliente.nombre}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-bold">Teléfono: {pedido.cliente.telefono || 'Sin teléfono'}</p>
                    
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                      <span>📍 {pedido.destino}</span>
                      <span className="flex items-center gap-1 font-bold text-slate-700">
                        <Package className="w-3.5 h-3.5 text-emerald-600" />
                        {pedido.items.length} productos ({readyCount} listos)
                      </span>
                    </div>

                    {/* Order items preview pills */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-2xl">
                      {pedido.items.map(item => (
                        <span
                          key={item.id}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                            item.recolectado
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {item.recolectado && '✓ '}
                          {item.cantidadSolicitada}x {item.nombreProducto}
                          {item.variedadTono ? ` (${item.variedadTono})` : ''}
                        </span>
                      ))}
                    </div>

                    {pedido.notas && (
                      <p className="mt-2.5 text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-lg">
                        Nota: {pedido.notas}
                      </p>
                    )}
                  </div>
                </div>

                {/* Assignment and Action block */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                  
                  {/* Assistant Assignment Dropdown */}
                  <div className="flex flex-col gap-1.5 min-w-[190px]">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> Asignado a:
                    </label>
                    <select
                      value={pedido.auxiliarAsignado?.id || ''}
                      onChange={(e) => handleAssignAssistant(pedido.id, e.target.value)}
                      disabled={isCompleted}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 disabled:opacity-60 cursor-pointer"
                    >
                      <option value="">-- Sin asignar --</option>
                      {sortedGroupKeys.map(groupName => (
                        <optgroup key={groupName} label={groupName}>
                          {groupedAssistants[groupName].map(assistant => (
                            <option key={assistant.id} value={assistant.id}>
                              {assistant.nombre}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Main Action buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap gap-2 pt-2 sm:pt-0">
                    
                    {/* Add Item Button for in-progress / pending orders */}
                    {!isCompleted && (
                      <button
                        onClick={() => openAddItemModal(pedido)}
                        className="px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                        title="Agregar más ítems en tiempo real y notificar a bodega"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Ítem
                      </button>
                    )}

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
            );
          })}
        </div>
      )}

      {/* Floating Voice Assistant Action Button */}
      <FloatingVoiceOrderButton onClick={() => setIsVoiceModalOpen(true)} />

      {/* Voice Assistant Modal */}
      <VoiceOrderAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onOrderCreated={handleVoiceOrderCreated}
        assistants={assistants}
      />

      {/* Add Item to In-Progress Order Modal */}
      {isAddItemModalOpen && selectedPedidoForAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-blue-600 uppercase tracking-wider">{selectedPedidoForAdd.codigoPedido}</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full">
                    Tiempo Real
                  </span>
                </div>
                <h3 className="font-black text-base text-slate-900 mt-0.5">Agregar Ítem al Pedido</h3>
                <p className="text-xs text-slate-500 font-medium">Cliente: {selectedPedidoForAdd.cliente.nombre}</p>
              </div>
              <button 
                onClick={() => setIsAddItemModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveAddedItem} className="p-5 overflow-y-auto flex flex-col gap-4">
              
              {/* Product search with ProductSmartAutocomplete */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Producto en Catálogo *
                </label>
                <ProductSmartAutocomplete
                  products={products}
                  selectedProductId={selectedProductId}
                  onSelect={(prod) => setSelectedProductId(prod ? prod.id : '')}
                  placeholder="Escribe flor o producto (ej. Rosas, Girasoles)..."
                  isInvalid={!selectedProductId}
                />
              </div>

              {/* Variety / Tone & Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Variedad / Tono (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Rojo, Blanco, Baby Blue"
                    value={addVariedad}
                    onChange={(e) => setAddVariedad(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-all text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Cantidad Solicitada *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addCantidad}
                    onChange={(e) => setAddCantidad(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] font-semibold text-blue-800 leading-relaxed">
                💡 Al guardar este ítem, el teléfono del auxiliar de bodega vibrará y se actualizará automáticamente en su pantalla de preparación.
              </div>

              {/* Submit Button */}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAddingItem || !selectedProductId}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isAddingItem ? 'Guardando...' : 'Agregar y Notificar'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
