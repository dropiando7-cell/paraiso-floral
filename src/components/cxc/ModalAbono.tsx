'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, DollarSign, AlertCircle, Loader2, CheckCircle, ChevronDown, Building2 } from 'lucide-react';

export const HONDURAS_BANKS = [
  { id: 'ficohsa', name: 'Ficohsa', logo: '/logos_bancos/ficohsa.png' },
  { id: 'atlantida', name: 'Atlántida', logo: '/logos_bancos/atlantida.png' },
  { id: 'bac', name: 'BAC Credomatic', logo: '/logos_bancos/bac.png' },
  { id: 'occidente', name: 'Banco de Occidente', logo: '/logos_bancos/occidente.png' },
  { id: 'banpais', name: 'Banpaís', logo: '/logos_bancos/banpais.png' },
  { id: 'davivienda', name: 'Davivienda', logo: '/logos_bancos/davivienda.png' },
  { id: 'lafise', name: 'LAFISE', logo: '/logos_bancos/lafise.png' },
  { id: 'cuscatlan', name: 'Cuscatlán', logo: '/logos_bancos/cuscatlan.png' },
  { id: 'banrural', name: 'Banrural', logo: '/logos_bancos/banrural.png' },
  { id: 'promerica', name: 'Promerica', logo: '/logos_bancos/promerica.png' },
  { id: 'azteca', name: 'Banco Azteca', logo: '/logos_bancos/azteca.png' },
  { id: 'ficensa', name: 'Ficensa', logo: '/logos_bancos/ficensa.png' },
  { id: 'banhcafe', name: 'Banhcafé', logo: '/logos_bancos/banhcafe.png' },
  { id: 'popular', name: 'Banco Popular', logo: '/logos_bancos/popular.png' },
];

interface ModalAbonoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cliente: {
    id: string;
    nombre: string;
    saldoTotal: number;
    facturas?: Array<{
      id: string;
      correlativo: string;
      total: number;
      saldoPendiente: number;
      fechaEmision: string;
    }>;
  } | null;
}

