'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Truck,
  Plus,
  PackageCheck,
  Receipt,
  RotateCcw,
  DollarSign,
  AlertTriangle,
  MapPin,
  Clock,
  User,
  ShieldAlert,
  Search,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  Printer,
  Smartphone
} from 'lucide-react';
import { IRuta, IRutaPedido, IRutaStock, IMerma, IRutaAbono, ITruckCargo, ICamion, IGastosDesglose } from '@/types/rutas';
import { createRuta, getRutas, getRutaById, despacharCamion, liquidarRuta, registrarMermaRuta, getRutaLogs, getCamiones, createCamion, deleteCamion, getRutasPredefinidas, createRutaPredefinida, deleteRutaPredefinida, createCediInvoice } from './actions';

interface RutasClientProps {
  dbUser: any;
  initialRoutes: IRuta[];
  initialCamiones: ICamion[];
  initialRutasPredefinidas: { id: string; origen: string; destino: string }[];
  cediProducts: any[];
  cediClients: any[];
  conductors: { id: string; nombre: string }[];
  pendingInvoices: any[];
  defaultSelectedRouteId?: string;
}

export default function RutasClient({
  dbUser,
  initialRoutes,
  initialCamiones,
  initialRutasPredefinidas,
  cediProducts,
  cediClients,
  conductors,
  pendingInvoices,
  defaultSelectedRouteId
}: RutasClientProps) {
  const router = useRouter();
  const [routes, setRoutes] = useState<IRuta[]>(initialRoutes);
  const [camiones, setCamiones] = useState<ICamion[]>(initialCamiones);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(
    defaultSelectedRouteId || (initialRoutes.length > 0 ? initialRoutes[0].id : null)
  );
  const [selectedRoute, setSelectedRoute] = useState<IRuta | null>(
    initialRoutes.find(r => r.id === defaultSelectedRouteId) || (initialRoutes.length > 0 ? initialRoutes[0] : null)
  );
  const [activeTab, setActiveTab] = useState<'operacion' | 'inventario' | 'liquidacion'>('operacion');
  
  // Create Route Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);

  // Predefined Routes List States
  const [rutasPredefinidas, setRutasPredefinidas] = useState(initialRutasPredefinidas);
  const [selectedPredefinedRouteId, setSelectedPredefinedRouteId] = useState('');
  
  // Custom Route Adding States (inline)
  const [isAddingCustomRoute, setIsAddingCustomRoute] = useState(false);
  const [customOrigen, setCustomOrigen] = useState('San Pedro Sula');
  const [customDestino, setCustomDestino] = useState('');

  // Route Despatch Form Fields
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [newCamionPlaca, setNewCamionPlaca] = useState('');
  const [newConductorId, setNewConductorId] = useState('');
  const [newAcompanante, setNewAcompanante] = useState('');
  const [newRutaNombre, setNewRutaNombre] = useState('');
  const [newDock, setNewDock] = useState('Muelle 1');
  const [newCapacidadKilos, setNewCapacidadKilos] = useState('1500');
  const [newVolumenM3, setNewVolumenM3] = useState('12');
  
  // Fondo Inicial breakdown fields
  const [gastosVueltos, setGastosVueltos] = useState('1000');
  const [gastosGasolina, setGastosGasolina] = useState('0');
  const [gastosComida, setGastosComida] = useState('0');
  const [gastosOtros, setGastosOtros] = useState('0');

  // Fleet registry form states
  const [fleetPlaca, setFleetPlaca] = useState('');
  const [fleetConductorId, setFleetConductorId] = useState('');
  const [fleetAcompanante, setFleetAcompanante] = useState('');
  const [fleetCapacidad, setFleetCapacidad] = useState('1500');
  const [fleetVolumen, setFleetVolumen] = useState('12');
  const [fleetFotoUrl, setFleetFotoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [newFotoUrl, setNewFotoUrl] = useState('');

  // Liquidation Gastos Reportados states
  const [liquidGasolina, setLiquidGasolina] = useState('0');
  const [liquidComida, setLiquidComida] = useState('0');
  const [liquidOtros, setLiquidOtros] = useState('0');
  const [liquidVentasContado, setLiquidVentasContado] = useState('0');
  const [gastosExtras, setGastosExtras] = useState<{ concepto: string; monto: number }[]>([]);
  const [newGastoConcepto, setNewGastoConcepto] = useState('');
  const [newGastoMonto, setNewGastoMonto] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'activas' | 'historial'>('activas');

  
  // Selected items for new route cargo/orders
  const [localPendingInvoices, setLocalPendingInvoices] = useState<any[]>(pendingInvoices);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [newInvClienteId, setNewInvClienteId] = useState('');
  const [newInvTotal, setNewInvTotal] = useState('');
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [cargoItems, setCargoItems] = useState<{ productoId: string; cantidad: number }[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Liquidation state
  const [devoluciones, setDevoluciones] = useState<Record<string, number>>({});
  const [efectivoEntregado, setEfectivoEntregado] = useState('');
  const [mermaProduct, setMermaProduct] = useState('');
  const [mermaQty, setMermaQty] = useState('');
  const [mermaMotivo, setMermaMotivo] = useState('Rotura');
  const [routeLogs, setRouteLogs] = useState<any[]>([]);

  // Simulation highlight state for live invoices feed
  const [newInvoiceHighlight, setNewInvoiceHighlight] = useState<string | null>(null);

  // Poll route data every 4 seconds for live updates (Live Invoices Feed & Status Sync)
  useEffect(() => {
    const interval = setInterval(async () => {
      const updatedRoutes = await getRutas();
      setRoutes(updatedRoutes);

      const updatedCamiones = await getCamiones();
      setCamiones(updatedCamiones);

      const updatedPredefined = await getRutasPredefinidas();
      setRutasPredefinidas(updatedPredefined);

      if (selectedRouteId) {
        const updated = await getRutaById(selectedRouteId);
        if (updated) {
          // Check if there is a new invoice to trigger a highlight animation
          if (selectedRoute && updated.pedidos.length > selectedRoute.pedidos.length) {
            const newOrders = updated.pedidos.filter(
              p => !selectedRoute.pedidos.some(sp => sp.facturaId === p.facturaId)
            );
            if (newOrders.length > 0) {
              setNewInvoiceHighlight(newOrders[0].facturaId);
              setTimeout(() => setNewInvoiceHighlight(null), 3000);
            }
          }
          setSelectedRoute(updated);
          const logs = await getRutaLogs(selectedRouteId);
          setRouteLogs(logs);
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedRouteId, selectedRoute]);

  // Load logs on manual select and reset forms
  useEffect(() => {
    if (selectedRouteId) {
      getRutaLogs(selectedRouteId).then(setRouteLogs);
    }
  }, [selectedRouteId]);

  useEffect(() => {
    if (selectedRoute) {
      setLiquidGasolina(selectedRoute.gastosReportados?.gasolina?.toString() || selectedRoute.gastosIniciales?.gasolina?.toString() || '0');
      setLiquidComida(selectedRoute.gastosReportados?.comida?.toString() || selectedRoute.gastosIniciales?.comida?.toString() || '0');
      setLiquidOtros(selectedRoute.gastosReportados?.otros?.toString() || selectedRoute.gastosIniciales?.otros?.toString() || '0');
      setLiquidVentasContado(selectedRoute.ventasContado?.toString() || '0');
      setGastosExtras(selectedRoute.gastosExtras || []);
      setNewGastoConcepto('');
      setNewGastoMonto('');
      setEfectivoEntregado(selectedRoute.efectivoEntregado ? selectedRoute.efectivoEntregado.toString() : '');
      const initialDevs: Record<string, number> = {};
      selectedRoute.inventario.forEach(item => {
        if (item.cantidadDevuelta > 0) {
          initialDevs[item.productoId] = item.cantidadDevuelta;
        }
      });
      setDevoluciones(initialDevs);
    }
  }, [selectedRoute]);

  // Update selected route when routes list changes
  useEffect(() => {
    if (selectedRouteId) {
      const found = routes.find(r => r.id === selectedRouteId);
      if (found) setSelectedRoute(found);
    }
  }, [routes, selectedRouteId]);

  // Metrics for all active trucks
  const activeRoutes = routes.filter(r => r.estado === 'EN_RUTA');
  const inTransitCash = routes.reduce(
    (acc, curr) => acc + (curr.estado === 'EN_RUTA' || curr.estado === 'EN_LIQUIDACION' ? Number(curr.ventasContado) + Number(curr.abonosCxC) : 0),
    0
  );
  const pendingLiquidationCount = routes.filter(r => r.estado === 'EN_LIQUIDACION').length;

  // Handle Dispatch/Salida
  const handleDispatch = async (id: string) => {
    const res = await despacharCamion(id);
    if (res.success) {
      const updated = await getRutas();
      setRoutes(updated);
    }
  };

  // Add Item to Cargo List
  const addCargoItem = (prodId: string) => {
    const exists = cargoItems.some(i => i.productoId === prodId);
    if (exists) return;
    setCargoItems([...cargoItems, { productoId: prodId, cantidad: 10 }]);
  };

  // Remove Item from Cargo List
  const removeCargoItem = (prodId: string) => {
    setCargoItems(cargoItems.filter(i => i.productoId !== prodId));
  };

  // Update Cargo Qty
  const updateCargoQty = (prodId: string, qty: number) => {
    setCargoItems(
      cargoItems.map(i => (i.productoId === prodId ? { ...i, cantidad: Math.max(1, qty) } : i))
    );
  };

  // Handle Create Route Submit
  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamionPlaca || !newConductorId || !newRutaNombre) {
      alert('Por favor llene los campos obligatorios');
      return;
    }

    const condName = conductors.find(c => c.id === newConductorId)?.nombre || 'Conductor';

    const cargamento = cargoItems.map(c => {
      const p = cediProducts.find(cp => cp.id === c.productoId);
      return {
        productoId: c.productoId,
        productoNombre: p?.nombre || 'Producto',
        productoSku: p?.sku || 'FL-000',
        cantidad: c.cantidad
      };
    });

    const pedidos = selectedInvoices.map(id => {
      const inv = pendingInvoices.find(pi => pi.id === id);
      return {
        facturaId: id,
        facturaNumero: inv?.numeroFactura || 'FAC-000',
        clienteNombre: inv?.clienteNombre || 'Cliente',
        totalFactura: inv?.total || 0
      };
    });

    const res = await createRuta({
      camionPlaca: newCamionPlaca,
      conductorId: newConductorId,
      conductorNombre: condName,
      acompanante: newAcompanante || undefined,
      fotoUrl: newFotoUrl || undefined,
      rutaNombre: newRutaNombre,
      dock: newDock,
      capacidadKilos: Number(newCapacidadKilos),
      volumenM3: Number(newVolumenM3),
      gastosIniciales: {
        vueltos: Number(gastosVueltos),
        gasolina: Number(gastosGasolina),
        comida: Number(gastosComida),
        otros: Number(gastosOtros)
      },
      pedidos,
      cargamento
    });

    if (res.success) {
      setIsCreateModalOpen(false);
      // Reset form
      setNewCamionPlaca('');
      setNewConductorId('');
      setNewAcompanante('');
      setNewRutaNombre('');
      setSelectedTruckId('');
      setNewFotoUrl('');
      setGastosVueltos('1000');
      setGastosGasolina('0');
      setGastosComida('0');
      setGastosOtros('0');
      setSelectedPredefinedRouteId('');
      setIsAddingCustomRoute(false);
      setCustomDestino('');
      setSelectedInvoices([]);
      setCargoItems([]);
      
      const updated = await getRutas();
      setRoutes(updated);
      setSelectedRouteId(res.id || null);
    }
  };

  const handleTruckChange = (truckId: string) => {
    setSelectedTruckId(truckId);
    if (truckId === 'OTRO' || !truckId) {
      setNewCamionPlaca('');
      setNewConductorId('');
      setNewCapacidadKilos('1500');
      setNewVolumenM3('12');
      setNewAcompanante('');
      setNewFotoUrl('');
      return;
    }
    const t = camiones.find(c => c.id === truckId);
    if (t) {
      setNewCamionPlaca(t.placa);
      setNewConductorId(t.conductorId);
      setNewCapacidadKilos(t.capacidadKilos.toString());
      setNewVolumenM3(t.volumenM3.toString());
      setNewAcompanante(t.acompanante || '');
      setNewFotoUrl(t.fotoUrl || '');
    }
  };

  const handleCreatePredefinedRoute = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!customDestino) {
      alert('Por favor ingrese el destino.');
      return;
    }
    const formattedRoute = `${customOrigen} ➡️ ${customDestino}`;
    const res = await createRutaPredefinida(customOrigen, customDestino);
    if (res.success) {
      alert('Ruta predefinida registrada con éxito.');
      const updated = await getRutasPredefinidas();
      setRutasPredefinidas(updated);
      setNewRutaNombre(formattedRoute);
      if (res.rutaPredefinida) {
        setSelectedPredefinedRouteId(res.rutaPredefinida.id);
      }
      setIsAddingCustomRoute(false);
      setCustomDestino('');
    } else {
      alert(res.error || 'Error al crear la ruta predefinida.');
    }
  };

  const handleDeletePredefinedRoute = async (id: string) => {
    if (!confirm('¿Seguro que desea eliminar esta ruta predefinida?')) return;
    const res = await deleteRutaPredefinida(id);
    if (res.success) {
      const updated = await getRutasPredefinidas();
      setRutasPredefinidas(updated);
      if (selectedPredefinedRouteId === id) {
        setSelectedPredefinedRouteId('');
        setNewRutaNombre('');
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.publicUrl) {
        setFleetFotoUrl(data.publicUrl);
      } else {
        alert('Error al subir la imagen');
      }
    } catch (err) {
      console.error(err);
      alert('Error en la conexión con el servidor de carga');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateCamion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fleetPlaca || !fleetConductorId) {
      alert('Por favor complete placa y conductor.');
      return;
    }

    const condName = conductors.find(c => c.id === fleetConductorId)?.nombre || 'Conductor';
    const res = await createCamion({
      placa: fleetPlaca,
      conductorId: fleetConductorId,
      conductorNombre: condName,
      acompanante: fleetAcompanante || undefined,
      capacidadKilos: Number(fleetCapacidad),
      volumenM3: Number(fleetVolumen),
      fotoUrl: fleetFotoUrl || undefined
    });

    if (res.success) {
      setFleetPlaca('');
      setFleetConductorId('');
      setFleetAcompanante('');
      setFleetCapacidad('1500');
      setFleetVolumen('12');
      setFleetFotoUrl('');
      alert('Vehículo registrado con éxito.');
      
      const updated = await getCamiones();
      setCamiones(updated);
    } else {
      alert(res.error || 'Error al crear camión');
    }
  };

  const handleDeleteCamion = async (id: string) => {
    if (!confirm('¿Seguro que desea eliminar este camión?')) return;
    const res = await deleteCamion(id);
    if (res.success) {
      const updated = await getCamiones();
      setCamiones(updated);
    }
  };

  // Add Merma to Route
  const handleAddMerma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteId || !mermaProduct || !mermaQty) return;

    const p = cediProducts.find(cp => cp.id === mermaProduct);
    const res = await registrarMermaRuta(selectedRouteId, {
      productoId: mermaProduct,
      productoNombre: p?.nombre || 'Flores',
      cantidad: Number(mermaQty),
      motivo: mermaMotivo
    });

    if (res.success) {
      setMermaQty('');
      const updated = await getRutaById(selectedRouteId);
      if (updated) setSelectedRoute(updated);
    } else {
      alert(res.error || 'Error al registrar merma');
    }
  };

  // Liquidate/Close Route
  const handleLiquidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteId) return;

    const devArray = selectedRoute?.inventario.map(item => ({
      productoId: item.productoId,
      cantidadDevuelta: Number(devoluciones[item.productoId] || 0)
    })) || [];

    const res = await liquidarRuta(selectedRouteId, {
      devoluciones: devArray,
      ventasFacturadas: liquidVentasContado !== '' ? Number(liquidVentasContado) : undefined,
      efectivoEntregado: Number(efectivoEntregado),
      gastosReportados: {
        gasolina: Number(liquidGasolina),
        comida: Number(liquidComida),
        otros: Number(liquidOtros)
      },
      gastosExtras
    });

    if (res.success) {
      alert('Ruta Liquidada Exitosamente. El stock restante ha retornado al CEDI y se han registrado los gastos de viaje.');
      setEfectivoEntregado('');
      setDevoluciones({});
      setLiquidGasolina('0');
      setLiquidComida('0');
      setLiquidOtros('0');
      const updated = await getRutas();
      setRoutes(updated);
    } else {
      alert(res.error || 'Error al liquidar ruta');
    }
  };

  const handleGenerateCediInvoice = async () => {
    if (!newInvClienteId || !newInvTotal) return;
    setIsGeneratingInvoice(true);
    try {
      const res = await createCediInvoice({
        clienteId: newInvClienteId,
        total: Number(newInvTotal)
      });
      if (res.success && res.invoice) {
        setLocalPendingInvoices([res.invoice, ...localPendingInvoices]);
        setSelectedInvoices([...selectedInvoices, res.invoice.id]);
        setIsCreatingInvoice(false);
        setNewInvClienteId('');
        setNewInvTotal('');
      } else {
        alert(res.error || 'Error al generar la factura');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // Dynamic filter products for cargo loading search
  const filteredProducts = cediProducts.filter(p =>
    p.nombre.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Filter out busy trucks & routes that are active
  const activePlates = routes
    .filter(r => r.estado !== 'LIQUIDADA')
    .map(r => r.camionPlaca.toLowerCase());
  const availableCamiones = camiones.filter(c => !activePlates.includes(c.placa.toLowerCase()));

  const activeRouteNames = routes
    .filter(r => r.estado !== 'LIQUIDADA')
    .map(r => r.rutaNombre.toLowerCase().trim());
  const availableRoutes = rutasPredefinidas.filter(
    rp => !activeRouteNames.includes(`${rp.origen} ➡️ ${rp.destino}`.toLowerCase().trim())
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto py-2 animate-in fade-in duration-300">
      
      {/* ─── LIVE METRICS BANNER ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Camiones en Ruta</span>
            <span className="text-2xl font-black text-slate-900">{activeRoutes.length} Activos</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Efectivo en Tránsito</span>
            <span className="text-2xl font-black text-slate-900">L{inTransitCash.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Pendientes de Liquidar</span>
            <span className="text-2xl font-black text-slate-900">{pendingLiquidationCount} Rutas</span>
          </div>
        </div>

      </div>

      {/* ─── MAIN WORKSPACE ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Route Selection Sidebar (3 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900 text-lg">Vehículos en Ruta</h2>
            <div className="flex gap-1.5">
              <button
                onClick={() => setIsFleetModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold px-2.5 py-2 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                Camiones
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold px-2.5 py-2 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Despachar</span>
              </button>
            </div>
          </div>

          {/* TAB SWITCHER: ACTIVAS VS HISTORIAL/CERRADAS */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setSidebarTab('activas')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                sidebarTab === 'activas'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>En Ruta ({routes.filter(r => r.estado !== 'LIQUIDADA').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('historial')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                sidebarTab === 'historial'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cerradas ({routes.filter(r => r.estado === 'LIQUIDADA').length})</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {(sidebarTab === 'activas' ? routes.filter(r => r.estado !== 'LIQUIDADA') : routes.filter(r => r.estado === 'LIQUIDADA')).length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 p-8 rounded-xl text-center text-slate-500">
                <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <span className="text-sm font-semibold">
                  {sidebarTab === 'activas' ? 'No hay camiones en ruta actualmente' : 'No hay historial de rutas cerradas'}
                </span>
              </div>
            ) : (
              (sidebarTab === 'activas' ? routes.filter(r => r.estado !== 'LIQUIDADA') : routes.filter(r => r.estado === 'LIQUIDADA')).map(route => {
                const isSelected = selectedRouteId === route.id;
                const isExpanded = selectedRouteId === route.id || hoveredRouteId === route.id;
                const totalCargado = route.inventario.reduce((acc, curr) => acc + curr.cantidadCargada, 0);
                
                return (
                  <div
                    key={route.id}
                    onMouseEnter={() => setHoveredRouteId(route.id)}
                    onMouseLeave={() => setHoveredRouteId(null)}
                    className="w-full relative py-0.5"
                  >
                    <button
                      onClick={() => {
                        setSelectedRouteId(route.id);
                        setSelectedRoute(route);
                      }}
                      className={`text-left w-full bg-white rounded-2xl border transition-all duration-200 ease-in-out cursor-pointer relative overflow-hidden flex flex-col ${
                        isSelected
                          ? 'border-orange-500 ring-2 ring-orange-500/10 shadow-lg scale-[1.02] p-5'
                          : hoveredRouteId === route.id
                          ? 'border-orange-400 shadow-md scale-[1.01] p-5'
                          : 'border-slate-200 shadow-sm p-4'
                      }`}
                    >
                      {/* TOP ROW: Title and Truck Image */}
                      <div className="flex justify-between items-start w-full relative min-h-[56px]">
                        <div className="flex flex-col gap-1 w-2/3 z-10">
                          <h3 className="font-extrabold text-slate-800 text-sm leading-tight truncate">
                            {route.rutaNombre.split('➡️')[1]?.trim() || route.rutaNombre.split('->')[1]?.trim() || route.rutaNombre}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 tracking-wider">
                              {route.camionPlaca}
                            </span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border uppercase ${
                              route.estado === 'CARGANDO' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              route.estado === 'EN_RUTA' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              route.estado === 'EN_LIQUIDACION' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {route.estado}
                            </span>
                          </div>
                          
                          {/* Driver compact show (only if not expanded) */}
                          {!isExpanded && (
                            <span className="text-[10px] text-slate-500 mt-1 font-medium truncate">
                              Cond: {route.conductorNombre}
                            </span>
                          )}
                        </div>

                        {/* Right aligned truck image */}
                        <div className="absolute right-0 top-0 w-24 h-14 pointer-events-none flex items-center justify-end">
                          <img
                            src={route.fotoUrl || '/camion-reparto-icono.png'}
                            alt="Camión"
                            className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
                          />
                        </div>
                      </div>

                      {/* EXPANDED AREA: Pathway/Timeline and Metrics */}
                      <div className={`transition-all duration-300 ease-in-out overflow-hidden flex flex-col w-full ${
                        isExpanded ? 'max-h-48 opacity-100 mt-3 border-t border-slate-100 pt-3' : 'max-h-0 opacity-0 pointer-events-none'
                      }`}>
                        {/* Pathway Timeline */}
                        <div className="flex flex-col gap-2 relative pl-4 border-l border-dashed border-slate-350 ml-1.5 my-1 text-slate-650">
                          {/* Node 1: Origin */}
                          <div className="relative">
                            <div className="absolute -left-[20px] top-1 w-2 h-2 rounded-full bg-slate-300 border border-white" />
                            <span className="text-[10px] font-bold text-slate-400 block leading-none">ORIGEN</span>
                            <p className="text-[10px] text-slate-700 mt-0.5 leading-none">CEDI Principal ({route.dock || 'Muelle general'})</p>
                          </div>
                          
                          {/* Node 2: Destination */}
                          <div className="relative mt-1">
                            <div className="absolute -left-[20px] top-1 w-2 h-2 rounded-full bg-orange-500 border border-white animate-ping" />
                            <div className="absolute -left-[20px] top-1 w-2 h-2 rounded-full bg-orange-500 border border-white" />
                            <span className="text-[10px] font-bold text-orange-650 block leading-none">DESTINO</span>
                            <p className="text-[10px] text-slate-800 mt-0.5 leading-tight truncate font-semibold">{route.rutaNombre}</p>
                          </div>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2.5 text-[10px] text-slate-500 border-t border-slate-50 pt-2">
                          <div>
                            <span className="font-bold text-slate-400 block uppercase text-[8px]">Conductor</span>
                            <span className="truncate text-slate-700 font-semibold">{route.conductorNombre}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-400 block uppercase text-[8px]">Acompañante</span>
                            <span className="truncate text-slate-700 font-semibold">{route.acompanante || 'Ninguno'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-400 block uppercase text-[8px]">Capacidad Cargada</span>
                            <span className="text-slate-700 font-semibold">{totalCargado} Tallos ({route.capacidadKilos} Kgs)</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-400 block uppercase text-[8px]">Efectivo Inicial</span>
                            <span className="text-emerald-600 font-bold">L{route.efectivoInicial.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Status footer inside card */}
                        <div className="flex items-center justify-between mt-2.5 text-[9px] text-slate-400 font-semibold border-t border-slate-50 pt-1.5">
                          <span>Creado: {new Date(route.createdAt).toLocaleDateString()}</span>
                          <span className="text-orange-500 uppercase tracking-wider">Activo en Ruta</span>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Route Dashboard Panel (8 Cols) */}
        <div className="lg:col-span-8">
          
          {!selectedRoute ? (
            <div className="bg-white border border-slate-200 p-16 rounded-2xl text-center shadow-sm">
              <Truck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-extrabold text-slate-800">Seleccione un Camión</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                Haz clic en cualquiera de los camiones del panel izquierdo para monitorear su inventario, ventas y liquidaciones.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col gap-6 p-6">
              
              {/* HEADER DETAIL */}
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold shrink-0 shadow-inner">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{selectedRoute.camionPlaca}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        selectedRoute.estado === 'CARGANDO' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        selectedRoute.estado === 'EN_RUTA' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        selectedRoute.estado === 'EN_LIQUIDACION' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {selectedRoute.estado}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-lg leading-snug">{selectedRoute.rutaNombre}</h3>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-lg">
                    {selectedRoute.conductorAvatar ? (
                      <img
                        src={selectedRoute.conductorAvatar}
                        alt="Avatar"
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs text-slate-700 font-bold">
                      {selectedRoute.conductorNombre} {selectedRoute.acompanante ? `(Ayud: ${selectedRoute.acompanante})` : ''}
                    </span>
                  </div>

                  {selectedRoute.estado !== 'LIQUIDADA' && (
                    <Link
                      href="/inventario-ventas/rutas/pos-movil"
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>POS Móvil de Ruta</span>
                    </Link>
                  )}

                  {selectedRoute.estado === 'CARGANDO' && (
                    <button
                      onClick={() => handleDispatch(selectedRoute.id)}
                      className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Despachar Ruta
                    </button>
                  )}
                </div>
              </div>

              {/* TABS NAVEGACIÓN */}
              <div className="flex border-b border-slate-150 gap-2">
                <button
                  onClick={() => setActiveTab('operacion')}
                  className={`cursor-pointer px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                    activeTab === 'operacion'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Monitoreo Operación
                </button>
                <button
                  onClick={() => setActiveTab('inventario')}
                  className={`cursor-pointer px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                    activeTab === 'inventario'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Bodega Móvil / Inventario
                </button>
                <button
                  onClick={() => setActiveTab('liquidacion')}
                  className={`cursor-pointer px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                    activeTab === 'liquidacion'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Retorno y Liquidación
                </button>
              </div>

              {/* TAB CONTENT: OPERACION EN VIVO */}
              {activeTab === 'operacion' && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                  
                  {/* TRUCK LOGISTICS AND CARGO GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* TRUCK CARGO GRID (Visual) */}
                    <div className="md:col-span-8 flex flex-col gap-4 border border-slate-200 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Esquema Físico de Carga (Bahías)</span>
                        <span className="text-[10px] text-slate-400 font-bold">Capacidad: {selectedRoute.capacidadKilos} Kgs / {selectedRoute.volumenM3} m³</span>
                      </div>

                      {/* Interactive Truck container */}
                      <div className="relative border border-slate-100 rounded-xl bg-slate-50/50 p-4 overflow-x-auto min-h-[180px] flex items-center justify-center">
                        <div className="flex items-center gap-6 min-w-[500px]">
                          {/* Driver Cab side view */}
                          <div className="w-28 flex flex-col items-center gap-2">
                            <img
                              src="/camion-reparto-icono.png"
                              alt="Cabina"
                              className="w-20 object-contain brightness-95 opacity-80"
                            />
                            <div className="bg-slate-200 border border-slate-300 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600">
                              CABINA
                            </div>
                          </div>

                          {/* Cargo space (Grid) */}
                          <div className="flex-1 bg-white border border-slate-300 rounded-lg p-2 grid grid-cols-3 gap-2 relative">
                            {['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].map(bay => {
                              const item = selectedRoute.cargoGrid.find(g => g.bahia === bay);
                              return (
                                <div
                                  key={bay}
                                  className={`h-14 border rounded-lg flex flex-col items-center justify-center p-1 text-center transition-all ${
                                    item
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                                      : 'bg-slate-50 border-slate-200 border-dashed text-slate-400'
                                  }`}
                                  title={item ? `${item.contenido} (${bay})` : `Bahía libre (${bay})`}
                                >
                                  <span className="text-[9px] font-black uppercase tracking-wider block block">{bay}</span>
                                  {item ? (
                                    <span className="text-[10px] font-bold truncate w-full max-w-[80px] block mt-0.5">
                                      {item.facturaNumero || item.contenido}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-semibold text-slate-300">Vacío</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LIVE INVOICES FEED (Ventas en Ruta) */}
                    <div className="md:col-span-4 flex flex-col gap-4 border border-slate-200 p-4 rounded-xl max-h-[300px] overflow-y-auto">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                          Facturas en Vivo
                        </span>
                        <span className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-600">
                          {selectedRoute.pedidos.filter(p => p.formaPago).length} Ventas
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        {selectedRoute.pedidos.filter(p => p.formaPago).length === 0 ? (
                          <div className="text-center text-slate-400 text-xs py-8 font-medium">
                            Sin transacciones emitidas aún en ruta.
                          </div>
                        ) : (
                          selectedRoute.pedidos
                            .filter(p => p.formaPago)
                            .map(p => {
                              const isHighlight = newInvoiceHighlight === p.facturaId;
                              return (
                                <div
                                  key={p.id}
                                  className={`p-2.5 rounded-lg border transition-all ${
                                    isHighlight 
                                      ? 'bg-green-100 border-green-400 ring-2 ring-green-300/30 scale-102 animate-bounce' 
                                      : 'bg-slate-50 border-slate-150'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-800">{p.facturaNumero}</span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                      {p.entregadoAt ? new Date(p.entregadoAt).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-600 truncate mt-0.5">
                                    {p.clienteNombre}
                                  </p>
                                  <div className="flex items-center justify-between mt-1 text-[10px] font-black">
                                    <span className="text-emerald-700">L{p.totalFactura.toFixed(2)}</span>
                                    <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded uppercase">
                                      {p.formaPago}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>

                  </div>

                  {/* OPERATION LOG AND SHIPMENTS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                    
                    {/* Log of activities */}
                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Bitácora de Carga y Ruta</span>
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 max-h-[220px] overflow-y-auto flex flex-col gap-3">
                        {routeLogs.length === 0 ? (
                          <span className="text-slate-400 text-xs py-4 text-center font-medium">No hay logs registrados</span>
                        ) : (
                          routeLogs.map((log, idx) => (
                            <div key={idx} className="flex gap-3 text-xs">
                              <div className="flex flex-col items-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-100 shrink-0"></div>
                                {idx < routeLogs.length - 1 && <div className="w-[1.5px] bg-slate-200 flex-1 my-1"></div>}
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  {new Date(log.timestamp).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })} - {log.accion}
                                </span>
                                <p className="text-slate-700 font-medium mt-0.5">{log.detalle}</p>
                                <span className="text-[9px] text-slate-400 font-bold block mt-0.2">Usuario: {log.usuarioNombre}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Shipments / Pre-loaded orders */}
                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Órdenes / Pedidos Asignados</span>
                      <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
                        {selectedRoute.pedidos.map(p => (
                          <div key={p.id} className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-900">{p.facturaNumero}</span>
                                {p.totalFactura > 4000 ? (
                                  <span className="bg-rose-50 text-rose-700 text-[8px] font-black px-1.5 rounded uppercase">Cliente Especial</span>
                                ) : (
                                  <span className="bg-slate-50 text-slate-600 text-[8px] font-black px-1.5 rounded uppercase">Standard</span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-600 font-bold truncate block mt-0.5">{p.clienteNombre}</span>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-xs font-bold text-slate-800">L{p.totalFactura.toFixed(2)}</span>
                              <span className={`text-[10px] font-bold ${
                                p.estadoEntrega === 'PENDIENTE' ? 'text-amber-600' :
                                p.estadoEntrega === 'ENTREGADO' ? 'text-green-600' : 'text-rose-600'
                              }`}>
                                {p.estadoEntrega}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* TAB CONTENT: BODEGA MOVIL / INVENTARIO */}
              {activeTab === 'inventario' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Stock Cargado en el Vehículo</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                      Bodega: BODEGA-{selectedRoute.camionPlaca}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <th className="p-3">SKU</th>
                          <th className="p-3">Producto</th>
                          <th className="p-3 text-center">Cargado</th>
                          <th className="p-3 text-center">Pedidos</th>
                          <th className="p-3 text-center">Autoventa</th>
                          <th className="p-3 text-center">Mermas</th>
                          <th className="p-3 text-center">Disponible</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRoute.inventario.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400 font-medium">No hay mercancías cargadas</td>
                          </tr>
                        ) : (
                          selectedRoute.inventario.map(item => {
                            const disponible = item.cantidadCargada - (item.cantidadVendida + item.cantidadEntregada + item.cantidadMerma);
                            return (
                              <tr key={item.id} className="border-b border-slate-150 hover:bg-slate-50/50">
                                <td className="p-3 font-mono font-bold text-slate-800">{item.productoSku}</td>
                                <td className="p-3 font-semibold text-slate-700">{item.productoNombre}</td>
                                <td className="p-3 text-center font-bold text-slate-900 bg-slate-50/50">{item.cantidadCargada}</td>
                                <td className="p-3 text-center text-blue-600 font-medium">{item.cantidadEntregada}</td>
                                <td className="p-3 text-center text-emerald-600 font-medium">{item.cantidadVendida}</td>
                                <td className="p-3 text-center text-rose-600 font-medium">{item.cantidadMerma}</td>
                                <td className="p-3 text-center font-black bg-emerald-50 text-emerald-800">{disponible}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: RETORNO Y LIQUIDACION */}
              {activeTab === 'liquidacion' && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                  
                  {selectedRoute.estado === 'LIQUIDADA' ? (
                    <div className="border border-emerald-200 bg-white p-6 sm:p-8 rounded-2xl flex flex-col gap-6 shadow-sm">
                      
                      {/* Success Banner */}
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between gap-4 print:hidden">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-emerald-950 text-base">Ruta Liquidada y Cerrada Exitosamente</h4>
                            <p className="text-xs text-emerald-800 font-semibold">
                              Cerrada el {selectedRoute.fechaRetorno ? new Date(selectedRoute.fechaRetorno).toLocaleString('es-HN') : new Date().toLocaleString('es-HN')}. El inventario devuelto retornó al CEDI.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 shrink-0"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Imprimir Comprobante</span>
                        </button>
                      </div>

                      {/* PRINTABLE COMPROBANTE OFICIAL */}
                      <div className="border border-slate-200 rounded-2xl p-6 flex flex-col gap-6 bg-white">
                        
                        {/* Header Document */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-widest block">Distribuidora Paraíso Floral</span>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Comprobante de Liquidación de Despacho</h2>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">{selectedRoute.rutaNombre}</p>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 block sm:inline-block">
                              Placa: {selectedRoute.camionPlaca}
                            </span>
                            <p className="text-[11px] text-slate-400 font-bold mt-1">
                              Fecha: {selectedRoute.fechaRetorno ? new Date(selectedRoute.fechaRetorno).toLocaleDateString('es-HN') : new Date().toLocaleDateString('es-HN')}
                            </p>
                          </div>
                        </div>

                        {/* Info Drivers Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl text-xs font-semibold">
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold block">Conductor</span>
                            <span className="text-slate-900 font-extrabold">{selectedRoute.conductorNombre}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold block">Acompañante</span>
                            <span className="text-slate-800">{selectedRoute.acompanante || 'Sin auxiliar'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold block">Fecha Salida</span>
                            <span className="text-slate-800">{selectedRoute.fechaSalida ? new Date(selectedRoute.fechaSalida).toLocaleDateString('es-HN') : '31/08/2026'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold block">Total Cargado</span>
                            <span className="text-emerald-800 font-black">{selectedRoute.inventario.reduce((a, b) => a + b.cantidadCargada, 0)} Paquetes</span>
                          </div>
                        </div>

                        {/* Financial Table & Viáticos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* Financial Summary */}
                          <div className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2.5">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                              Resumen Financiero y Cuadre
                            </span>
                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                              <span>(+) Fondo Inicial de Ruta:</span>
                              <span className="font-bold text-slate-900">L. {selectedRoute.efectivoInicial.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                              <span>(+) Ventas Facturadas / Contado:</span>
                              <span className="font-bold text-emerald-700">+ L. {selectedRoute.ventasContado.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                              <span>(+) Recaudación CxC Abonos:</span>
                              <span className="font-bold text-emerald-700">+ L. {selectedRoute.abonosCxC.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                              <span>(-) Total Viáticos y Gastos:</span>
                              <span className="font-bold text-rose-600">
                                - L. {(Number(selectedRoute.gastosReportados?.gasolina || 0) + Number(selectedRoute.gastosReportados?.comida || 0) + Number(selectedRoute.gastosReportados?.otros || 0) + (selectedRoute.gastosExtras || []).reduce((a, b) => a + Number(b.monto), 0)).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs font-extrabold text-slate-900 border-t border-slate-200 pt-2">
                              <span>(=) Total Efectivo Esperado:</span>
                              <span>
                                L. {(selectedRoute.efectivoInicial + selectedRoute.ventasContado + selectedRoute.abonosCxC - (Number(selectedRoute.gastosReportados?.gasolina || 0) + Number(selectedRoute.gastosReportados?.comida || 0) + Number(selectedRoute.gastosReportados?.otros || 0) + (selectedRoute.gastosExtras || []).reduce((a, b) => a + Number(b.monto), 0))).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs font-black text-slate-900 bg-slate-50 p-2 rounded-lg">
                              <span>Efectivo Físico Entregado:</span>
                              <span className="text-emerald-700 font-black">L. {selectedRoute.efectivoEntregado.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-200">
                              <span className={selectedRoute.diferenciaFinanciera >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                {selectedRoute.diferenciaFinanciera === 0 ? 'Diferencia (Cuadre Exacto):' : selectedRoute.diferenciaFinanciera > 0 ? 'Sobrante en Caja:' : 'Faltante en Caja:'}
                              </span>
                              <span className={selectedRoute.diferenciaFinanciera >= 0 ? 'text-emerald-700 font-black' : 'text-rose-700 font-black'}>
                                L. {selectedRoute.diferenciaFinanciera.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Viáticos Breakdown */}
                          <div className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2.5">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                              Desglose de Viáticos Reportados
                            </span>
                            <div className="flex justify-between text-xs text-slate-600 font-semibold">
                              <span>Gasolina:</span>
                              <span className="font-bold text-slate-900">L. {(selectedRoute.gastosReportados?.gasolina || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-600 font-semibold">
                              <span>Comida / Alimentación:</span>
                              <span className="font-bold text-slate-900">L. {(selectedRoute.gastosReportados?.comida || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-600 font-semibold">
                              <span>Otros Gastos / Peajes:</span>
                              <span className="font-bold text-slate-900">L. {(selectedRoute.gastosReportados?.otros || 0).toFixed(2)}</span>
                            </div>
                            {(selectedRoute.gastosExtras || []).map((g, idx) => (
                              <div key={idx} className="flex justify-between text-xs text-slate-600 font-semibold">
                                <span>{g.concepto}:</span>
                                <span className="font-bold text-slate-900">L. {Number(g.monto).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                        </div>

                        {/* Inventory Table Reconcile */}
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Auditoría de Mercancía y Retorno a CEDI
                          </span>
                          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-100 font-black text-slate-700 border-b border-slate-200 text-[11px]">
                                  <th className="p-2.5">SKU</th>
                                  <th className="p-2.5">Producto</th>
                                  <th className="p-2.5 text-center">Cargado</th>
                                  <th className="p-2.5 text-center">Vendido</th>
                                  <th className="p-2.5 text-center">Merma</th>
                                  <th className="p-2.5 text-center font-black text-emerald-800 bg-emerald-50">Devuelto a CEDI</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150 font-semibold text-slate-700">
                                {selectedRoute.inventario.map(item => (
                                  <tr key={item.id}>
                                    <td className="p-2 font-mono font-bold text-slate-900">{item.productoSku}</td>
                                    <td className="p-2">{item.productoNombre}</td>
                                    <td className="p-2 text-center font-bold text-slate-900">{item.cantidadCargada}</td>
                                    <td className="p-2 text-center text-blue-700 font-bold">{item.cantidadVendida + item.cantidadEntregada}</td>
                                    <td className="p-2 text-center text-rose-600">{item.cantidadMerma}</td>
                                    <td className="p-2 text-center font-black text-emerald-900 bg-emerald-50/60">{item.cantidadDevuelta}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Signatures for Print */}
                        <div className="grid grid-cols-2 gap-12 pt-12 pb-4 mt-6 border-t border-slate-200 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-48 border-t-2 border-slate-400 mb-1.5" />
                            <span className="text-xs font-bold text-slate-800">Firma del Conductor / Vendedor</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{selectedRoute.conductorNombre}</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-48 border-t-2 border-slate-400 mb-1.5" />
                            <span className="text-xs font-bold text-slate-800">Recibido Conforme / Administración</span>
                            <span className="text-[10px] text-slate-400 font-semibold">CEDI Paraíso Floral</span>
                          </div>
                        </div>

                      </div>

                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      
                      {/* LEFT: Reconcile Form (8 Cols) */}
                      <div className="md:col-span-8 flex flex-col gap-6">
                        
                        {/* Physical Count Table */}
                        <div className="flex flex-col gap-3">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">1. Conteo de Retorno y Devoluciones a CEDI</span>
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                  <th className="p-3">SKU</th>
                                  <th className="p-3">Producto</th>
                                  <th className="p-3 text-center">Cargado</th>
                                  <th className="p-3 text-center">Vendido</th>
                                  <th className="p-3 text-center">Merma</th>
                                  <th className="p-3 text-center w-24">Retorno Real</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedRoute.inventario.map(item => {
                                  const esperado = item.cantidadCargada - (item.cantidadVendida + item.cantidadEntregada + item.cantidadMerma);
                                  return (
                                    <tr key={item.id} className="border-b border-slate-150">
                                      <td className="p-3 font-mono font-bold text-slate-800">{item.productoSku}</td>
                                      <td className="p-3 font-semibold text-slate-700">{item.productoNombre}</td>
                                      <td className="p-3 text-center font-bold text-slate-900">{item.cantidadCargada}</td>
                                      <td className="p-3 text-center text-slate-500">{item.cantidadVendida + item.cantidadEntregada}</td>
                                      <td className="p-3 text-center text-rose-500">{item.cantidadMerma}</td>
                                      <td className="p-3">
                                        <input
                                          type="number"
                                          min={0}
                                          max={item.cantidadCargada}
                                          value={devoluciones[item.productoId] !== undefined ? devoluciones[item.productoId] : esperado}
                                          onFocus={(e) => e.target.select()}
                                          onChange={(e) => setDevoluciones({
                                            ...devoluciones,
                                            [item.productoId]: Number(e.target.value)
                                          })}
                                          className="w-full border border-slate-350 bg-white rounded-lg p-1.5 text-center font-bold text-slate-800 no-spin"
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Merma and damage registration */}
                        <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl flex flex-col gap-4">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            Reportar Merma / Tallo Dañado en Carretera
                          </span>
                          
                          <form onSubmit={handleAddMerma} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            <div className="sm:col-span-5 flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-500">Producto</label>
                              <select
                                value={mermaProduct}
                                onChange={(e) => setMermaProduct(e.target.value)}
                                className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                                required
                              >
                                <option value="">Seleccione...</option>
                                {selectedRoute.inventario.map(item => (
                                  <option key={item.productoId} value={item.productoId}>{item.productoNombre}</option>
                                ))}
                              </select>
                            </div>

                            <div className="sm:col-span-2 flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-500">Tallos</label>
                              <input
                                type="number"
                                min={1}
                                value={mermaQty}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => setMermaQty(e.target.value)}
                                className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold text-center no-spin"
                                required
                              />
                            </div>

                            <div className="sm:col-span-3 flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-500">Motivo</label>
                              <select
                                value={mermaMotivo}
                                onChange={(e) => setMermaMotivo(e.target.value)}
                                className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                              >
                                <option value="Rotura">Rotura / Maltrato</option>
                                <option value="Calentamiento">Calor / Deshidratación</option>
                                <option value="Plaga">Enfermo / Hongo</option>
                              </select>
                            </div>

                            <div className="sm:col-span-2">
                              <button
                                type="submit"
                                className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold p-2.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Agregar
                              </button>
                            </div>
                          </form>

                          {/* Merma List */}
                          {selectedRoute.mermas.length > 0 && (
                            <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">Mermas reportadas en esta ruta:</span>
                              <div className="flex flex-wrap gap-2">
                                {selectedRoute.mermas.map((m, idx) => (
                                  <span key={idx} className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-1 rounded-full">
                                    {m.productoNombre} ({m.cantidad} tallos) - {m.motivo}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* RIGHT: Financial Closing & Action (4 Cols) */}
                      <div className="md:col-span-4 flex flex-col gap-4">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">2. Cuadre de Caja</span>
                        
                        <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col gap-3 shadow-sm">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                            <span>Efectivo Inicial (Fondo):</span>
                            <span>L{selectedRoute.efectivoInicial.toFixed(2)}</span>
                          </div>
                          
                          {/* Ventas Contado / Facturadas Editable */}
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                            <div>
                              <span className="block text-emerald-900 font-extrabold">Ventas Facturadas / Contado:</span>
                              <span className="text-[9px] text-slate-400">Total cobrado en ruta</span>
                            </div>
                            <div className="relative w-28">
                              <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-slate-400">L</span>
                              <input
                                type="number"
                                value={liquidVentasContado}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => setLiquidVentasContado(e.target.value)}
                                className="w-full border border-emerald-300 bg-white rounded pl-6 pr-2 py-1 text-xs font-black text-right text-emerald-800 no-spin"
                                min={0}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span>Recaudación CxC Abonos:</span>
                            <span className="text-emerald-700">+ L{selectedRoute.abonosCxC.toFixed(2)}</span>
                          </div>

                          {/* Gastos Reportados (Viáticos gastados) */}
                          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col gap-2 my-1">
                            <span className="text-[10px] font-black text-slate-650 uppercase tracking-wider block">Desglose de Gastos en Ruta (Viáticos)</span>
                            
                            <div className="flex flex-col gap-2">
                              {/* Gasoline row */}
                              <div className="flex items-center justify-between gap-3 bg-white p-2 rounded border border-slate-150">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-700 uppercase">Gasolina Real</span>
                                  <span className="text-[8px] text-slate-400">Asignado: L{selectedRoute.gastosIniciales?.gasolina || 0}</span>
                                </div>
                                <div className="relative w-28">
                                  <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-slate-400">L</span>
                                  <input
                                    type="number"
                                    value={liquidGasolina}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setLiquidGasolina(e.target.value)}
                                    className="w-full border border-slate-300 bg-white rounded pl-6 pr-2 py-1 text-xs font-bold text-right no-spin"
                                    min={0}
                                  />
                                </div>
                              </div>

                              {/* Comida row */}
                              <div className="flex items-center justify-between gap-3 bg-white p-2 rounded border border-slate-150">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-700 uppercase">Comida Real</span>
                                  <span className="text-[8px] text-slate-400">Asignado: L{selectedRoute.gastosIniciales?.comida || 0}</span>
                                </div>
                                <div className="relative w-28">
                                  <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-slate-400">L</span>
                                  <input
                                    type="number"
                                    value={liquidComida}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setLiquidComida(e.target.value)}
                                    className="w-full border border-slate-300 bg-white rounded pl-6 pr-2 py-1 text-xs font-bold text-right no-spin"
                                    min={0}
                                  />
                                </div>
                              </div>

                              {/* Otros row */}
                              <div className="flex items-center justify-between gap-3 bg-white p-2 rounded border border-slate-150">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-700 uppercase">Otros Gastos Real</span>
                                  <span className="text-[8px] text-slate-400">Asignado: L{selectedRoute.gastosIniciales?.otros || 0}</span>
                                </div>
                                <div className="relative w-28">
                                  <span className="absolute left-2.5 top-1.5 text-[10px] font-bold text-slate-400">L</span>
                                  <input
                                    type="number"
                                    value={liquidOtros}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setLiquidOtros(e.target.value)}
                                    className="w-full border border-slate-300 bg-white rounded pl-6 pr-2 py-1 text-xs font-bold text-right no-spin"
                                    min={0}
                                  />
                                </div>
                              </div>

                              {/* Dynamic Extra Gastos Rows */}
                              {gastosExtras.map((g, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-3 bg-white p-2 rounded border border-slate-150 animate-in fade-in duration-200">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-700 uppercase">{g.concepto}</span>
                                    <span className="text-[8px] text-slate-400">Gasto Extra</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800">L{g.monto.toFixed(2)}</span>
                                    <button
                                      type="button"
                                      onClick={() => setGastosExtras(gastosExtras.filter((_, i) => i !== idx))}
                                      className="text-rose-600 hover:bg-rose-50 p-1.5 rounded cursor-pointer"
                                      title="Eliminar gasto"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {/* Input Form for adding Extra Gasto */}
                              <div className="flex gap-1.5 items-center border-t border-slate-200 pt-2.5 mt-1">
                                <input
                                  type="text"
                                  placeholder="Concepto Extra (ej. Peaje)"
                                  value={newGastoConcepto}
                                  onChange={(e) => setNewGastoConcepto(e.target.value)}
                                  className="border border-slate-350 bg-white rounded p-1.5 text-[11px] font-semibold flex-1 min-w-0 font-bold text-slate-700"
                                />
                                <div className="relative w-20 shrink-0">
                                  <span className="absolute left-1.5 top-1.5 text-[10px] font-bold text-slate-400">L</span>
                                  <input
                                    type="number"
                                    placeholder="Monto"
                                    value={newGastoMonto}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setNewGastoMonto(e.target.value)}
                                    className="w-full border border-slate-350 bg-white rounded pl-4 pr-1 py-1.5 text-[11px] font-bold text-right no-spin"
                                    min={0}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!newGastoConcepto || !newGastoMonto) return;
                                    setGastosExtras([...gastosExtras, { concepto: newGastoConcepto, monto: Number(newGastoMonto) }]);
                                    setNewGastoConcepto('');
                                    setNewGastoMonto('');
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1.5 rounded cursor-pointer shrink-0"
                                  title="Agregar Gasto Extra"
                                >
                                  +
                                </button>
                              </div>

                            </div>
                          </div>

                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span>(-) Gastos/Viáticos Reales:</span>
                            <span className="text-rose-600">
                              - L{(Number(liquidGasolina) + Number(liquidComida) + Number(liquidOtros) + gastosExtras.reduce((acc, curr) => acc + curr.monto, 0)).toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-xs font-black text-slate-900 border-t border-slate-100 pt-3">
                            <span>Total Efectivo Esperado:</span>
                            <span className="text-brand-600 text-sm">
                              L{(selectedRoute.efectivoInicial + Number(liquidVentasContado || 0) + selectedRoute.abonosCxC - (Number(liquidGasolina) + Number(liquidComida) + Number(liquidOtros) + gastosExtras.reduce((acc, curr) => acc + curr.monto, 0))).toFixed(2)}
                            </span>
                          </div>

                          {/* Counting Input */}
                          <form onSubmit={handleLiquidate} className="flex flex-col gap-3 mt-3 border-t border-slate-200 pt-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Efectivo Físico Entregado por Vendedor</label>
                              <div className="relative">
                                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={efectivoEntregado}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => setEfectivoEntregado(e.target.value)}
                                  className="w-full border border-slate-350 bg-white rounded-lg p-2 pl-8 font-black text-lg text-slate-900 no-spin"
                                  required
                                  min={0}
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black text-sm py-3 px-4 rounded-xl mt-2 transition-colors cursor-pointer shadow-md shadow-brand-500/10 active:scale-[0.99]"
                            >
                              Finalizar y Cerrar Despacho de Ruta
                            </button>
                          </form>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* ─── MODAL: DESPACHAR CAMIÓN / NUEVA RUTA ────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-brand-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Carga y Despacho de Ruta</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateRoute} className="p-6 flex flex-col gap-6">
              
              {/* Row 1: Truck selection and auto-fill */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Seleccionar Camión</label>
                  <select
                    value={selectedTruckId}
                    onChange={(e) => handleTruckChange(e.target.value)}
                    className="w-full border border-emerald-300 bg-white rounded-lg p-2 text-xs font-bold"
                    required
                  >
                    <option value="">Seleccione un Camión...</option>
                    {availableCamiones.map(c => (
                      <option key={c.id} value={c.id}>{c.placa} ({c.conductorNombre})</option>
                    ))}
                    <option value="OTRO">Otro / Ingreso Manual...</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Placa Camión</label>
                  <input
                    type="text"
                    placeholder="ej. TRC-204"
                    value={newCamionPlaca}
                    onChange={(e) => setNewCamionPlaca(e.target.value.toUpperCase())}
                    className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Conductor / Vendedor</label>
                  <select
                    value={newConductorId}
                    onChange={(e) => setNewConductorId(e.target.value)}
                    className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                    required
                  >
                    <option value="">Seleccione...</option>
                    {conductors.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Acompañante / Ayudante</label>
                  <input
                    type="text"
                    placeholder="Nombre del ayudante"
                    value={newAcompanante}
                    onChange={(e) => setNewAcompanante(e.target.value)}
                    className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                  />
                </div>

              </div>

              {/* Row 2: Route, dock and capacity metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Ruta / Destino</label>
                  {!isAddingCustomRoute ? (
                    <select
                      value={selectedPredefinedRouteId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedPredefinedRouteId(val);
                        if (val === 'NUEVA') {
                          setIsAddingCustomRoute(true);
                          setNewRutaNombre('');
                        } else {
                          const found = rutasPredefinidas.find(r => r.id === val);
                          setNewRutaNombre(found ? `${found.origen} ➡️ ${found.destino}` : '');
                        }
                      }}
                      className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                      required
                    >
                      <option value="">Seleccione Ruta...</option>
                      {availableRoutes.map(rp => (
                        <option key={rp.id} value={rp.id}>
                          {rp.origen} ➡️ {rp.destino}
                        </option>
                      ))}
                      <option value="NUEVA" className="text-emerald-700 font-bold">+ Registrar Nueva Ruta...</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Origen"
                        value={customOrigen}
                        onChange={(e) => setCustomOrigen(e.target.value)}
                        className="border border-slate-350 bg-white rounded-lg p-1.5 text-xs font-bold w-1/3"
                      />
                      <span className="text-slate-400 text-[10px]">➡️</span>
                      <input
                        type="text"
                        placeholder="Destino"
                        value={customDestino}
                        onChange={(e) => setCustomDestino(e.target.value)}
                        className="border border-slate-350 bg-white rounded-lg p-1.5 text-xs font-bold flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleCreatePredefinedRoute}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] px-2 py-1.5 rounded cursor-pointer shrink-0"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomRoute(false);
                          setSelectedPredefinedRouteId('');
                          setNewRutaNombre('');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9px] px-2 py-1.5 rounded cursor-pointer shrink-0"
                      >
                        X
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Muelle Carga</label>
                  <input
                    type="text"
                    value={newDock}
                    onChange={(e) => setNewDock(e.target.value)}
                    className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Kilos Máx</label>
                    <input
                      type="number"
                      value={newCapacidadKilos}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewCapacidadKilos(e.target.value)}
                      className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold text-center no-spin"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Vol (m³)</label>
                    <input
                      type="number"
                      value={newVolumenM3}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewVolumenM3(e.target.value)}
                      className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold text-center no-spin"
                    />
                  </div>
                </div>

              </div>

              {/* Row 3: Fondo Inicial y Desglose de Gastos/Viáticos */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-3">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                  <span>Desglose de Fondo Inicial (Vueltos y Viáticos)</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-black border border-emerald-150">
                    Total Caja: L{(Number(gastosVueltos) + Number(gastosGasolina) + Number(gastosComida) + Number(gastosOtros)).toLocaleString()}
                  </span>
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Caja Vueltos (Sencillo)</label>
                    <input
                      type="number"
                      value={gastosVueltos}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setGastosVueltos(e.target.value)}
                      className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold text-center no-spin"
                      min={0}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Viático Gasolina</label>
                    <input
                      type="number"
                      value={gastosGasolina}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setGastosGasolina(e.target.value)}
                      className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold text-center no-spin"
                      min={0}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Viático Comida</label>
                    <input
                      type="number"
                      value={gastosComida}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setGastosComida(e.target.value)}
                      className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold text-center no-spin"
                      min={0}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Otros Gastos Ruta</label>
                    <input
                      type="number"
                      value={gastosOtros}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setGastosOtros(e.target.value)}
                      className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold text-center no-spin"
                      min={0}
                    />
                  </div>
                </div>
              </div>

              {/* Loader layout: Left Cargo Qty / Right Orders to Deliver */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 border-t border-slate-100 pt-6">
                
                {/* LEFT CARGO LOADING SELECTOR */}
                <div className="md:col-span-7 flex flex-col gap-3">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Bodega Móvil: Flores y Follajes a Cargar</span>
                  
                  {/* Search and item selection */}
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar flores en CEDI..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full border border-slate-350 bg-white rounded-lg p-2 pl-8 text-xs font-bold"
                      />
                    </div>

                    <div className="border border-slate-150 rounded-lg max-h-[140px] overflow-y-auto flex flex-col divide-y divide-slate-100">
                      {filteredProducts.map(p => {
                        const isLoaded = cargoItems.some(item => item.productoId === p.id);
                        return (
                          <div key={p.id} className="p-2.5 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-mono font-bold text-slate-800 mr-2">{p.sku}</span>
                              <span className="font-semibold text-slate-600">{p.nombre}</span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Stock CEDI: {p.stockActual}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => addCargoItem(p.id)}
                              disabled={isLoaded || p.stockActual <= 0}
                              className={`text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer ${
                                isLoaded ? 'bg-slate-100 text-slate-400' :
                                p.stockActual <= 0 ? 'bg-slate-50 text-slate-300' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {isLoaded ? 'Cargado' : 'Añadir'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Loaded items configuration */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <th className="p-2">Producto</th>
                          <th className="p-2 text-center w-24">Cantidad</th>
                          <th className="p-2 text-center w-12">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cargoItems.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-slate-400 font-medium">Ningún producto seleccionado para carga</td>
                          </tr>
                        ) : (
                          cargoItems.map(item => {
                            const p = cediProducts.find(cp => cp.id === item.productoId);
                            return (
                              <tr key={item.productoId} className="border-b border-slate-150">
                                <td className="p-2">
                                  <span className="font-bold text-slate-700">{p?.nombre}</span>
                                  <span className="text-[9px] text-slate-400 font-semibold block">CEDI: {p?.stockActual}</span>
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    min={1}
                                    max={p?.stockActual || 9999}
                                    value={item.cantidad}
                                    onChange={(e) => updateCargoQty(item.productoId, Number(e.target.value))}
                                    className="w-full border border-slate-350 bg-white rounded p-1 text-center font-bold text-slate-800"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeCargoItem(item.productoId)}
                                    className="text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RIGHT ORDERS ASSIGNMENT */}
                <div className="md:col-span-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Órdenes a Entregar en la Ruta</span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingInvoice(!isCreatingInvoice)}
                      className="text-emerald-700 hover:text-emerald-950 hover:bg-emerald-50 px-2 py-1 rounded text-[10px] font-black border border-emerald-250 cursor-pointer"
                    >
                      {isCreatingInvoice ? 'Cancelar' : '+ Generar Factura'}
                    </button>
                  </div>

                  {/* Create New Invoice Inline Form */}
                  {isCreatingInvoice && (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-200">
                      <span className="text-[10px] font-black text-slate-700 uppercase">Nueva Factura Pendiente</span>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Cliente CEDI</label>
                        <select
                          value={newInvClienteId}
                          onChange={(e) => setNewInvClienteId(e.target.value)}
                          className="w-full border border-slate-300 bg-white rounded p-1.5 text-xs font-bold text-slate-700"
                        >
                          <option value="">Seleccione Cliente...</option>
                          {cediClients.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase">Monto Total Factura</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-400">L</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={newInvTotal}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setNewInvTotal(e.target.value)}
                            className="w-full border border-slate-300 bg-white rounded pl-6 pr-2 py-1.5 text-xs font-bold text-right no-spin"
                            min={0}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateCediInvoice}
                        disabled={isGeneratingInvoice || !newInvClienteId || !newInvTotal}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-2 rounded transition-colors cursor-pointer"
                      >
                        {isGeneratingInvoice ? 'Generando...' : 'Crear y Asignar Factura'}
                      </button>
                    </div>
                  )}

                  {/* Search Box */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar factura por número o cliente..."
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="w-full border border-slate-300 bg-white rounded-lg p-2 pl-8 text-xs font-bold text-slate-700 placeholder-slate-400"
                    />
                  </div>
                  
                  <div className="border border-slate-200 rounded-xl p-3 flex flex-col gap-2 max-h-[290px] overflow-y-auto">
                    {localPendingInvoices.filter(inv =>
                      inv.numeroFactura.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                      inv.clienteNombre.toLowerCase().includes(invoiceSearch.toLowerCase())
                    ).length === 0 ? (
                      <span className="text-slate-400 text-xs py-8 text-center font-medium">No hay facturas que coincidan con la búsqueda</span>
                    ) : (
                      localPendingInvoices.filter(inv =>
                        inv.numeroFactura.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                        inv.clienteNombre.toLowerCase().includes(invoiceSearch.toLowerCase())
                      ).map(inv => {
                        const isSelected = selectedInvoices.includes(inv.id);
                        return (
                          <label
                            key={inv.id}
                            className={`flex items-start justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                              isSelected ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50/30 border-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedInvoices(selectedInvoices.filter(id => id !== inv.id));
                                  } else {
                                    setSelectedInvoices([...selectedInvoices, inv.id]);
                                  }
                                }}
                                className="mt-0.5 border-slate-350 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <div>
                                <span className="text-xs font-black text-slate-800">{inv.numeroFactura}</span>
                                <span className="text-[10px] text-slate-500 truncate block font-bold leading-none mt-0.5">{inv.clienteNombre}</span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-slate-700">L{inv.total.toFixed(2)}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end border-t border-slate-100 pt-5 gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-black text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-md shadow-brand-500/10"
                >
                  Guardar y Despachar
                </button>
              </div>

            </form>

          </div>

        </div>
      )}

      {/* ─── MODAL: GESTIÓN DE FLOTA / CAMIONES ────────────────────────────────── */}
      {isFleetModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-brand-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Registro y Flota de Camiones</h3>
              </div>
              <button
                onClick={() => setIsFleetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-6">
              
              {/* Form to Register Truck */}
              <form onSubmit={handleCreateCamion} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-4">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Registrar Nuevo Vehículo</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Placa</label>
                    <input
                      type="text"
                      placeholder="ej. TRC-204"
                      value={fleetPlaca}
                      onChange={(e) => setFleetPlaca(e.target.value.toUpperCase())}
                      className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Conductor / Vendedor</label>
                    <select
                      value={fleetConductorId}
                      onChange={(e) => setFleetConductorId(e.target.value)}
                      className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                      required
                    >
                      <option value="">Seleccione...</option>
                      {conductors.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Acompañante / Ayudante</label>
                    <input
                      type="text"
                      placeholder="Nombre del ayudante"
                      value={fleetAcompanante}
                      onChange={(e) => setFleetAcompanante(e.target.value)}
                      className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Kilos</label>
                      <input
                        type="number"
                        value={fleetCapacidad}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setFleetCapacidad(e.target.value)}
                        className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold text-center no-spin"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Vol (m³)</label>
                      <input
                        type="number"
                        value={fleetVolumen}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setFleetVolumen(e.target.value)}
                        className="w-full border border-slate-350 bg-white rounded-lg p-2 text-xs font-bold text-center no-spin"
                        required
                      />
                    </div>
                  </div>

                  {/* Truck photo upload option (takes 2 cols) */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Foto del Camión (Cargar a R2)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                      />
                      {isUploading && <span className="text-[10px] text-slate-400 animate-pulse font-bold shrink-0">Subiendo...</span>}
                    </div>
                  </div>

                  {/* Photo Preview if loaded */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    {fleetFotoUrl && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-16 h-10 border border-slate-200 rounded-lg overflow-hidden shrink-0 bg-slate-50 relative">
                          <img src={fleetFotoUrl} className="w-full h-full object-contain" alt="Preview" />
                          <button
                            type="button"
                            onClick={() => setFleetFotoUrl('')}
                            className="absolute top-0 right-0 bg-rose-600 text-white rounded-bl p-0.5"
                            title="Eliminar foto"
                          >
                            <XCircle className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate max-w-[150px] font-mono leading-none">Listo en R2</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Registrar Camión
                  </button>
                </div>
              </form>

              {/* List of Registered Trucks */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Listado de Flota Registrada</span>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <th className="p-3 w-16">Foto</th>
                        <th className="p-3">Placa</th>
                        <th className="p-3">Conductor Principal</th>
                        <th className="p-3">Acompañante</th>
                        <th className="p-3 text-center">Capacidad</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {camiones.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">No hay vehículos registrados en la flota.</td>
                        </tr>
                      ) : (
                        camiones.map(c => (
                          <tr key={c.id} className="border-b border-slate-150 hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="w-10 h-7 rounded border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center">
                                <img
                                  src={c.fotoUrl || '/camion-reparto-icono.png'}
                                  className="w-full h-full object-contain"
                                  alt="Camión"
                                />
                              </div>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-800">{c.placa}</td>
                            <td className="p-3 font-semibold text-slate-700">{c.conductorNombre}</td>
                            <td className="p-3 font-semibold text-slate-500">{c.acompanante || 'Ninguno'}</td>
                            <td className="p-3 text-center text-slate-600 font-medium">
                              {c.capacidadKilos} Kgs / {c.volumenM3} m³
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteCamion(c.id)}
                                className="text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-colors cursor-pointer"
                                title="Eliminar vehículo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* List of Predefined Routes */}
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Listado de Rutas / Destinos Predefinidos</span>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                        <th className="p-3">Origen</th>
                        <th className="p-3">Destino</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rutasPredefinidas.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-slate-400 font-medium">No hay rutas predefinidas.</td>
                        </tr>
                      ) : (
                        rutasPredefinidas.map(r => (
                          <tr key={r.id} className="border-b border-slate-150 hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-700">{r.origen}</td>
                            <td className="p-3 font-semibold text-slate-800">{r.destino}</td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeletePredefinedRoute(r.id)}
                                className="text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-colors cursor-pointer"
                                title="Eliminar ruta predefinida"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-5 border-t border-slate-100 gap-3">
              <button
                type="button"
                onClick={() => setIsFleetModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
