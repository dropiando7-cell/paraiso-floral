import re

with open('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("import { getOpenSession, openCajaChicaSession, closeCajaChicaSession, registerCajaChicaMovimiento, anularCajaChicaMovimiento, updateCajaChicaSaldoInicial } from './actions';",
"import { getOpenSession, openCajaChicaSession, closeCajaChicaSession, registerCajaChicaMovimiento, anularCajaChicaMovimiento, updateCajaChicaMovimiento, updateCajaChicaSaldoInicial, getUploadUrlCajaChica, openAndFundCajaChicaSession } from './actions';")

# 2. States
content = content.replace("const [showModalApertura, setShowModalApertura] = useState(false);\n", "")
content = content.replace("const [montoApertura, setMontoApertura] = useState('');\n", "")
content = content.replace("const [tipoMovimiento, setTipoMovimiento] = useState('SALIDA');", "const [tipoMovimiento, setTipoMovimiento] = useState<'INGRESO' | 'SALIDA' | 'APERTURA'>('SALIDA');\n  const [editandoMovimientoId, setEditandoMovimientoId] = useState<string | null>(null);\n  const [uploadingDoc, setUploadingDoc] = useState(false);\n  const [modalEliminar, setModalEliminar] = useState<{show: boolean, id: string | null}>({show: false, id: null});\n  const [showModalEditSaldo, setShowModalEditSaldo] = useState(false);\n  const [nuevoSaldoApertura, setNuevoSaldoApertura] = useState('');")

# 3. Form
content = content.replace("const [form, setForm] = useState({\n    categoria: '',\n    descripcion: '',\n    documento: 'FACTURA',\n    nroDoc: '',\n    importe: '0',\n    moneda: 'HNL',\n    tipoCambio: 1,\n    beneficiario: ''\n  });",
"const formVacio = {\n    categoria: '',\n    cuentaContable: '',\n    descripcion: '',\n    importe: '',\n    moneda: 'HNL',\n    tipoCambio: 1,\n    documento: 'FACTURA',\n    nroDoc: '',\n    adjuntoUrl: '',\n    beneficiario: '',\n    origenFondos: '',\n    metodoPago: 'EFECTIVO',\n    cuentaOrigen: '',\n    referenciaTransferencia: '',\n    autorizadoPor: '',\n    notaInterna: ''\n  };\n\n  const [form, setForm] = useState(formVacio);")

# 4. handleAbrirCaja + upload logic
handleUpdateSaldoStr = """  const handleUpdateSaldo = async () => {
    if (!sesionActiva) return;
    const nuevo = parseFloat(nuevoSaldoApertura);
    if (isNaN(nuevo) || nuevo < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    const res = await updateCajaChicaSaldoInicial(sesionActiva.id, nuevo, dbUser.id);
    if (res.success) {
      toast.success('Saldo inicial actualizado');
      await loadData();
      setShowModalEditSaldo(false);
    } else {
      toast.error(res.error || 'Error al actualizar saldo');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploadingDoc(true);
      const res = await getUploadUrlCajaChica(file.name, file.type, dbUser.id);
      if (!res.success || !res.uploadUrl) throw new Error(res.error || 'Error getting url');
      
      const upload = await fetch(res.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });
      
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
  
  const handleAnularConfirm = async () => {
    if (!modalEliminar.id) return;
    const res = await anularCajaChicaMovimiento(modalEliminar.id, dbUser.id);
    if (res.success) {
      toast.success('Movimiento eliminado');
      await loadData();
      setModalEliminar({show: false, id: null});
    } else {
      toast.error(res.error || 'Error al anular');
    }
  };
"""
content = re.sub(r'const handleAbrirCaja = async \(e: React\.FormEvent\) => \{[\s\S]*?toast\.error\(res\.error \|\| \'Error al abrir\'\);\n    \}\n    setIsSaving\(false\);\n  \};', handleUpdateSaldoStr, content)

# 5. handleAgregarMovimiento
content = re.sub(r'const res = await registerCajaChicaMovimiento\([\s\S]*?dbUser\.id\n    \);',
"""let res;
    const payload = {
      categoria: form.categoria,
      cuentaContable: (form as any).cuentaContable || undefined,
      descripcion: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? (form.descripcion || `${form.categoria} desde ${(form as any).origenFondos}`) : form.descripcion,
      documento: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? (form as any).metodoPago : form.documento,
      nroDoc: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? ((form as any).referenciaTransferencia || undefined) : (form.nroDoc || undefined),
      importe: importeNum,
      moneda: form.moneda,
      tipoCambio: tipoCambioNum,
      total,
      adjuntoUrl: (form as any).adjuntoUrl || undefined,
      beneficiario: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? undefined : (form.beneficiario || undefined),
      origenFondos: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? (form as any).origenFondos : undefined,
      metodoPago: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? (form as any).metodoPago : undefined,
      referenciaTransferencia: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? (form as any).referenciaTransferencia : undefined,
      autorizadoPor: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? (form as any).autorizadoPor : undefined,
    };

    if (editandoMovimientoId) {
      res = await updateCajaChicaMovimiento(editandoMovimientoId, payload, dbUser.id);
    } else if (tipoMovimiento === 'APERTURA') {
      res = await openAndFundCajaChicaSession(dbUser.organizationId, payload, dbUser.id);
    } else {
      if (!sessionData?.id) return;
      res = await registerCajaChicaMovimiento(sessionData.id, tipoMovimiento as any, payload, dbUser.id);
    }""", content)

content = content.replace("toast.success('Movimiento registrado con éxito');",
"toast.success(editandoMovimientoId ? 'Movimiento actualizado' : (tipoMovimiento === 'APERTURA' ? 'Caja abierta con fondo' : 'Movimiento registrado'));")

content = content.replace("setForm({\n        categoria: '',\n        descripcion: '',\n        documento: 'FACTURA',\n        nroDoc: '',\n        importe: '0',\n        moneda: 'HNL',\n        tipoCambio: 1,\n        beneficiario: ''\n      });", "setForm(formVacio);")

# 6. Delete method usage
content = content.replace("onClick={() => setShowModalApertura(true)}", "onClick={() => { setTipoMovimiento('APERTURA'); setForm({ ...formVacio, categoria: 'Apertura de caja', descripcion: 'Fondo inicial asignado a la caja chica' } as any); setShowModalNuevo(true); }}")
content = content.replace("onClick={() => { setTipoMovimiento('INGRESO'); setShowModalNuevo(true); }}", "onClick={() => { setTipoMovimiento('INGRESO'); setForm(formVacio); setEditandoMovimientoId(null); setShowModalNuevo(true); }}")
content = content.replace("onClick={() => { setTipoMovimiento('SALIDA'); setShowModalNuevo(true); }}", "onClick={() => { setTipoMovimiento('SALIDA'); setForm(formVacio); setEditandoMovimientoId(null); setShowModalNuevo(true); }}")


# 7. Saldo Inicial Edit button
cardOld = '<p className="text-xs text-gray-500 font-medium mb-1">Saldo de Apertura</p>'
cardNew = `<div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-gray-500 font-medium">Saldo de Apertura</p>
              {sessionData?.estado === 'ABIERTA' && (
                <button
                  onClick={() => {
                    setNuevoSaldoApertura(saldoInicial.toString());
                    setShowModalEditSaldo(true);
                  }}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors"
                  title="Editar Saldo Inicial"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>`
content = content.replace(cardOld, cardNew)

# 8. Modals
modals = """
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
"""
content = content.replace("    </div>\n  );\n}", modals + "\n    </div>\n  );\n}")


with open('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'w') as f:
    f.write(content)

