'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { getOpenSession, openCajaChicaSession, closeCajaChicaSession, registerCajaChicaMovimiento, updateCajaChicaMovimiento, updateCajaChicaSaldoInicial, getUploadUrlCajaChica, anularCajaChicaMovimiento, openAndFundCajaChicaSession, getClosedSessions, getCajaVentasStatus } from './actions';
import toast from 'react-hot-toast';
import {
  Wallet, Plus, Lock, Unlock, TrendingUp, TrendingDown, DollarSign,
  Search, Filter, Download, Printer, X, FileText, Calendar,
  ArrowUpCircle, ArrowDownCircle, Receipt, AlertCircle, CheckCircle2,
  Edit2, Trash2, ChevronDown, RefreshCcw, PieChart, History, FileSpreadsheet,
  Landmark, Banknote, CreditCard, Building2, UserCircle2, ShieldCheck,
  Paperclip, Hash, Sparkles, Info, Coins, Save
} from 'lucide-react';

// ============================================================
// MÓDULO DE CONTROL DE CAJA CHICA - Bioelectrónica Honduras
// Componente Next.js / React compatible con el dashboard existente
// Fuente: Inter (Google Fonts)
// ============================================================

export default function CajaChicaClient({ dbUser }: { dbUser: any }) {
  const organization = dbUser?.organization;
  // -------------------- ESTADO PRINCIPAL --------------------
  const [sesionActiva, setSesionActiva] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [userRole, setUserRole] = useState(dbUser?.role || '');
  const tienePrivilegiosCaja = ['SUPER_ADMIN', 'ORG_ADMIN', 'RECEPCION', 'GERENTE', 'VENDEDOR'].includes(userRole) || (dbUser?.accessibleModules || []).includes('/caja-chica') || dbUser?.customRoleName === 'PF_GERENCIA';
  const [showModalSinPrivilegios, setShowModalSinPrivilegios] = useState(false);
  const [showModalSobregiro, setShowModalSobregiro] = useState(false);
  const [montoApertura, setMontoApertura] = useState('');
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [saldoInicial, setSaldoInicial] = useState(0.00);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [showModalCierre, setShowModalCierre] = useState(false);
  const [showModalApertura, setShowModalApertura] = useState(false);
  const [saldoRealCierre, setSaldoRealCierre] = useState('');
  const [observacionesCierre, setObservacionesCierre] = useState('');
  const [sesionesCerradas, setSesionesCerradas] = useState<any[]>([]);
  const [sesionExpandidaId, setSesionExpandidaId] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState<'INGRESO' | 'SALIDA' | 'APERTURA'>('SALIDA');
  const [cajaVentasInfo, setCajaVentasInfo] = useState<{
    abierta: boolean;
    disponibleEfectivo: number;
    cargando: boolean;
  }>({ abierta: false, disponibleEfectivo: 0, cargando: true });
  const [editandoMovimientoId, setEditandoMovimientoId] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [modalEliminar, setModalEliminar] = useState<{show: boolean, id: string | null}>({show: false, id: null});
  const [showModalEditSaldo, setShowModalEditSaldo] = useState(false);
  const [nuevoSaldoApertura, setNuevoSaldoApertura] = useState('');
  const [showModalCategoria, setShowModalCategoria] = useState(false);
  const [showModalReporte, setShowModalReporte] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevaCuenta, setNuevaCuenta] = useState('');

  const [categoriasGasto, setCategoriasGasto] = useState([
    { nombre: 'Papelería', cuenta: '5102-001' },
    { nombre: 'Transporte', cuenta: '5103-001' },
    { nombre: 'Combustible', cuenta: '5103-002' },
    { nombre: 'Peajes y parqueos', cuenta: '5103-003' },
    { nombre: 'Alimentación', cuenta: '5104-001' },
    { nombre: 'Refrigerios', cuenta: '5104-002' },
    { nombre: 'Cafetería', cuenta: '5104-003' },
    { nombre: 'Limpieza', cuenta: '5105-001' },
    { nombre: 'Mantenimiento', cuenta: '5106-001' },
    { nombre: 'Servicios públicos', cuenta: '5107-001' },
    { nombre: 'Internet y telefonía', cuenta: '5107-002' },
    { nombre: 'Herramientas', cuenta: '5108-001' },
    { nombre: 'Repuestos y accesorios', cuenta: '5108-002' },
    { nombre: 'Suministros médicos', cuenta: '5108-003' },
    { nombre: 'Mensajería y envíos', cuenta: '5109-001' },
    { nombre: 'Trámites legales', cuenta: '5110-001' },
    { nombre: 'Permisos y licencias', cuenta: '5110-002' },
    { nombre: 'Capacitación', cuenta: '5111-001' },
    { nombre: 'Viáticos', cuenta: '5112-001' },
    { nombre: 'Hospedaje', cuenta: '5112-002' },
    { nombre: 'Atención a clientes', cuenta: '5113-001' },
    { nombre: 'Marketing y publicidad', cuenta: '5114-001' },
    { nombre: 'Impresiones y copias', cuenta: '5102-002' },
    { nombre: 'Botellones de agua', cuenta: '5104-004' },
    { nombre: 'Reparaciones menores', cuenta: '5106-002' },
    { nombre: 'Donaciones', cuenta: '5115-001' },
    { nombre: 'Propinas', cuenta: '5115-002' },
    { nombre: 'Otros gastos', cuenta: '5199-001' },
    { nombre: 'Reembolso', cuenta: '5199-002' }
  ]);

  const cargarSesion = async () => {
    setCargando(true);
    const res = await getOpenSession(organization?.id || dbUser?.organizationId);
    if (res.success) {
      setUserRole(dbUser?.role || '');
    }
    if (res.success && res.session) {
      setSesionActiva(res.session);
      setCajaAbierta(true);
      setSaldoInicial(res.session.saldoInicial);
      setMovimientos(res.session.movimientos || []);
    } else {
      setSesionActiva(null);
      setCajaAbierta(false);
      setSaldoInicial(0);
      setMovimientos([]);
    }

    const resCerradas = await getClosedSessions(organization?.id || dbUser?.organizationId);
    if (resCerradas.success) {
      setSesionesCerradas(resCerradas.sessions || []);
    }

    await cargarEstadoCajaVentas();

    setCargando(false);
  };

  const cargarEstadoCajaVentas = async () => {
    try {
      const res = await getCajaVentasStatus(organization?.id || dbUser?.organizationId);
      if (res.success) {
        setCajaVentasInfo({
          abierta: !!res.abierta,
          disponibleEfectivo: res.session ? res.session.disponibleEfectivo : 0,
          cargando: false
        });
      } else {
        setCajaVentasInfo({ abierta: false, disponibleEfectivo: 0, cargando: false });
      }
    } catch {
      setCajaVentasInfo({ abierta: false, disponibleEfectivo: 0, cargando: false });
    }
  };

  useEffect(() => {
    cargarSesion();
  }, []);

  // -------------------- FORMULARIO NUEVO MOVIMIENTO --------------------
  const formVacio = {
    categoria: '',
    cuentaContable: '',
    descripcion: '',
    importe: '',
    moneda: 'HNL',
    tipoCambio: 1,
    documento: 'FACTURA',
    nroDoc: '',
    adjuntoUrl: '',
    beneficiario: '',
    origenFondos: '',
    metodoPago: 'EFECTIVO',
    cuentaOrigen: '',
    referenciaTransferencia: '',
    autorizadoPor: '',
    notaInterna: ''
  };

  const [form, setForm] = useState<any>(formVacio);


  // -------------------- CÁLCULOS --------------------
  const stats = useMemo(() => {
    const ingresos = movimientos
      .filter(m => m.tipo === 'INGRESO')
      .reduce((acc, m) => acc + m.total, 0);
    const salidas = movimientos
      .filter(m => m.tipo === 'SALIDA')
      .reduce((acc, m) => acc + m.total, 0);
    const saldoFinal = saldoInicial + ingresos - salidas;
    return { ingresos, salidas, saldoFinal };
  }, [movimientos, saldoInicial]);

  const categorias = useMemo(() => {
    const cats: Record<string, number> = {};
    movimientos
      .filter(m => m.tipo === 'SALIDA')
      .forEach(m => {
        cats[m.categoria] = (cats[m.categoria] || 0) + m.total;
      });
    return Object.entries(cats)
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total);
  }, [movimientos]);

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter(m => {
      const matchTipo = filtroTipo === 'TODOS' || m.tipo === filtroTipo;
      const matchBusqueda = busqueda === '' ||
        m.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.categoria.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.nroDoc.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.beneficiario.toLowerCase().includes(busqueda.toLowerCase());
      return matchTipo && matchBusqueda;
    });
  }, [movimientos, filtroTipo, busqueda]);

  const montoARecargar = useMemo(() => {
    return Math.max(0, saldoInicial - stats.saldoFinal);
  }, [saldoInicial, stats.saldoFinal]);

  // -------------------- HELPERS --------------------
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingDoc(true);
      const res = await getUploadUrlCajaChica(file.name, file.type, dbUser.id);
      if (!res.success || !res.uploadUrl) throw new Error(res.error || 'Error getting url');
      const upload = await fetch(res.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!upload.ok) throw new Error('Failed to upload file to R2');
      setForm((prev: any) => ({ ...prev, adjuntoUrl: res.publicUrl }));
      toast.success('Documento adjuntado correctamente');
    } catch (err) {
      console.error(err);
      toast.error('Error al subir el documento');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleUpdateSaldo = async () => {
    if (!sesionActiva) return;
    const nuevo = parseFloat(nuevoSaldoApertura);
    if (isNaN(nuevo) || nuevo < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    const res = await updateCajaChicaSaldoInicial(sesionActiva.id, nuevo, dbUser.id);
    if (res.success) {
      toast.success('Saldo inicial actualizado');
      await cargarSesion();
      setShowModalEditSaldo(false);
    } else {
      toast.error(res.error || 'Error al actualizar saldo');
    }
  };

  const handleAnularConfirm = async () => {
    if (!modalEliminar.id) return;
    const res = await anularCajaChicaMovimiento(modalEliminar.id, dbUser.id);
    if (res.success) {
      toast.success('Movimiento eliminado');
      await cargarSesion();
      setModalEliminar({show: false, id: null});
    } else {
      toast.error(res.error || 'Error al anular');
    }
  };

  const abrirNuevoMovimiento = (tipo: 'INGRESO' | 'SALIDA') => {
    setEditandoMovimientoId(null);
    setTipoMovimiento(tipo);
    if (tipo === 'INGRESO') {
      cargarEstadoCajaVentas();
      setForm({
        ...formVacio,
        categoria: 'Reposición de fondos',
        importe: montoARecargar > 0 ? montoARecargar.toString() : '',
        origenFondos: '',
        autorizadoPor: ''
      });
    } else {
      setForm(formVacio);
    }
    setShowModalNuevo(true);
  };

  const cerrarModalNuevo = () => {
    setShowModalNuevo(false);
    setEditandoMovimientoId(null);
    setForm(formVacio);
  };

  const iniciarEdicion = (m: any) => {
    const esIngreso = m.tipo === 'INGRESO' || m.tipo === 'APERTURA';
    setEditandoMovimientoId(m.id);
    setTipoMovimiento(m.tipo);
    setForm({
      categoria: m.categoria || '',
      cuentaContable: m.cuentaContable || '',
      descripcion: m.descripcion || '',
      importe: m.importe.toString(),
      moneda: m.moneda || 'HNL',
      tipoCambio: m.tipoCambio || 1,
      documento: esIngreso ? 'FACTURA' : (m.documento || 'FACTURA'),
      nroDoc: esIngreso ? '' : (m.nroDoc || ''),
      adjuntoUrl: m.adjuntoUrl || '',
      beneficiario: m.beneficiario || '',
      origenFondos: esIngreso ? 'Caja chica' : '',
      metodoPago: esIngreso ? (m.documento || 'EFECTIVO') : 'EFECTIVO',
      referenciaTransferencia: esIngreso ? (m.nroDoc || '') : '',
      autorizadoPor: esIngreso ? 'Gerencia' : '',
      notaInterna: m.notaInterna || ''
    });
    setShowModalNuevo(true);
  };

  const formatMoneda = (valor: number) =>
    new Intl.NumberFormat('es-HN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);

  const handleAgregarMovimiento = async () => {
    const importeNum = parseFloat(form.importe);

    if (isNaN(importeNum) || importeNum <= 0) {
      toast.error('Debes ingresar un monto válido mayor a 0');
      return;
    }

    if (tipoMovimiento === 'INGRESO') {
      if (!editandoMovimientoId && (!form.categoria || !form.origenFondos || !form.autorizadoPor)) {
        toast.error('Por favor completa: tipo de recarga, origen de fondos y autorización');
        return;
      }
      if (!editandoMovimientoId && form.metodoPago !== 'EFECTIVO' && !form.referenciaTransferencia) {
        toast.error('Debes ingresar el número de referencia o cheque');
        return;
      }

      // Validar si el origen es Caja de Ventas
      const esDeCajaVentas =
        form.categoria === 'Cobro de venta' ||
        (form.origenFondos && (
          form.origenFondos.toLowerCase().includes('caja de ventas') ||
          form.origenFondos.toLowerCase().includes('cobro') ||
          form.origenFondos.toLowerCase().includes('ventas')
        ));

      if (esDeCajaVentas) {
        if (!cajaVentasInfo.abierta) {
          toast.error('No se puede recargar: La Caja de Ventas está cerrada. Abre el turno de ventas primero.');
          return;
        }
        if (importeNum > cajaVentasInfo.disponibleEfectivo) {
          toast.error(`Fondos insuficientes en Caja de Ventas. Efectivo disponible: L. ${formatMoneda(cajaVentasInfo.disponibleEfectivo)}`);
          return;
        }
      }
    } else {
      if (!form.categoria || !form.descripcion) {
        toast.error('Por favor completa la categoría y descripción del gasto');
        return;
      }
    }

    const total = importeNum;

    const oldMovement = editandoMovimientoId ? movimientos.find((m: any) => m.id === editandoMovimientoId) : null;
    const oldAmount = oldMovement ? oldMovement.total : 0;
    const oldTipo = oldMovement ? oldMovement.tipo : '';

    let balanceSinEste = stats.saldoFinal;
    if (oldMovement) {
      if (oldTipo === 'SALIDA') {
        balanceSinEste += oldAmount;
      } else if (oldTipo === 'INGRESO') {
        balanceSinEste -= oldAmount;
      }
    }

    if (tipoMovimiento === 'SALIDA' && total > balanceSinEste) {
      setShowModalSobregiro(true);
      return;
    }

    let res;
    const payload = {
      categoria: form.categoria,
      cuentaContable: tipoMovimiento === 'SALIDA' ? form.cuentaContable : undefined,
      descripcion: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? (form.descripcion || `${form.categoria} desde ${form.origenFondos}`) : form.descripcion,
      documento: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.metodoPago : form.documento,
      nroDoc: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? (form.referenciaTransferencia || undefined) : (form.nroDoc || undefined),
      importe: importeNum,
      moneda: form.moneda,
      tipoCambio: 1,
      total,
      adjuntoUrl: form.adjuntoUrl || undefined,
      beneficiario: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? undefined : (form.beneficiario || undefined),
      origenFondos: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.origenFondos : undefined,
      metodoPago: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.metodoPago : undefined,
      referenciaTransferencia: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.referenciaTransferencia : undefined,
      autorizadoPor: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.autorizadoPor : undefined,
    };

    if (editandoMovimientoId) {
      res = await updateCajaChicaMovimiento(editandoMovimientoId, payload, dbUser.id);
    } else if (tipoMovimiento === 'APERTURA') {
      res = await openAndFundCajaChicaSession(organization?.id || dbUser?.organizationId, payload, dbUser.id);
    } else {
      res = await registerCajaChicaMovimiento(sesionActiva.id, tipoMovimiento as any, payload, dbUser.id);
    }

    if (res.success) {
      await cargarSesion();
      toast.success(editandoMovimientoId ? 'Movimiento actualizado' : (tipoMovimiento === 'APERTURA' ? 'Caja abierta con fondo inicial' : 'Movimiento registrado correctamente'));
      cerrarModalNuevo();
    } else {
      toast.error(res.error || 'Error al guardar el movimiento');
    }
  };

  const eliminarMovimiento = async (id: string) => {
    if (confirm('¿Estás seguro de anular este movimiento?')) {
      const res = await anularCajaChicaMovimiento(id, dbUser.id);
      if (res.success) {
        await cargarSesion();
      } else {
        alert(res.error || 'Error al anular');
      }
    }
  };

  const handleAbrirCaja = async () => {
    const amt = parseFloat(montoApertura);
    if (isNaN(amt) || amt < 0) {
      alert("Ingrese un monto válido");
      return;
    }
    const res = await openCajaChicaSession(organization?.id || dbUser?.organizationId, amt, dbUser.id);
    if (res.success) {
      setShowModalApertura(false);
      setMontoApertura('');
      await cargarSesion();
    } else {
      alert(res.error || 'Error al abrir la caja');
    }
  };

  const handleCerrarCaja = async () => {
    if (!sesionActiva) return;
    const realAmt = parseFloat(saldoRealCierre);
    if (isNaN(realAmt) || realAmt < 0) {
      alert("Por favor ingrese el efectivo físico contado válido.");
      return;
    }
    const res = await closeCajaChicaSession(
      sesionActiva.id, 
      realAmt, 
      observacionesCierre || 'Cierre de período', 
      dbUser.id
    );
    if (res.success) {
      setShowModalCierre(false);
      setSaldoRealCierre('');
      setObservacionesCierre('');
      await cargarSesion();
    } else {
      alert(res.error || 'Error al cerrar la caja');
    }
  };

  // ============================================================
  // RENDERIZADO
  // ============================================================
  return (
    <div style={{ fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }} className="min-h-screen bg-gray-50">
      {/* Importar Inter desde Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
      `}</style>

      <div className="max-w-[1600px] mx-auto p-6">

        {/* ============== HEADER PRINCIPAL ============== */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Control de Caja Chica</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  cajaAbierta
                    ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                    : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cajaAbierta ? 'bg-green-500' : 'bg-red-500'}`} />
                  {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Gestión de recargas, gastos y arqueo de la caja chica administrativa.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Período actual: <span className="font-medium text-gray-600">{sesionActiva?.createdAt ? new Date(sesionActiva.createdAt).toLocaleDateString('es-HN') : '—'}</span> · Responsable: <span className="font-medium text-gray-600">{sesionActiva?.creadoPor ? `${sesionActiva.creadoPor.nombre || ''} ${sesionActiva.creadoPor.apellido || ''}`.trim() : (dbUser?.nombre ? `${dbUser.nombre} ${dbUser.apellido || ''}`.trim() : dbUser?.email || '—')}</span>
              </p>
            </div>
          </div>

          {/* Botones de acción rápida */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={() => setShowModalReporte(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20 transition-all"
            >
              <FileText className="w-4 h-4" />
              Reporte de Reembolso
            </button>
          </div>
        </div>

        {/* ============== ACCIONES DE CAJA ============== */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (!tienePrivilegiosCaja) {
                     setShowModalSinPrivilegios(true);
                     return;
                  }
                  if (!cajaAbierta) setShowModalApertura(true);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  (cajaAbierta || !tienePrivilegiosCaja)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20'
                }`}
              >
                <Unlock className="w-4 h-4" />
                Abrir Caja
              </button>
              <button
                onClick={() => {
                  if (!tienePrivilegiosCaja) {
                     setShowModalSinPrivilegios(true);
                     return;
                  }
                  if (cajaAbierta) {
                    setSaldoRealCierre(stats.saldoFinal.toFixed(2));
                    setObservacionesCierre('');
                    setShowModalCierre(true);
                  }
                }}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  (!cajaAbierta || !tienePrivilegiosCaja)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-500/20'
                }`}
              >
                <Lock className="w-4 h-4" />
                Cerrar Caja
              </button>
              <div className="h-8 w-px bg-gray-200 mx-1" />
              <button
                onClick={() => abrirNuevoMovimiento('INGRESO')}
                disabled={!cajaAbierta}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  !cajaAbierta
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                    : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4" />
                Recargar Fondo
              </button>
              <button
                onClick={() => abrirNuevoMovimiento('SALIDA')}
                disabled={!cajaAbierta}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  !cajaAbierta
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4" />
                Registrar Gasto
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>Apertura: <span className="font-semibold text-gray-700">{sesionActiva?.createdAt ? new Date(sesionActiva.createdAt).toLocaleString('es-HN') : '—'}</span></span>
            </div>
          </div>
        </div>

        {/* ============== TARJETAS DE RESUMEN ============== */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Saldo Inicial */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-400">INICIAL</span>
                {cajaAbierta && (
                  <button 
                    onClick={() => {
                      setNuevoSaldoApertura(saldoInicial.toString());
                      setShowModalEditSaldo(true);
                    }}
                    className="p-1 hover:bg-gray-100 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    title="Editar saldo inicial"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-1">Saldo de Apertura</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
              L. {formatMoneda(saldoInicial)}
            </p>
            <p className="text-xs text-gray-400 mt-2">Fondo asignado a la caja</p>
          </div>

          {/* Ingresos */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                +{movimientos.filter(m => m.tipo === 'INGRESO').length}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-1">Total Recargas</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
              L. {formatMoneda(stats.ingresos)}
            </p>
            <p className="text-xs text-gray-400 mt-2">Reposiciones y aportes</p>
          </div>

          {/* Salidas */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                -{movimientos.filter(m => m.tipo === 'SALIDA').length}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-1">Total Gastos</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
              L. {formatMoneda(stats.salidas)}
            </p>
            <p className="text-xs text-gray-400 mt-2">Gastos registrados</p>
          </div>

          {/* Saldo Final */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 border border-blue-700 rounded-xl p-5 text-white shadow-lg shadow-blue-600/20">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
                <Banknote className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-white/90 bg-white/15 px-2 py-0.5 rounded-md">
                ACTUAL
              </span>
            </div>
            <p className="text-xs text-blue-100 font-medium mb-1">Saldo Final en Caja</p>
            <p className="text-2xl font-bold tracking-tight">
              L. {formatMoneda(stats.saldoFinal)}
            </p>
            <p className="text-xs text-blue-100 mt-2">Disponible para uso</p>
          </div>
        </div>

        {/* ============== DESGLOSE POR CATEGORÍAS ============== */}
        {categorias.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900">Desglose de Gastos por Categoría</h2>
              </div>
              <button className="text-xs font-medium text-blue-600 hover:text-blue-700">
                Ver reporte completo →
              </button>
            </div>
            <div className="space-y-3">
              {categorias.map((cat, idx) => {
                const porcentaje = (cat.total / stats.salidas) * 100;
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{cat.nombre}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{porcentaje.toFixed(1)}%</span>
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                          L. {formatMoneda(cat.total)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============== TABLA DE MOVIMIENTOS ============== */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Filtros */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por descripción, categoría, documento..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                  />
                </div>
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg">
                  {['TODOS', 'INGRESO', 'SALIDA'].map(t => (
                    <button
                      key={t}
                      onClick={() => setFiltroTipo(t)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        filtroTipo === t
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t === 'TODOS' ? 'Todos' : t === 'INGRESO' ? 'Recargas' : 'Gastos'}
                    </button>
                  ))}
                </div>
                <button className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Filter className="w-4 h-4" />
                  Más filtros
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Mostrando <span className="font-semibold text-gray-700">{movimientosFiltrados.length}</span> de <span className="font-semibold text-gray-700">{movimientos.length}</span> movimientos</span>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Operación</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Documento</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">N° Doc</th>
                  <th className="text-right px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Importe</th>
                  <th className="text-right px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total (L.)</th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movimientosFiltrados.map((m) => (
                  <tr key={m.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-5 py-3 text-xs text-gray-600 whitespace-nowrap tabular-nums">
                      {(() => {
                        const dateObj = new Date(m.createdAt);
                        const d = String(dateObj.getDate()).padStart(2, '0');
                        const mo = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const y = dateObj.getFullYear();
                        return `${d}/${mo}/${y}`;
                      })()}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {m.tipo === 'INGRESO' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-[11px] font-semibold">
                          <ArrowUpCircle className="w-3 h-3" />
                          RECARGA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-700 text-[11px] font-semibold">
                          <ArrowDownCircle className="w-3 h-3" />
                          GASTO
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap font-medium">
                      <div className="flex items-center gap-1.5">
                        <span>{m.categoria}</span>
                        {(m.categoria === 'Cobro de venta' || (m.descripcion && m.descripcion.includes('Caja de Ventas'))) && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Caja de Ventas
                          </span>
                        )}
                      </div>
                      {m.cuentaContable && m.cuentaContable !== '—' && (
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {m.cuentaContable}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-[220px] truncate" title={m.descripcion}>
                      {m.descripcion}
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Beneficiario: {m.beneficiario || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Receipt className="w-3 h-3" />
                        {m.documento}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 font-mono whitespace-nowrap">
                      {m.nroDoc}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 text-right tabular-nums whitespace-nowrap">
                      {formatMoneda(m.importe)}
                    </td>
                    <td className={`px-3 py-3 text-sm font-bold text-right tabular-nums whitespace-nowrap ${
                      m.tipo === 'INGRESO' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {m.tipo === 'INGRESO' ? '+' : '-'} {formatMoneda(m.total)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => iniciarEdicion(m)}
                          className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded transition-colors" 
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded transition-colors" title="Ver documento">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => eliminarMovimiento(m.id)}
                          className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {movimientosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <FileSpreadsheet className="w-10 h-10" />
                        <p className="text-sm font-medium">No se encontraron movimientos</p>
                        <p className="text-xs">Intenta ajustar los filtros o registra un nuevo movimiento</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              {movimientosFiltrados.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={9} className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Saldo Final en Caja
                    </td>
                    <td className="px-3 py-3 text-right text-base font-bold text-blue-700 tabular-nums">
                      L. {formatMoneda(stats.saldoFinal)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ============== HISTORIAL DE PERÍODOS DE CAJA CHICA ============== */}
        {sesionesCerradas.length > 0 && (
          <div className="mt-8 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-150 bg-gray-50/50 flex items-center gap-2.5">
              <History className="w-5 h-5 text-gray-550" />
              <div>
                <h2 className="text-base font-bold text-gray-900">Historial de Períodos Cerrados</h2>
                <p className="text-xs text-gray-550">Auditoría y conciliación de ciclos de caja anteriores</p>
              </div>
            </div>
            
            <div className="divide-y divide-gray-150">
              {sesionesCerradas.map((session) => {
                const isExpanded = sesionExpandidaId === session.id;
                const diff = session.diferencia || 0;
                
                return (
                  <div key={session.id} className="p-5 hover:bg-slate-50/30 transition-colors">
                    {/* Encabezado del Período */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-800">
                            Período: {new Date(session.createdAt).toLocaleDateString('es-HN')} – {session.cerradaAt ? new Date(session.cerradaAt).toLocaleDateString('es-HN') : '—'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
                            Cerrada
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Apertura por: <span className="font-semibold text-gray-700">{session.creadoPor ? `${session.creadoPor.nombre || ''} ${session.creadoPor.apellido || ''}`.trim() : '—'}</span> · 
                          Cierre por: <span className="font-semibold text-gray-700">{session.cerradoPor ? `${session.cerradoPor.nombre || ''} ${session.cerradoPor.apellido || ''}`.trim() : '—'}</span>
                        </p>
                      </div>
                      
                      {/* Valores */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-right">
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-gray-400">Saldo Inicial</span>
                          <span className="text-xs font-semibold text-gray-700 tabular-nums">L. {formatMoneda(session.saldoInicial)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-gray-400">Saldo Esperado</span>
                          <span className="text-xs font-semibold text-gray-700 tabular-nums">L. {formatMoneda(session.saldoFinal || 0)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-gray-400">Efectivo Real</span>
                          <span className="text-xs font-bold text-gray-900 tabular-nums">L. {formatMoneda(session.saldoReal || 0)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-gray-400">Diferencia</span>
                          {diff < 0 ? (
                            <span className="text-xs font-bold text-red-600 tabular-nums">L. {formatMoneda(diff)} (Faltante)</span>
                          ) : diff > 0 ? (
                            <span className="text-xs font-bold text-green-600 tabular-nums">+L. {formatMoneda(diff)} (Sobrante)</span>
                          ) : (
                            <span className="text-xs font-semibold text-gray-500 tabular-nums">L. 0.00 (OK)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Notas y Botones */}
                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-dashed border-gray-150">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>Obs: <span className="italic font-medium text-gray-600">{session.observaciones || 'Sin observaciones'}</span></span>
                      </div>
                      
                      <button
                        onClick={() => setSesionExpandidaId(isExpanded ? null : session.id)}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        {isExpanded ? 'Ocultar movimientos ↑' : 'Ver movimientos ↓'}
                      </button>
                    </div>
                    
                    {/* Sección Expandible de Movimientos */}
                    {isExpanded && (
                      <div className="mt-4 bg-slate-50/50 border border-gray-200 rounded-xl p-4 animate-in fade-in duration-200">
                        <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2.5">Detalle de Movimientos en el Período</h4>
                        {session.movimientos && session.movimientos.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-600">
                              <thead>
                                <tr className="border-b border-gray-250 pb-2">
                                  <th className="py-2 font-semibold">Fecha</th>
                                  <th className="py-2 font-semibold">Tipo</th>
                                  <th className="py-2 font-semibold">Categoría</th>
                                  <th className="py-2 font-semibold">Descripción</th>
                                  <th className="py-2 font-semibold">Documento</th>
                                  <th className="py-2 font-semibold text-right">Importe</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-150">
                                {session.movimientos.map((m: any) => (
                                  <tr key={m.id} className="hover:bg-slate-100/50 transition-colors">
                                    <td className="py-2.5 font-mono">{new Date(m.createdAt).toLocaleDateString('es-HN')}</td>
                                    <td className="py-2.5">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                        m.tipo === 'INGRESO' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                      }`}>
                                        {m.tipo === 'INGRESO' ? 'Ingreso' : 'Salida'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 font-medium">{m.categoria}</td>
                                    <td className="py-2.5 truncate max-w-xs" title={m.descripcion}>{m.descripcion}</td>
                                    <td className="py-2.5 font-mono">{m.documento} {m.nroDoc ? `(${m.nroDoc})` : ''}</td>
                                    <td className={`py-2.5 text-right font-bold tabular-nums ${m.tipo === 'INGRESO' ? 'text-green-700' : 'text-gray-800'}`}>
                                      {m.tipo === 'INGRESO' ? '+' : '−'} L. {formatMoneda(m.total)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No se registraron movimientos en este ciclo.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============== FOOTER INFORMATIVO ============== */}
        <div className="mt-6 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <History className="w-3.5 h-3.5" />
            <span>Última actualización: hace 2 minutos</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span>Todos los movimientos sincronizados</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: NUEVO MOVIMIENTO */}
      {/* ============================================================ */}
      {showModalNuevo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  tipoMovimiento === 'INGRESO' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {tipoMovimiento === 'INGRESO'
                    ? <ArrowUpCircle className="w-6 h-6 text-green-600" />
                    : <ArrowDownCircle className="w-6 h-6 text-red-600" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editandoMovimientoId 
                      ? (tipoMovimiento === 'INGRESO' ? 'Editar Recarga' : 'Editar Gasto') 
                      : (tipoMovimiento === 'INGRESO' ? 'Recargar Fondo' : 'Registrar Gasto')}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {editandoMovimientoId ? 'Modifica los detalles del movimiento seleccionado' : 'Completa la información del movimiento de caja'}
                  </p>
                </div>
              </div>
              <button
                onClick={cerrarModalNuevo}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Selector tipo */}
            <div className="px-6 pt-5">
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => { setTipoMovimiento('INGRESO'); setForm((f: any) => ({ ...f, categoria: 'Reposición de fondos' })); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all ${
                    tipoMovimiento === 'INGRESO'
                      ? 'bg-white text-green-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Recarga
                </button>
                <button
                  onClick={() => setTipoMovimiento('SALIDA')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all ${
                    tipoMovimiento === 'SALIDA'
                      ? 'bg-white text-red-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  Gasto
                </button>
              </div>
            </div>

            {/* Formulario */}
            <div className="p-6 space-y-4">

              {/* ============================================ */}
              {/* CAMPO: TIPO DE RECARGA                       */}
              {/* ============================================ */}
              {tipoMovimiento === 'INGRESO' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Tipo de Recarga <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { val: 'Reposición de fondos', icon: RefreshCcw, desc: 'Recarga programada del fondo' },
                      { val: 'Reembolso', icon: ArrowUpCircle, desc: 'Alguien devuelve dinero a la caja' },
                      { val: 'Cobro de venta', icon: Coins, desc: 'Efectivo recibido de ventas/servicios' },
                      { val: 'Ajuste de saldo', icon: Sparkles, desc: 'Corrección de diferencias' },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const selected = form.categoria === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            const newCat = opt.val;
                            setForm((f: any) => ({
                              ...f,
                              categoria: newCat,
                              origenFondos: newCat === 'Cobro de venta' ? 'Caja de ventas (Cobros / Turno del día)' : f.origenFondos,
                              importe: (newCat === 'Reposición de fondos' && !f.importe && montoARecargar > 0) ? montoARecargar.toString() : f.importe
                            }));
                          }}
                          className={`text-left p-3 rounded-lg border transition-all ${
                            selected
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Icon className={`w-4 h-4 flex-shrink-0 ${selected ? 'text-blue-600' : 'text-gray-400'}`} />
                            <span className={`text-[13px] font-semibold leading-tight ${selected ? 'text-blue-900' : 'text-gray-700'}`}>
                              {opt.val}
                            </span>
                          </div>
                          <p className={`text-[11px] leading-snug ${selected ? 'text-blue-700' : 'text-gray-400'}`}>
                            {opt.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ============================================ */}
              {/* CAMPO DE MONTO                               */}
              {/* ============================================ */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Monto a {tipoMovimiento === 'INGRESO' ? 'Recargar' : 'Gastar'} <span className="text-red-500">*</span>
                  </label>
                  {tipoMovimiento === 'INGRESO' && montoARecargar > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm((f: any) => ({ ...f, importe: montoARecargar.toString() }))}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Ajustar al fondo total: L. {formatMoneda(montoARecargar)}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-gray-400">
                    L.
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.importe}
                    onChange={(e) => setForm((f: any) => ({ ...f, importe: e.target.value }))}
                    placeholder="0.00"
                    className="w-full pl-11 pr-3 py-3 text-lg font-bold border rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white text-gray-900 border-gray-200"
                  />
                </div>
              </div>

              {/* ============================================ */}
              {/* FORMULARIO ESPECÍFICO: RECARGA              */}
              {/* ============================================ */}
              {tipoMovimiento === 'INGRESO' && (
                <>
                  {/* Origen de los fondos */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Origen de los Fondos <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.origenFondos}
                      onChange={(e) => setForm({ ...form, origenFondos: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white font-medium"
                    >
                      <option value="">Selecciona el origen...</option>
                      <option value="Caja de ventas (Cobros / Turno del día)">Caja de ventas (Cobros / Turno del día)</option>
                      <option value="Cuenta bancaria principal - BAC">Cuenta bancaria principal - BAC</option>
                      <option value="Cuenta bancaria principal - Banco Atlántida">Cuenta bancaria principal - Banco Atlántida</option>
                      <option value="Cuenta operativa - Ficohsa">Cuenta operativa - Ficohsa</option>
                      <option value="Caja general de la empresa">Caja general de la empresa</option>
                      <option value="Aporte de socio">Aporte de socio</option>
                      <option value="Cobro a cliente en efectivo">Cobro a cliente en efectivo</option>
                      <option value="Otro origen">Otro origen</option>
                    </select>
                  </div>

                  {/* Panel interactivo de Estado de Caja de Ventas */}
                  {(form.categoria === 'Cobro de venta' || (form.origenFondos && (form.origenFondos.toLowerCase().includes('caja de ventas') || form.origenFondos.toLowerCase().includes('cobro') || form.origenFondos.toLowerCase().includes('ventas')))) && (
                    <div className="animate-in fade-in duration-200">
                      {cajaVentasInfo.abierta ? (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                              <Coins className="w-5 h-5 text-emerald-700" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-xs font-bold text-emerald-950">Caja de Ventas Aperturada (Turno Activo)</p>
                              </div>
                              <p className="text-xs text-emerald-700 mt-0.5">
                                Efectivo disponible en turno: <span className="font-extrabold font-mono text-emerald-950 text-sm">L. {formatMoneda(cajaVentasInfo.disponibleEfectivo)}</span>
                              </p>
                            </div>
                          </div>
                          {Number(form.importe) > cajaVentasInfo.disponibleEfectivo && (
                            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-md uppercase shrink-0 border border-red-200">
                              Excede disponible
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 shadow-xs">
                          <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertCircle className="w-5 h-5 text-rose-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-rose-950">Caja de Ventas Cerrada (No Aperturada)</p>
                            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                              Para recargar desde fondos de venta o cobros diarios, la <strong>Caja de Ventas</strong> debe estar aperturada. Ve a <strong>Cierre de Caja (Ventas)</strong> para abrir el turno antes de proceder.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Método de Pago */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Método de Entrega <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { val: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
                        { val: 'TRANSFERENCIA', label: 'Transferencia', icon: Landmark },
                        { val: 'CHEQUE', label: 'Cheque', icon: FileText },
                        { val: 'DEPOSITO', label: 'Depósito', icon: Building2 },
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const selected = form.metodoPago === opt.val;
                        return (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setForm({ ...form, metodoPago: opt.val })}
                            className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-all ${
                              selected
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${selected ? 'text-blue-600' : 'text-gray-400'}`} />
                            <span className={`text-xs font-semibold ${selected ? 'text-blue-900' : 'text-gray-600'}`}>
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Referencia (condicional según método) */}
                  {form.metodoPago !== 'EFECTIVO' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {form.metodoPago === 'CHEQUE' ? 'N° de Cheque' : 'N° de Referencia / Boleta'}
                        <span className="text-red-500"> *</span>
                      </label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={form.referenciaTransferencia}
                          onChange={(e) => setForm({ ...form, referenciaTransferencia: e.target.value })}
                          placeholder={form.metodoPago === 'CHEQUE' ? '0000012345' : 'TRX-2026-05-13-0042'}
                          className="w-full pl-10 pr-3 py-2.5 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Autorizado por */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Autorizado por <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        value={form.autorizadoPor}
                        onChange={(e) => setForm({ ...form, autorizadoPor: e.target.value })}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white appearance-none"
                      >
                        <option value="">Selecciona al responsable autorizante...</option>
                        <option>Gerencia General</option>
                        <option>Gerencia Administrativa</option>
                        <option>Contabilidad</option>
                        <option>Dirección Financiera</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Persona o área que autorizó el desembolso a caja chica
                    </p>
                  </div>

                  {/* Nota / Observación */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Justificación / Motivo de la Recarga
                    </label>
                    <textarea
                      value={form.descripcion}
                      onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                      rows={2}
                      placeholder="Ej: Reposición del fondo agotado tras gastos de la semana del 06-12 mayo..."
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
                    />
                  </div>

                  {/* Comprobante adjunto */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Comprobante (opcional)
                    </label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                      <Paperclip className="w-4 h-4 text-gray-400" />
                      {uploadingDoc ? (
                        <span className="text-sm text-blue-500 flex items-center gap-2"><RefreshCcw className="w-4 h-4 animate-spin"/> Subiendo...</span>
                      ) : (
                        <>
                          <span className="text-sm text-gray-500">
                            {form.adjuntoUrl ? "Documento adjuntado (clic para cambiar)" : "Adjuntar boleta, voucher o captura de transferencia"}
                          </span>
                          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                        </>
                      )}
                    </label>
                  </div>
                </>
              )}

              {/* ============================================ */}
              {/* FORMULARIO ESPECÍFICO: GASTO                */}
              {/* ============================================ */}
              {tipoMovimiento === 'SALIDA' && (
                <>
                  {/* Categoría de gasto + Cuenta contable */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-700">
                        Categoría y Cuenta Contable <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowModalCategoria(true)}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Nueva categoría
                      </button>
                    </div>
                    <div className="grid grid-cols-[1fr_180px] gap-2">
                      <select
                        value={form.categoria}
                        onChange={(e) => {
                          const cat = categoriasGasto.find(c => c.nombre === e.target.value);
                          setForm({
                            ...form,
                            categoria: e.target.value,
                            cuentaContable: cat ? cat.cuenta : ''
                          });
                        }}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
                      >
                        <option value="">Selecciona una categoría...</option>
                        {categoriasGasto.map((cat) => (
                          <option key={cat.nombre} value={cat.nombre}>{cat.nombre}</option>
                        ))}
                      </select>
                      <div className="relative">
                        <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={form.cuentaContable}
                          onChange={(e) => setForm({ ...form, cuentaContable: e.target.value })}
                          placeholder="0000-000"
                          className="w-full pl-9 pr-3 py-2.5 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 tabular-nums"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      La cuenta contable se autocompleta al seleccionar la categoría · {categoriasGasto.length} categorías disponibles
                    </p>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Descripción <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.descripcion}
                      onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                      rows={2}
                      placeholder="Describe el motivo del gasto..."
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
                    />
                  </div>

                  {/* Beneficiario */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Beneficiario / Proveedor
                    </label>
                    <input
                      type="text"
                      value={form.beneficiario}
                      onChange={(e) => setForm({ ...form, beneficiario: e.target.value })}
                      placeholder="Nombre del proveedor o beneficiario"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />
                  </div>

                  {/* Tipo documento + Nro doc */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Tipo de Documento
                      </label>
                      <select
                        value={form.documento}
                        onChange={(e) => setForm((f: any) => ({ ...f, documento: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
                      >
                        <option>FACTURA</option>
                        <option>BOLETA</option>
                        <option>RECIBO</option>
                        <option>RECIBO INTERNO</option>
                        <option>VALE DE CAJA</option>
                        <option>SIN DOCUMENTO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        N° de Documento
                      </label>
                      <input
                        type="text"
                        value={form.nroDoc}
                        onChange={(e) => setForm({ ...form, nroDoc: e.target.value })}
                        placeholder="001-2345"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-mono"
                      />
                    </div>
                  </div>

                  {/* Comprobante adjunto Gasto */}
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Comprobante (opcional)
                    </label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                      <Paperclip className="w-4 h-4 text-gray-400" />
                      {uploadingDoc ? (
                        <span className="text-sm text-blue-500 flex items-center gap-2"><RefreshCcw className="w-4 h-4 animate-spin"/> Subiendo...</span>
                      ) : (
                        <>
                          <span className="text-sm text-gray-500">
                            {form.adjuntoUrl ? "Documento adjuntado (clic para cambiar)" : "Adjuntar boleta, voucher o captura de transferencia"}
                          </span>
                          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                        </>
                      )}
                    </label>
                  </div>
                </>
              )}

              {/* ============================================ */}
              {/* PREVIEW DEL TOTAL                            */}
              {/* ============================================ */}
              <div className={`rounded-lg p-4 border ${
                tipoMovimiento === 'INGRESO'
                  ? 'bg-green-50 border-green-100'
                  : 'bg-blue-50 border-blue-100'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tipoMovimiento === 'INGRESO' ? (
                      <TrendingUp className="w-4 h-4 text-green-700" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-blue-700" />
                    )}
                    <div>
                      <p className={`text-sm font-semibold ${
                        tipoMovimiento === 'INGRESO' ? 'text-green-900' : 'text-blue-900'
                      }`}>
                        {tipoMovimiento === 'INGRESO' ? 'Nuevo saldo después de la recarga' : 'Total a descontar de caja'}
                      </p>
                      <p className={`text-[11px] ${
                        tipoMovimiento === 'INGRESO' ? 'text-green-700' : 'text-blue-700'
                      }`}>
                        Saldo actual: L. {formatMoneda(stats.saldoFinal)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xl font-bold tabular-nums ${
                    tipoMovimiento === 'INGRESO' ? 'text-green-700' : 'text-blue-700'
                  }`}>
                    {tipoMovimiento === 'INGRESO' ? '+' : '−'} L. {formatMoneda(
                      form.importe ? parseFloat(form.importe) : 0
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer modal */}
            <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
              <button
                onClick={cerrarModalNuevo}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAgregarMovimiento}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all shadow-sm ${
                  editandoMovimientoId
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                    : (tipoMovimiento === 'INGRESO'
                        ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                        : 'bg-red-600 hover:bg-red-700 shadow-red-600/20')
                }`}
              >
                {editandoMovimientoId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editandoMovimientoId 
                  ? 'Guardar Cambios' 
                  : (tipoMovimiento === 'INGRESO' ? 'Recargar Fondo' : 'Registrar Gasto')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CIERRE DE CAJA */}
      {/* ============================================================ */}
      {showModalCierre && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Cerrar Caja Chica</h2>
                  <p className="text-sm text-gray-500">Resumen del arqueo del día</p>
                </div>
              </div>
              <button
                onClick={() => setShowModalCierre(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Saldo inicial</span>
                <span className="text-sm font-semibold text-gray-900 tabular-nums">L. {formatMoneda(saldoInicial)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">(+) Recargas del día</span>
                <span className="text-sm font-semibold text-green-700 tabular-nums">+ L. {formatMoneda(stats.ingresos - saldoInicial)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">(−) Gastos del día</span>
                <span className="text-sm font-semibold text-red-700 tabular-nums">− L. {formatMoneda(stats.salidas)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-blue-50 px-4 rounded-lg">
                <span className="text-sm font-bold text-blue-900">Saldo Final Calculado</span>
                <span className="text-xl font-bold text-blue-700 tabular-nums">L. {formatMoneda(stats.saldoFinal)}</span>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Efectivo Físico Contado en Caja <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={saldoRealCierre}
                  onChange={(e) => setSaldoRealCierre(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 tabular-nums"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Ingresa el monto físico para verificar diferencias
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Observaciones del Cierre
                </label>
                <textarea
                  rows={2}
                  placeholder="Notas o comentarios sobre el cierre..."
                  value={observacionesCierre}
                  onChange={(e) => setObservacionesCierre(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
              <button
                onClick={() => setShowModalCierre(false)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarCaja}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm shadow-orange-600/20"
              >
                <Lock className="w-4 h-4" />
                Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: APERTURA DE CAJA */}
      {/* ============================================================ */}
      {showModalApertura && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Unlock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Abrir Caja Chica</h2>
                  <p className="text-sm text-gray-500">Iniciar un nuevo período</p>
                </div>
              </div>
              <button
                onClick={() => setShowModalApertura(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Saldo Inicial de Apertura <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold">L.</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={montoApertura}
                    onChange={(e) => setMontoApertura(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Responsable Asignado
                </label>
                <select disabled className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-gray-50 text-gray-500">
                  <option>Asignado automáticamente al usuario activo</option>
                </select>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
              <button
                onClick={() => setShowModalApertura(false)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAbrirCaja}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20"
              >
                <Unlock className="w-4 h-4" />
                Abrir Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: REPORTE DE REEMBOLSO DE CAJA CHICA */}
      {/* ============================================================ */}
      {showModalReporte && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Reporte de Reembolso</h2>
                  <p className="text-sm text-gray-500">
                    Solicitud de reposición de fondos de caja chica
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20">
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
                <button
                  onClick={() => setShowModalReporte(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-1"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Cuerpo del reporte (formato imprimible) */}
            <div className="p-8 bg-white">

              {/* Encabezado corporativo */}
              <div className="flex items-start justify-between pb-6 border-b-2 border-gray-200 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    BIOELECTRÓNICA HONDURAS
                  </h1>
                  <p className="text-xs text-gray-500 mt-1">
                    Barrio Guamilito, 7 calle, 9 avenida, San Pedro Sula, Cortés, Honduras.
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-blue-50 px-3 py-1.5 rounded-md mb-2">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                      Solicitud de Reembolso
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">N° de Reporte</p>
                  <p className="text-sm font-bold text-gray-900 font-mono">
                    CCH-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001
                  </p>
                </div>
              </div>

              {/* Información del período */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Período
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {sesionActiva?.createdAt ? new Date(sesionActiva.createdAt).toLocaleDateString('es-HN') : '—'}
                  </p>
                  <p className="text-[11px] text-gray-500">Apertura del día</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Fecha de Solicitud
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(() => {
                      const d = new Date();
                      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    })()}
                  </p>
                  <p className="text-[11px] text-gray-500">Generado hoy</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Responsable
                  </p>
                  <p className="text-sm font-semibold text-gray-900">{sesionActiva?.creadoPor ? `${sesionActiva.creadoPor.nombre || ''} ${sesionActiva.creadoPor.apellido || ''}`.trim() : (dbUser?.nombre ? `${dbUser.nombre} ${dbUser.apellido || ''}`.trim() : dbUser?.email || '—')}</p>
                  <p className="text-[11px] text-gray-500">Administrador General</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Centro de Costo
                  </p>
                  <p className="text-sm font-semibold text-gray-900">Administración</p>
                  <p className="text-[11px] text-gray-500">Caja Chica Principal</p>
                </div>
              </div>

              {/* Resumen financiero */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Saldo Inicial
                  </p>
                  <p className="text-lg font-bold text-gray-900 tabular-nums">
                    L. {formatMoneda(saldoInicial)}
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">
                    (+) Recargas
                  </p>
                  <p className="text-lg font-bold text-green-700 tabular-nums">
                    L. {formatMoneda(stats.ingresos - saldoInicial)}
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">
                    (−) Gastos
                  </p>
                  <p className="text-lg font-bold text-red-700 tabular-nums">
                    L. {formatMoneda(stats.salidas)}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                    Saldo Actual
                  </p>
                  <p className="text-lg font-bold text-blue-700 tabular-nums">
                    L. {formatMoneda(stats.saldoFinal)}
                  </p>
                </div>
              </div>

              {/* Monto solicitado destacado */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 mb-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider mb-1">
                      Monto Solicitado para Reembolso
                    </p>
                    <p className="text-xs text-blue-200 mt-1">
                      Equivalente al total de gastos registrados en el período
                    </p>
                  </div>
                  <p className="text-3xl font-bold tabular-nums">
                    L. {formatMoneda(stats.salidas)}
                  </p>
                </div>
              </div>

              {/* Detalle de gastos */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-gray-500" />
                  Detalle de Gastos Registrados ({movimientos.filter(m => m.tipo === 'SALIDA').length} movimientos)
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">#</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Fecha</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Categoría</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Cuenta</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Descripción</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Beneficiario</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Doc.</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">N° Doc</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-600">Monto (L.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {movimientos.filter(m => m.tipo === 'SALIDA').map((m, idx) => {
                        const dateObj = new Date(m.createdAt);
                        const d = String(dateObj.getDate()).padStart(2, '0');
                        const mo = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const y = dateObj.getFullYear();
                        return (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-500 tabular-nums">{idx + 1}</td>
                            <td className="px-3 py-2 text-gray-600 tabular-nums whitespace-nowrap">{d}/{mo}/{y}</td>
                            <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{m.categoria}</td>
                            <td className="px-3 py-2 text-gray-500 font-mono">{m.cuentaContable}</td>
                            <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate" title={m.descripcion}>
                              {m.descripcion}
                            </td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{m.beneficiario}</td>
                            <td className="px-3 py-2 text-gray-500 text-[10px]">{m.documento}</td>
                            <td className="px-3 py-2 text-gray-600 font-mono text-[10px]">{m.nroDoc}</td>
                            <td className="px-3 py-2 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                              {formatMoneda(m.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                      <tr>
                        <td colSpan={8} className="px-3 py-3 text-right font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                          Total a Reembolsar
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-blue-700 tabular-nums text-base">
                          L. {formatMoneda(stats.salidas)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Desglose por categoría */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-gray-500" />
                  Resumen por Categoría Contable
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Categoría</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Cuenta Contable</th>
                        <th className="text-center px-3 py-2 font-semibold text-gray-600">Cant. Mov.</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-600">% del Total</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-600">Monto (L.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        const agrupado: Record<string, { categoria: string; cuenta: string; count: number; total: number }> = {};
                        movimientos.filter(m => m.tipo === 'SALIDA').forEach(m => {
                          const key = `${m.categoria}|${m.cuentaContable}`;
                          if (!agrupado[key]) {
                            agrupado[key] = { categoria: m.categoria, cuenta: m.cuentaContable, count: 0, total: 0 };
                          }
                          agrupado[key].count++;
                          agrupado[key].total += m.total;
                        });
                        return Object.values(agrupado)
                          .sort((a, b) => b.total - a.total)
                          .map((g, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-900">{g.categoria}</td>
                              <td className="px-3 py-2 text-gray-500 font-mono">{g.cuenta}</td>
                              <td className="px-3 py-2 text-center text-gray-600 tabular-nums">{g.count}</td>
                              <td className="px-3 py-2 text-right text-gray-600 tabular-nums">
                                {((g.total / stats.salidas) * 100).toFixed(1)}%
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                                {formatMoneda(g.total)}
                              </td>
                            </tr>
                          ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Observaciones */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Observaciones del Período
                </label>
                <textarea
                  rows={3}
                  placeholder="Notas adicionales para contabilidad, justificación de gastos extraordinarios, etc..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
                />
              </div>

              {/* Firmas */}
              <div className="grid grid-cols-3 gap-8 pt-8 border-t-2 border-gray-200">
                <div className="text-center">
                  <div className="border-t-2 border-gray-400 mb-2 mx-4"></div>
                  <p className="text-xs font-bold text-gray-700">{sesionActiva?.creadoPor ? `${sesionActiva.creadoPor.nombre || ''} ${sesionActiva.creadoPor.apellido || ''}`.trim() : (dbUser?.nombre ? `${dbUser.nombre} ${dbUser.apellido || ''}`.trim() : dbUser?.email || '—')}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
                    Solicitante
                  </p>
                  <p className="text-[10px] text-gray-400">Responsable de Caja</p>
                </div>
                <div className="text-center">
                  <div className="border-t-2 border-gray-400 mb-2 mx-4"></div>
                  <p className="text-xs font-bold text-gray-700">___________________</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
                    Revisado por
                  </p>
                  <p className="text-[10px] text-gray-400">Contabilidad</p>
                </div>
                <div className="text-center">
                  <div className="border-t-2 border-gray-400 mb-2 mx-4"></div>
                  <p className="text-xs font-bold text-gray-700">___________________</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
                    Autorizado por
                  </p>
                  <p className="text-[10px] text-gray-400">Gerencia</p>
                </div>
              </div>

              {/* Footer del reporte */}
              <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                <span>
                  Reporte generado automáticamente desde el sistema Bioelectrónica
                </span>
                <span>
                  Página 1 de 1 · {new Date().toLocaleString('es-HN')}
                </span>
              </div>
            </div>

            {/* Footer del modal con acciones */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Info className="w-3.5 h-3.5" />
                <span>El reporte queda registrado en el historial de solicitudes de reembolso</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowModalReporte(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
                >
                  Cerrar
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm shadow-green-600/20">
                  <CheckCircle2 className="w-4 h-4" />
                  Enviar a Contabilidad
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: NUEVA CATEGORÍA DE GASTO */}
      {/* ============================================================ */}
      {showModalCategoria && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Nueva Categoría</h2>
                  <p className="text-sm text-gray-500">Agrega una categoría personalizada de gasto</p>
                </div>
              </div>
              <button
                onClick={() => { setShowModalCategoria(false); setNuevaCategoria(''); setNuevaCuenta(''); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Nombre de la Categoría <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  placeholder="Ej: Combustible, Capacitación, Cafetería..."
                  autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Cuenta Contable <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={nuevaCuenta}
                    onChange={(e) => setNuevaCuenta(e.target.value)}
                    placeholder="Ej: 5102-001"
                    className="w-full pl-10 pr-3 py-2.5 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 tabular-nums"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Código según el plan de cuentas de la empresa (consulta con contabilidad)
                </p>
              </div>

              {/* Categorías existentes */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                  Categorías existentes ({categoriasGasto.length})
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {categoriasGasto.map((cat) => (
                    <span
                      key={cat.nombre}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-md group"
                      title={`Cuenta: ${cat.cuenta}`}
                    >
                      <span>{cat.nombre}</span>
                      <span className="text-[10px] font-mono text-gray-400">{cat.cuenta}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) {
                            setCategoriasGasto(categoriasGasto.filter(c => c.nombre !== cat.nombre));
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                        title="Eliminar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
              <button
                onClick={() => { setShowModalCategoria(false); setNuevaCategoria(''); setNuevaCuenta(''); }}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const limpiaNombre = nuevaCategoria.trim();
                  const limpiaCuenta = nuevaCuenta.trim();
                  if (!limpiaNombre) {
                    alert('Ingresa un nombre para la categoría');
                    return;
                  }
                  if (!limpiaCuenta) {
                    alert('Ingresa la cuenta contable correspondiente');
                    return;
                  }
                  if (categoriasGasto.some(c => c.nombre.toLowerCase() === limpiaNombre.toLowerCase())) {
                    alert('Esa categoría ya existe');
                    return;
                  }
                  setCategoriasGasto([...categoriasGasto, { nombre: limpiaNombre, cuenta: limpiaCuenta }]);
                  setForm({ ...form, categoria: limpiaNombre, cuentaContable: limpiaCuenta });
                  setNuevaCategoria('');
                  setNuevaCuenta('');
                  setShowModalCategoria(false);
                }}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                Crear Categoría
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: SIN PRIVILEGIOS */}
      {/* ============================================================ */}
      {showModalSinPrivilegios && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 mx-auto flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
            <p className="text-sm text-gray-500 mb-6">
              No tienes los privilegios necesarios para realizar esta acción. Solo un Administrador, Gerente o Cajera puede abrir, cerrar o modificar los fondos de la caja chica.
            </p>
            <button
              onClick={() => setShowModalSinPrivilegios(false)}
              className="w-full py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: SOBREGIRO DE FONDOS */}
      {/* ============================================================ */}
      {showModalSobregiro && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 mx-auto flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Fondos Insuficientes</h2>
            <p className="text-sm text-gray-500 mb-6">
              El gasto que intentas registrar ({formatMoneda(parseFloat(form.importe) || 0)} L.) excede el saldo disponible en caja ({formatMoneda(stats.saldoFinal)} L.). Por favor, procede a hacer una recarga de la caja chica antes de registrar este gasto.
            </p>
            <button
              onClick={() => setShowModalSobregiro(false)}
              className="w-full py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CONFIRMACIÓN ELIMINAR */}
      {/* ============================================================ */}
      {modalEliminar.show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 mx-auto flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              ¿Eliminar Movimiento?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Esta acción anulará el registro y recalculará automáticamente los saldos de la caja. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModalEliminar({show: false, id: null})}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAnularConfirm}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-600/20 transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDITAR SALDO INICIAL */}
      {/* ============================================================ */}
      {showModalEditSaldo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-50 mx-auto flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Editar Saldo de Apertura
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Modificar este valor alterará el balance de toda la caja actual. Se recomienda no editarlo a cada momento salvo para corregir un error inicial.
            </p>
            
            <div className="mb-6 text-left">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Nuevo Saldo Inicial <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold">L.</span>
                <input
                  type="number"
                  step="0.01"
                  value={nuevoSaldoApertura}
                  onChange={(e) => setNuevoSaldoApertura(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 tabular-nums"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModalEditSaldo(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateSaldo}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm shadow-orange-600/20 transition-all"
              >
                Actualizar Saldo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
