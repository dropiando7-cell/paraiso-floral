import React, { useState, useMemo } from 'react';
import {
  Wallet, Plus, Lock, Unlock, TrendingUp, TrendingDown, DollarSign,
  Search, Filter, Download, Printer, X, FileText, Calendar,
  ArrowUpCircle, ArrowDownCircle, Receipt, AlertCircle, CheckCircle2,
  Edit2, Trash2, ChevronDown, RefreshCcw, PieChart, History, FileSpreadsheet
} from 'lucide-react';

// ============================================================
// MÓDULO DE CONTROL DE CAJA CHICA - Bioelectrónica Honduras
// Componente Next.js / React compatible con el dashboard existente
// Fuente: Inter (Google Fonts)
// ============================================================

const CajaChica = () => {
  // -------------------- ESTADO PRINCIPAL --------------------
  const [cajaAbierta, setCajaAbierta] = useState(true);
  const [saldoInicial] = useState(5000.00);
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [showModalCierre, setShowModalCierre] = useState(false);
  const [showModalApertura, setShowModalApertura] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState('SALIDA');

  const [movimientos, setMovimientos] = useState([
    {
      id: 1,
      fecha: '2026-05-13 08:15',
      tipo: 'INGRESO',
      categoria: 'Apertura',
      descripcion: 'Apertura de caja chica - Saldo inicial',
      documento: 'SIN DOCUMENTO',
      nroDoc: '—',
      importe: 5000.00,
      moneda: 'HNL',
      tipoCambio: 1,
      total: 5000.00,
      responsable: 'samuel.test',
      beneficiario: '—',
      estado: 'REGISTRADO'
    },
    {
      id: 2,
      fecha: '2026-05-13 09:42',
      tipo: 'SALIDA',
      categoria: 'Papelería',
      descripcion: 'Compra de tóner y resmas para impresora',
      documento: 'FACTURA',
      nroDoc: '001-2345',
      importe: 850.00,
      moneda: 'HNL',
      tipoCambio: 1,
      total: 850.00,
      responsable: 'emilia.zapata',
      beneficiario: 'Office Depot',
      estado: 'REGISTRADO'
    },
    {
      id: 3,
      fecha: '2026-05-13 11:20',
      tipo: 'SALIDA',
      categoria: 'Transporte',
      descripcion: 'Combustible vehículo de entrega ruta SPS',
      documento: 'FACTURA',
      nroDoc: '002-8821',
      importe: 1200.00,
      moneda: 'HNL',
      tipoCambio: 1,
      total: 1200.00,
      responsable: 'samuel.test',
      beneficiario: 'UNO Gasolinera',
      estado: 'REGISTRADO'
    },
    {
      id: 4,
      fecha: '2026-05-13 13:05',
      tipo: 'SALIDA',
      categoria: 'Alimentación',
      descripcion: 'Almuerzo de equipo técnico (5 personas)',
      documento: 'BOLETA',
      nroDoc: '003-1102',
      importe: 75.00,
      moneda: 'USD',
      tipoCambio: 24.85,
      total: 1863.75,
      responsable: 'emilia.zapata',
      beneficiario: 'Restaurante Don Pepe',
      estado: 'REGISTRADO'
    },
    {
      id: 5,
      fecha: '2026-05-13 15:30',
      tipo: 'INGRESO',
      categoria: 'Reembolso',
      descripcion: 'Reembolso de gastos no autorizados',
      documento: 'RECIBO INTERNO',
      nroDoc: 'RI-0045',
      importe: 200.00,
      moneda: 'HNL',
      tipoCambio: 1,
      total: 200.00,
      responsable: 'samuel.test',
      beneficiario: 'Caja Chica',
      estado: 'REGISTRADO'
    },
  ]);

  // -------------------- FORMULARIO NUEVO MOVIMIENTO --------------------
  const [form, setForm] = useState({
    categoria: '',
    descripcion: '',
    documento: 'FACTURA',
    nroDoc: '',
    importe: '',
    moneda: 'HNL',
    tipoCambio: 1,
    beneficiario: ''
  });

  // -------------------- CÁLCULOS --------------------
  const stats = useMemo(() => {
    const ingresos = movimientos
      .filter(m => m.tipo === 'INGRESO')
      .reduce((acc, m) => acc + m.total, 0);
    const salidas = movimientos
      .filter(m => m.tipo === 'SALIDA')
      .reduce((acc, m) => acc + m.total, 0);
    const saldoFinal = ingresos - salidas;
    return { ingresos, salidas, saldoFinal };
  }, [movimientos]);

  const categorias = useMemo(() => {
    const cats = {};
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

  // -------------------- HELPERS --------------------
  const formatMoneda = (valor) =>
    new Intl.NumberFormat('es-HN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);

  const handleAgregarMovimiento = () => {
    if (!form.categoria || !form.descripcion || !form.importe) {
      alert('Por favor completa los campos obligatorios');
      return;
    }
    const importeNum = parseFloat(form.importe);
    const tipoCambioNum = parseFloat(form.tipoCambio) || 1;
    const total = form.moneda === 'USD' ? importeNum * tipoCambioNum : importeNum;

    const nuevo = {
      id: movimientos.length + 1,
      fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
      tipo: tipoMovimiento,
      categoria: form.categoria,
      descripcion: form.descripcion,
      documento: form.documento,
      nroDoc: form.nroDoc || '—',
      importe: importeNum,
      moneda: form.moneda,
      tipoCambio: tipoCambioNum,
      total,
      responsable: 'samuel.test',
      beneficiario: form.beneficiario || '—',
      estado: 'REGISTRADO'
    };
    setMovimientos([...movimientos, nuevo]);
    setForm({
      categoria: '',
      descripcion: '',
      documento: 'FACTURA',
      nroDoc: '',
      importe: '',
      moneda: 'HNL',
      tipoCambio: 1,
      beneficiario: ''
    });
    setShowModalNuevo(false);
  };

  const eliminarMovimiento = (id) => {
    if (confirm('¿Eliminar este movimiento?')) {
      setMovimientos(movimientos.filter(m => m.id !== id));
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
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cajaAbierta
                    ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                    : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cajaAbierta ? 'bg-green-500' : 'bg-red-500'}`} />
                  {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Gestión de ingresos, salidas y arqueo de la caja chica administrativa.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Período actual: <span className="font-medium text-gray-600">13 / Mayo / 2026</span> · Responsable: <span className="font-medium text-gray-600">samuel.test</span>
              </p>
            </div>
          </div>

          {/* Botones de acción rápida */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <RefreshCcw className="w-4 h-4" />
              Sincronizar
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* ============== ACCIONES DE CAJA ============== */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowModalApertura(true)}
                disabled={cajaAbierta}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${cajaAbierta
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20'
                  }`}
              >
                <Unlock className="w-4 h-4" />
                Abrir Caja
              </button>
              <button
                onClick={() => setShowModalCierre(true)}
                disabled={!cajaAbierta}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${!cajaAbierta
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-500/20'
                  }`}
              >
                <Lock className="w-4 h-4" />
                Cerrar Caja
              </button>
              <div className="h-8 w-px bg-gray-200 mx-1" />
              <button
                onClick={() => { setTipoMovimiento('INGRESO'); setShowModalNuevo(true); }}
                disabled={!cajaAbierta}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${!cajaAbierta
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                    : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                  }`}
              >
                <ArrowUpCircle className="w-4 h-4" />
                Registrar Ingreso
              </button>
              <button
                onClick={() => { setTipoMovimiento('SALIDA'); setShowModalNuevo(true); }}
                disabled={!cajaAbierta}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${!cajaAbierta
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  }`}
              >
                <ArrowDownCircle className="w-4 h-4" />
                Registrar Salida
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>Apertura: <span className="font-semibold text-gray-700">13/05/2026 08:15 a.m.</span></span>
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
              <span className="text-xs font-medium text-gray-400">INICIAL</span>
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
            <p className="text-xs text-gray-500 font-medium mb-1">Total Ingresos</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
              L. {formatMoneda(stats.ingresos)}
            </p>
            <p className="text-xs text-gray-400 mt-2">Reembolsos y aportes</p>
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
            <p className="text-xs text-gray-500 font-medium mb-1">Total Salidas</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
              L. {formatMoneda(stats.salidas)}
            </p>
            <p className="text-xs text-gray-400 mt-2">Gastos registrados</p>
          </div>

          {/* Saldo Final */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 border border-blue-700 rounded-xl p-5 text-white shadow-lg shadow-blue-600/20">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
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
                <h2 className="text-sm font-semibold text-gray-900">Desglose de Salidas por Categoría</h2>
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
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filtroTipo === t
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      {t === 'TODOS' ? 'Todos' : t === 'INGRESO' ? 'Ingresos' : 'Salidas'}
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
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Moneda</th>
                  <th className="text-right px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">T. Cambio</th>
                  <th className="text-right px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total (L.)</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Responsable</th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movimientosFiltrados.map((m) => (
                  <tr key={m.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-5 py-3 text-xs text-gray-600 whitespace-nowrap tabular-nums">
                      {m.fecha}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {m.tipo === 'INGRESO' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-[11px] font-semibold">
                          <ArrowUpCircle className="w-3 h-3" />
                          INGRESO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-700 text-[11px] font-semibold">
                          <ArrowDownCircle className="w-3 h-3" />
                          SALIDA
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap font-medium">
                      {m.categoria}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-[220px] truncate" title={m.descripcion}>
                      {m.descripcion}
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Beneficiario: {m.beneficiario}
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
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.moneda === 'USD' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {m.moneda}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 text-right tabular-nums whitespace-nowrap">
                      {m.moneda === 'USD' ? m.tipoCambio.toFixed(4) : '—'}
                    </td>
                    <td className={`px-3 py-3 text-sm font-bold text-right tabular-nums whitespace-nowrap ${m.tipo === 'INGRESO' ? 'text-green-700' : 'text-red-700'
                      }`}>
                      {m.tipo === 'INGRESO' ? '+' : '-'} {formatMoneda(m.total)}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {m.responsable}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded transition-colors" title="Editar">
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
                    <td colSpan="12" className="px-5 py-12 text-center">
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
                    <td colSpan="9" className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Saldo Final en Caja
                    </td>
                    <td className="px-3 py-3 text-right text-base font-bold text-blue-700 tabular-nums">
                      L. {formatMoneda(stats.saldoFinal)}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tipoMovimiento === 'INGRESO' ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                  {tipoMovimiento === 'INGRESO'
                    ? <ArrowUpCircle className="w-6 h-6 text-green-600" />
                    : <ArrowDownCircle className="w-6 h-6 text-red-600" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Registrar {tipoMovimiento === 'INGRESO' ? 'Ingreso' : 'Salida'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Completa la información del movimiento de caja
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModalNuevo(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Selector tipo */}
            <div className="px-6 pt-5">
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setTipoMovimiento('INGRESO')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all ${tipoMovimiento === 'INGRESO'
                      ? 'bg-white text-green-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Ingreso
                </button>
                <button
                  onClick={() => setTipoMovimiento('SALIDA')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all ${tipoMovimiento === 'SALIDA'
                      ? 'bg-white text-red-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  Salida
                </button>
              </div>
            </div>

            {/* Formulario */}
            <div className="p-6 space-y-4">
              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
                >
                  <option value="">Selecciona una categoría...</option>
                  {tipoMovimiento === 'INGRESO' ? (
                    <>
                      <option>Apertura</option>
                      <option>Reembolso</option>
                      <option>Aporte de capital</option>
                      <option>Devolución</option>
                      <option>Otros ingresos</option>
                    </>
                  ) : (
                    <>
                      <option>Papelería</option>
                      <option>Transporte</option>
                      <option>Alimentación</option>
                      <option>Limpieza</option>
                      <option>Mantenimiento</option>
                      <option>Servicios</option>
                      <option>Herramientas</option>
                      <option>Refrigerios</option>
                      <option>Mensajería</option>
                      <option>Otros gastos</option>
                    </>
                  )}
                </select>
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
                  placeholder="Describe el motivo del movimiento..."
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
                    onChange={(e) => setForm({ ...form, documento: e.target.value })}
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

              {/* Importe + Moneda + T. Cambio */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Importe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.importe}
                    onChange={(e) => setForm({ ...form, importe: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Moneda
                  </label>
                  <select
                    value={form.moneda}
                    onChange={(e) => setForm({ ...form, moneda: e.target.value, tipoCambio: e.target.value === 'USD' ? 24.85 : 1 })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
                  >
                    <option value="HNL">HNL (L.)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Tipo de Cambio
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.tipoCambio}
                    onChange={(e) => setForm({ ...form, tipoCambio: e.target.value })}
                    disabled={form.moneda === 'HNL'}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 tabular-nums disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              </div>

              {/* Preview del total */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-blue-900">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Total en Lempiras</span>
                </div>
                <span className="text-lg font-bold text-blue-700 tabular-nums">
                  L. {formatMoneda(
                    form.importe
                      ? (form.moneda === 'USD'
                        ? parseFloat(form.importe) * parseFloat(form.tipoCambio || 1)
                        : parseFloat(form.importe))
                      : 0
                  )}
                </span>
              </div>
            </div>

            {/* Footer modal */}
            <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
              <button
                onClick={() => setShowModalNuevo(false)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAgregarMovimiento}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all shadow-sm ${tipoMovimiento === 'INGRESO'
                    ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                  }`}
              >
                <Plus className="w-4 h-4" />
                Registrar {tipoMovimiento === 'INGRESO' ? 'Ingreso' : 'Salida'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CIERRE DE CAJA */}
      {/* ============================================================ */}
      {showModalCierre && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                <span className="text-sm text-gray-500">(+) Ingresos del día</span>
                <span className="text-sm font-semibold text-green-700 tabular-nums">+ L. {formatMoneda(stats.ingresos - saldoInicial)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">(−) Salidas del día</span>
                <span className="text-sm font-semibold text-red-700 tabular-nums">− L. {formatMoneda(stats.salidas)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-blue-50 px-4 rounded-lg">
                <span className="text-sm font-bold text-blue-900">Saldo Final Calculado</span>
                <span className="text-xl font-bold text-blue-700 tabular-nums">L. {formatMoneda(stats.saldoFinal)}</span>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Efectivo Físico Contado en Caja
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
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
                onClick={() => { setCajaAbierta(false); setShowModalCierre(false); }}
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Responsable Asignado
                </label>
                <select className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white">
                  <option>samuel.test - Administrador General</option>
                  <option>emilia.zapata - Comercial</option>
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
                onClick={() => { setCajaAbierta(true); setShowModalApertura(false); }}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20"
              >
                <Unlock className="w-4 h-4" />
                Abrir Caja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CajaChica;