export default function ModalAbono({ isOpen, onClose, onSuccess, cliente }: ModalAbonoProps) {
  const [monto, setMonto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<string>('Transferencia');
  const [banco, setBanco] = useState<string>('Ficohsa');
  const [referencia, setReferencia] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [fechaPago, setFechaPago] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [facturaSeleccionadaId, setFacturaSeleccionadaId] = useState<string>('');
  const [bankDropdownOpen, setBankDropdownOpen] = useState<boolean>(false);
  const [bankSearchQuery, setBankSearchQuery] = useState<string>('');
  const bankDropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [localFacturas, setLocalFacturas] = useState<any[] | null>(null);
  const [loadingFacturas, setLoadingFacturas] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && cliente) {
      if (cliente.facturas) {
        setLocalFacturas(cliente.facturas);
      } else {
        const fetchFacturas = async () => {
          setLoadingFacturas(true);
          try {
            const res = await fetch(`/api/cxc/clientes/${cliente.id}`);
            if (res.ok) {
              const data = await res.json();
              setLocalFacturas(data.facturas || []);
            }
          } catch (e) {
            console.error('Error fetching facturas:', e);
          } finally {
            setLoadingFacturas(false);
          }
        };
        fetchFacturas();
      }
    } else {
      setLocalFacturas(null);
      setFacturaSeleccionadaId('');
    }
  }, [isOpen, cliente]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target as Node)) {
        setBankDropdownOpen(false);
      }
    }
    if (bankDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [bankDropdownOpen]);

  useEffect(() => {
    if (!bankDropdownOpen) {
      setBankSearchQuery('');
    }
  }, [bankDropdownOpen]);

  if (!isOpen || !cliente) return null;

  const handleMontoRapido = (porcentaje: number) => {
    const valor = Math.round(cliente.saldoTotal * porcentaje);
    setMonto(valor.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const valMonto = parseFloat(monto);
    if (isNaN(valMonto) || valMonto <= 0) {
      setError('Por favor ingresa un monto válido mayor a L. 0.00');
      return;
    }

    try {
      setLoading(true);
      const isEfectivo = metodoPago.toLowerCase().trim() === 'efectivo';
      const res = await fetch('/api/cxc/abonos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: cliente.id,
          monto: valMonto,
          metodoPago,
          banco: isEfectivo ? undefined : (banco.trim() || undefined),
          referencia: referencia.trim() || undefined,
          notas: notas.trim() || undefined,
          fecha: fechaPago || undefined,
          facturas: facturaSeleccionadaId ? [{ facturaId: facturaSeleccionadaId, montoAplicado: valMonto }] : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar el abono');
      }

      setMonto('');
      setBanco('');
      setReferencia('');
      setNotas('');
      setFacturaSeleccionadaId('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error registrando el abono');
    } finally {
      setLoading(false);
    }
  };

  const filteredBanks = HONDURAS_BANKS.filter(b =>
    b.name.toLowerCase().includes(bankSearchQuery.toLowerCase())
  );

  const facturasPendientes = localFacturas?.filter(f => f.saldoPendiente > 0) || [];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Registrar Abono / Pago</h3>
              <p className="text-emerald-100 text-xs truncate max-w-[240px]">Cliente: {cliente.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 bg-white">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Resumen de Saldo */}
          <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 flex justify-between items-center">
            <div>
              <span className="text-xs text-emerald-900 font-bold">Saldo Pendiente Actual</span>
              <p className="text-xs text-slate-500">Total adeudado por el cliente</p>
            </div>
            <span className="text-xl font-black text-emerald-700">
              L. {cliente.saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Selector de Factura Específica */}
          {loadingFacturas ? (
            <div className="text-xs text-emerald-600 animate-pulse font-semibold">Cargando facturas pendientes...</div>
          ) : facturasPendientes.length > 0 ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Aplicar a Factura Específica</span>
                <span className="text-[9px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase">Opcional</span>
              </label>
              <select
                value={facturaSeleccionadaId}
                onChange={(e) => {
                  const val = e.target.value;
                  setFacturaSeleccionadaId(val);
                  if (val) {
                    const fac = facturasPendientes.find(f => f.id === val);
                    if (fac) {
                      setMonto(fac.saldoPendiente.toString());
                    }
                  } else {
                    setMonto('');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                <option value="">-- Abono General (se aplica a saldo más antiguo) --</option>
                {facturasPendientes.map(f => (
                  <option key={f.id} value={f.id}>
                    Factura #{f.correlativo} (Pendiente: L. {f.saldoPendiente.toLocaleString('es-HN', { minimumFractionDigits: 2 })})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Botones de Abono Rápido */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Atajos de Monto Rápido
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleMontoRapido(0.25)}
                className="py-1.5 px-2 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 font-semibold text-xs rounded-lg transition-colors text-slate-700 border border-slate-200"
              >
                25% (L. {(cliente.saldoTotal * 0.25).toFixed(0)})
              </button>
              <button
                type="button"
                onClick={() => handleMontoRapido(0.50)}
                className="py-1.5 px-2 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 font-semibold text-xs rounded-lg transition-colors text-slate-700 border border-slate-200"
              >
                50% (L. {(cliente.saldoTotal * 0.50).toFixed(0)})
              </button>
              <button
                type="button"
                onClick={() => handleMontoRapido(1.0)}
                className="py-1.5 px-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                Pago Total (100%)
              </button>
            </div>
          </div>

          {/* Campo de Monto y Fecha del Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Monto a Abonar (Lempiras) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">L.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={monto}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span>Fecha del Pago *</span>
                <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase">Modificable</span>
              </label>
              <input
                type="date"
                required
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Forma de Pago *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'Transferencia', label: 'Transferencia' },
                { id: 'Efectivo', label: 'Efectivo en Caja' },
                { id: 'Tigo Money', label: 'Tigo Money' },
                { id: 'Cheque', label: 'Cheque' },
                { id: 'Depósito Bancario', label: 'Depósito Bancario' },
                { id: 'Otro', label: 'Otro' }
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setMetodoPago(item.id);
                    if (item.id.toLowerCase() === 'efectivo') {
                      setBankDropdownOpen(false);
                    }
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                    metodoPago === item.id
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Banco y Referencia */}
          {metodoPago.toLowerCase().trim() !== 'efectivo' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Selector Inteligente de Banco Destino */}
              <div className="relative" ref={bankDropdownRef}>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Banco Destino <span className="text-emerald-600">*</span>
                </label>
                
                {/* Botón Trigger con Logo */}
                <button
                  type="button"
                  onClick={() => setBankDropdownOpen(!bankDropdownOpen)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium flex items-center justify-between gap-2 shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    {(() => {
                      const foundBank = HONDURAS_BANKS.find(b => b.name.toLowerCase() === banco.toLowerCase());
                      if (foundBank) {
                        return (
                          <>
                            <div className="w-5 h-5 rounded bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                              <img src={foundBank.logo} alt={foundBank.name} className="w-full h-full object-contain" />
                            </div>
                            <span className="font-extrabold text-slate-900">{foundBank.name}</span>
                          </>
                        );
                      }
                      if (banco) {
                        return (
                          <>
                            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-extrabold text-slate-900">{banco}</span>
                          </>
                        );
                      }
                      return <span className="text-slate-400 font-medium">Seleccionar Banco...</span>;
                    })()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
 
                {/* Menú Desplegable Inteligente con Logos */}
                {bankDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-[100] bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                    {/* Buscador de banco */}
                    <div className="sticky top-0 bg-white pb-1.5 pt-0.5 px-1 z-10 border-b border-slate-100 mb-1">
                      <input
                        type="text"
                        placeholder="Buscar banco..."
                        value={bankSearchQuery}
                        onChange={(e) => setBankSearchQuery(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
                        autoFocus
                      />
                    </div>
                    {filteredBanks.length === 0 ? (
                      <p className="text-center text-slate-400 text-xs py-4 font-semibold">No se encontraron bancos</p>
                    ) : (
                      filteredBanks.map((b) => (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => {
                            setBanco(b.name);
                            setBankDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer text-left ${
                            banco.toLowerCase() === b.name.toLowerCase()
                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 shadow-2xs">
                            <img src={b.logo} alt={b.name} className="w-full h-full object-contain" />
                          </div>
                          <span className="truncate">{b.name}</span>
                          {banco.toLowerCase() === b.name.toLowerCase() && (
                            <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  # Referencia / Transacción
                </label>
                <input
                  type="text"
                  placeholder="Ej: 984521"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span># Referencia / N° Recibo Físico</span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase">Opcional</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Recibo manual #0045 (opcional)"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notas Explicativas (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Pagado por primo del cliente, comprobante enviado a WhatsApp..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 rounded-xl transition-colors border border-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] font-bold text-xs text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmar Abono</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
