'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Coins,
  Search,
  MessageCircle,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Flower2
} from 'lucide-react';
import ModalAbono from '@/components/cxc/ModalAbono';
import ModalNotaCredito from '@/components/cxc/ModalNotaCredito';

interface ClienteCxC {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  limiteCredito: number;
  diasCredito: number;
  saldoTotal: number;
  saldoVencido: number;
  facturasPendientesCount: number;
  maxDiasMora: number;
  ultimoPago: {
    monto: number;
    fecha: string;
  } | null;
}

interface ResumenCxC {
  totalCartera: number;
  totalVencido: number;
  cobradoEsteMes: number;
  clientesMorososCount: number;
  antiguedad: {
    alDia: number;
    porVencer: number;
    vencido: number;
    enRiesgo: number;
  };
}

export default function CuentasPorCobrarPage() {
  const [resumen, setResumen] = useState<ResumenCxC | null>(null);
  const [clientes, setClientes] = useState<ClienteCxC[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filtro, setFiltro] = useState<string>('CON_SALDO');

  // Modales
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteCxC | null>(null);
  const [modalAbonoOpen, setModalAbonoOpen] = useState<boolean>(false);
  const [modalNCOpen, setModalNCOpen] = useState<boolean>(false);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const resResumen = await fetch('/api/cxc/resumen');
      if (resResumen.ok) {
        const dataResumen = await resResumen.json();
        setResumen(dataResumen);
      }

      const resClientes = await fetch(`/api/cxc/clientes?q=${encodeURIComponent(search)}&filtro=${filtro}`);
      if (resClientes.ok) {
        const dataClientes = await resClientes.json();
        setClientes(dataClientes);
      }
    } catch (err) {
      console.error('Error cargando cuentas por cobrar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtro]);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarDatos();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const generarWhatsAppLink = (cliente: ClienteCxC) => {
    if (!cliente.telefono) return null;
    const cleanPhone = cliente.telefono.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 8 ? `504${cleanPhone}` : cleanPhone;

    const texto = `🌸 *DISTRIBUIDORA PARAÍSO FLORAL* 🌸
*Estado de Cuenta de Cliente*

Estimado(a) *${cliente.nombre}*, le saludamos cordialmente.

Le compartimos el resumen actualizado de su cuenta al día de hoy:

📌 *Saldo Pendiente Total:* L. ${cliente.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
📄 *Facturas Pendientes:* ${cliente.facturasPendientesCount} factura(s)
${cliente.saldoVencido > 0 ? `⚠️ *Saldo Vencido:* L. ${cliente.saldoVencido.toLocaleString('es-HN', { minimumFractionDigits: 2 })}` : '✅ *Estado:* Al día'}

Agradecemos su preferencia y apoyo en realizar su abono a nuestras cuentas bancarias autorizadas. ¡Cualquier consulta estamos a la orden! 🌺`;

    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(texto)}`;
  };

  const getStatusBadge = (diasMora: number, saldoTotal: number) => {
    if (saldoTotal <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
          <CheckCircle className="w-3.5 h-3.5 text-slate-500" /> Solventado
        </span>
      );
    }
    if (diasMora <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Clock className="w-3.5 h-3.5 text-emerald-600" /> Al Día (0-7d)
        </span>
      );
    }
    if (diasMora <= 15) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600" /> Por Vencer (8-15d)
        </span>
      );
    }
    if (diasMora <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600" /> Vencido (16-30d)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> En Riesgo (&gt;30d)
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header Banner - Fresco, Luminoso y Profesional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 rounded-3xl text-white shadow-lg shadow-emerald-700/10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold text-white backdrop-blur-sm">
            <Coins className="w-4 h-4 text-emerald-200" /> Control Financiero Paraíso Floral
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Cuentas por Cobrar (CxC)</h1>
          <p className="text-emerald-100 text-xs sm:text-sm font-medium">
            Seguimiento de saldo de clientes, abonos rápidos y gestión de mermas por flor dañada.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargarDatos}
            className="p-3 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-2xl transition-all flex items-center gap-2 text-xs font-bold shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Modo Día */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Cartera */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total por Cobrar</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              L
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              L. {resumen ? resumen.totalCartera.toLocaleString('es-HN', { minimumFractionDigits: 2 }) : '0.00'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Cartera activa distribuida</p>
          </div>
        </div>

        {/* KPI 2: Saldo Vencido */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-rose-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Vencido</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-rose-600">
              L. {resumen ? resumen.totalVencido.toLocaleString('es-HN', { minimumFractionDigits: 2 }) : '0.00'}
            </h3>
            <p className="text-[11px] text-rose-700/80 font-medium mt-0.5">
              {resumen?.clientesMorososCount || 0} cliente(s) en mora (&gt;15 días)
            </p>
          </div>
        </div>

        {/* KPI 3: Recaudado Este Mes */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cobrado Este Mes</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-teal-700">
              L. {resumen ? resumen.cobradoEsteMes.toLocaleString('es-HN', { minimumFractionDigits: 2 }) : '0.00'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Ingresos recuperados en caja</p>
          </div>
        </div>

        {/* KPI 4: Al día */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Al Día (0-7 días)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600">
              L. {resumen ? resumen.antiguedad.alDia.toLocaleString('es-HN', { minimumFractionDigits: 2 }) : '0.00'}
            </h3>
            <p className="text-[11px] text-emerald-800 font-medium mt-0.5">Crédito dentro del plazo habitual</p>
          </div>
        </div>
      </div>

      {/* Buscador & Filtros de Antigüedad - Modo Claro */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Campo de búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente por nombre o teléfono de WhatsApp..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium"
            />
          </div>

          {/* Selector de pestañas / filtro rápido */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'CON_SALDO', label: 'Con Saldo' },
              { id: 'TODOS', label: 'Todos' },
              { id: 'AL_DIA', label: '0-7d Al Día' },
              { id: 'POR_VENCER', label: '8-15d Por Vencer' },
              { id: 'VENCIDO', label: '16-30d Vencido' },
              { id: 'RIESGO', label: '>30d En Riesgo' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFiltro(tab.id)}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filtro === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de Clientes - Modo Claro */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
          <p className="text-xs font-semibold text-slate-600">Cargando cuentas por cobrar de Paraíso Floral...</p>
        </div>
      ) : clientes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No se encontraron clientes con este filtro</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Intenta cambiar el término de búsqueda o selecciona el filtro &quot;Todos&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map(c => {
            const waLink = generarWhatsAppLink(c);

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                {/* Header Cliente */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/cxc/cliente/${c.id}`}
                      className="font-bold text-base text-slate-900 hover:text-emerald-600 transition-colors line-clamp-1"
                    >
                      {c.nombre}
                    </Link>
                    {getStatusBadge(c.maxDiasMora, c.saldoTotal)}
                  </div>

                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    📱 {c.telefono || 'Sin teléfono registrado'}
                  </p>
                </div>

                {/* Bloque de Saldos */}
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Saldo Pendiente:</span>
                    <span className="font-black text-base text-slate-900">
                      L. {c.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {c.saldoVencido > 0 && (
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                      <span className="text-rose-600 font-bold">De los cuales Vencido:</span>
                      <span className="font-bold text-rose-600">
                        L. {c.saldoVencido.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    <span>{c.facturasPendientesCount} factura(s) pendiente(s)</span>
                    <span>Máx: {c.maxDiasMora} días</span>
                  </div>
                </div>

                {/* Botones Rápidos Touch Móviles */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  {/* Botón Abonar */}
                  <button
                    onClick={() => {
                      setClienteSeleccionado(c);
                      setModalAbonoOpen(true);
                    }}
                    className="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                    title="Registrar Pago o Abono"
                  >
                    <span>Abonar</span>
                  </button>

                  {/* Botón Nota Crédito (Flor Dañada) */}
                  <button
                    onClick={() => {
                      setClienteSeleccionado(c);
                      setModalNCOpen(true);
                    }}
                    className="py-2 px-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                    title="Registrar Devolución o Flor Dañada"
                  >
                    <span>Ajuste Flor</span>
                  </button>

                  {/* Botón WhatsApp Directo */}
                  {waLink ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                      title="Enviar Estado de Cuenta por WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="py-2 px-2 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  )}
                </div>

                {/* Enlace a Detalle */}
                <Link
                  href={`/cxc/cliente/${c.id}`}
                  className="w-full py-1.5 text-center text-xs font-semibold text-emerald-600 hover:underline flex items-center justify-center gap-1"
                >
                  <span>Ver Estado de Cuenta Completo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      <ModalAbono
        isOpen={modalAbonoOpen}
        onClose={() => {
          setModalAbonoOpen(false);
          setClienteSeleccionado(null);
        }}
        onSuccess={cargarDatos}
        cliente={clienteSeleccionado}
      />

      <ModalNotaCredito
        isOpen={modalNCOpen}
        onClose={() => {
          setModalNCOpen(false);
          setClienteSeleccionado(null);
        }}
        onSuccess={cargarDatos}
        cliente={clienteSeleccionado}
      />
    </div>
  );
}
