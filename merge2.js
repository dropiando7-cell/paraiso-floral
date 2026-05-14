const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

// 1. R2 Upload and update handlers
const uploadLogic = `  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
`;

content = content.replace(/const eliminarMovimiento = async \(id: string\) => \{[\s\S]*?alert\(res\.error \|\| 'Error al anular'\);\n\s+\}\n\s+\};/, uploadLogic);
content = content.replace(/const eliminarMovimiento = \(id: number\) => \{[\s\S]*?\}\n\s+\};/, uploadLogic);

// Replace default `eliminarMovimiento` that might have been in the new design
content = content.replace(/const eliminarMovimiento = async \(id: string\) => \{[\s\S]*?\}\s*\};/, uploadLogic);

// 2. Fix the Table actions
const tableActionsOld = `<div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      </div>`;
const tableActionsNew = `<div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => {
                            setTipoMovimiento(m.tipo as any);
                            setEditandoMovimientoId(m.id);
                            setForm({
                              categoria: m.categoria || '',
                              cuentaContable: m.cuentaContable || '',
                              descripcion: m.descripcion || '',
                              documento: m.documento || 'FACTURA',
                              nroDoc: m.nroDoc || '',
                              importe: m.importe ? m.importe.toString() : '0',
                              moneda: m.moneda || 'HNL',
                              tipoCambio: m.tipoCambio || 1,
                              beneficiario: m.beneficiario || '',
                              adjuntoUrl: m.adjuntoUrl || '',
                              origenFondos: m.origenFondos || '',
                              metodoPago: m.metodoPago || '',
                              referenciaTransferencia: m.referenciaTransferencia || '',
                              autorizadoPor: m.autorizadoPor || ''
                            } as any);
                            setShowModalNuevo(true);
                          }}
                          className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded transition-colors" 
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {m.adjuntoUrl ? (
                          <a href={m.adjuntoUrl} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-gray-50 text-blue-500 hover:text-blue-700 rounded transition-colors" title="Ver documento">
                            <FileText className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button disabled className="p-1.5 text-gray-300 rounded cursor-not-allowed" title="Sin documento">
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setModalEliminar({show: true, id: m.id})}
                          className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>`;

content = content.replace(tableActionsOld, tableActionsNew);
// Also try it if the opacity class was already removed
const tableActionsOldNoOpacity = tableActionsOld.replace(" opacity-0 group-hover:opacity-100 transition-opacity", "");
content = content.replace(tableActionsOldNoOpacity, tableActionsNew);

// 3. Modals additions
const modals = `
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
}`;

content = content.replace(/    <\/div>\n  \);\n\};/, modals);

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);
