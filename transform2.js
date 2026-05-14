const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

// 1. Add new actions to imports
content = content.replace(
  "registerCajaChicaMovimiento,",
  "registerCajaChicaMovimiento,\n  updateCajaChicaMovimiento,\n  getUploadUrlCajaChica,"
);

// 2. Add states
content = content.replace(
  /const \[montoApertura, setMontoApertura\] = useState\(''\);/,
  `const [montoApertura, setMontoApertura] = useState('');
  const [editandoMovimientoId, setEditandoMovimientoId] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [modalEliminar, setModalEliminar] = useState<{show: boolean, id: string | null}>({show: false, id: null});`
);

// 3. Update initial form and reset behavior
content = content.replace(
  /const formVacio = \{/,
  `const formVacio = {
    adjuntoUrl: '',`
);

// 4. Update the handleAgregarMovimiento to support edit
const submitLogicOld = `const res = await registerCajaChicaMovimiento(
      sesionActiva.id,
      tipoMovimiento as any,
      {
        categoria: form.categoria,
        cuentaContable: tipoMovimiento === 'SALIDA' ? form.cuentaContable : undefined,
        descripcion: tipoMovimiento === 'INGRESO'
          ? (form.descripcion || \`\${form.categoria} desde \${form.origenFondos}\`)
          : form.descripcion,
        documento: tipoMovimiento === 'INGRESO' ? form.metodoPago : form.documento,
        nroDoc: tipoMovimiento === 'INGRESO'
          ? (form.referenciaTransferencia || undefined)
          : (form.nroDoc || undefined),
        importe: importeNum,
        moneda: form.moneda,
        tipoCambio: form.tipoCambio,
        total,
        beneficiario: tipoMovimiento === 'INGRESO' ? undefined : (form.beneficiario || undefined),
        origenFondos: tipoMovimiento === 'INGRESO' ? form.origenFondos : undefined,
        metodoPago: tipoMovimiento === 'INGRESO' ? form.metodoPago : undefined,
        referenciaTransferencia: tipoMovimiento === 'INGRESO' ? form.referenciaTransferencia : undefined,
        autorizadoPor: tipoMovimiento === 'INGRESO' ? form.autorizadoPor : undefined,
      },
      dbUser.id
    );

    if (res.success) {`;

const submitLogicNew = `let res;
    const payload = {
      categoria: form.categoria,
      cuentaContable: tipoMovimiento === 'SALIDA' ? form.cuentaContable : undefined,
      descripcion: tipoMovimiento === 'INGRESO'
        ? (form.descripcion || \`\${form.categoria} desde \${form.origenFondos}\`)
        : form.descripcion,
      documento: tipoMovimiento === 'INGRESO' ? form.metodoPago : form.documento,
      nroDoc: tipoMovimiento === 'INGRESO'
        ? (form.referenciaTransferencia || undefined)
        : (form.nroDoc || undefined),
      importe: importeNum,
      moneda: form.moneda,
      tipoCambio: form.tipoCambio,
      total,
      adjuntoUrl: form.adjuntoUrl || undefined,
      beneficiario: tipoMovimiento === 'INGRESO' ? undefined : (form.beneficiario || undefined),
      origenFondos: tipoMovimiento === 'INGRESO' ? form.origenFondos : undefined,
      metodoPago: tipoMovimiento === 'INGRESO' ? form.metodoPago : undefined,
      referenciaTransferencia: tipoMovimiento === 'INGRESO' ? form.referenciaTransferencia : undefined,
      autorizadoPor: tipoMovimiento === 'INGRESO' ? form.autorizadoPor : undefined,
    };

    if (editandoMovimientoId) {
      res = await updateCajaChicaMovimiento(editandoMovimientoId, payload, dbUser.id);
    } else {
      res = await registerCajaChicaMovimiento(sesionActiva.id, tipoMovimiento as any, payload, dbUser.id);
    }

    if (res.success) {
      toast.success(editandoMovimientoId ? 'Movimiento actualizado correctamente' : 'Movimiento registrado exitosamente');`;

content = content.replace(submitLogicOld, submitLogicNew);
content = content.replace(
  /toast\.success\('Movimiento registrado exitosamente'\);/,
  `` // remove the old toast.success because it's merged into the new block
);

// 5. Update delete logic to use the beautiful modal
const deleteFuncOld = `const handleAnular = async (id: string) => {
    if (!confirm('¿Estás seguro de anular este movimiento? Esto recalculará los totales.')) return;
    const res = await anularCajaChicaMovimiento(id, dbUser.id);
    if (res.success) {
      toast.success('Movimiento anulado');
      fetchSession();
    } else {
      toast.error(res.error || 'Error al anular');
    }
  };`;

const deleteFuncNew = `const handleAnularConfirm = async () => {
    if (!modalEliminar.id) return;
    const res = await anularCajaChicaMovimiento(modalEliminar.id, dbUser.id);
    if (res.success) {
      toast.success('Movimiento eliminado');
      fetchSession();
      setModalEliminar({show: false, id: null});
    } else {
      toast.error(res.error || 'Error al eliminar');
    }
  };`;
content = content.replace(deleteFuncOld, deleteFuncNew);

// Update table actions (pencil and trash)
const editTrashOld = `                                  <button onClick={() => toast.error('Editando no implementado')} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors" title="Ver adjunto">
                                    <FileText className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleAnular(m.id)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                                    <Trash2 className="w-4 h-4" />
                                  </button>`;

const editTrashNew = `                                  <button onClick={() => {
                                      setTipoMovimiento(m.tipo);
                                      setEditandoMovimientoId(m.id);
                                      setForm({
                                        categoria: m.categoria,
                                        cuentaContable: m.cuentaContable || '',
                                        descripcion: m.descripcion,
                                        importe: m.importe.toString(),
                                        moneda: m.moneda,
                                        tipoCambio: m.tipoCambio || 1,
                                        beneficiario: m.beneficiario || '',
                                        documento: m.documento,
                                        nroDoc: m.nroDoc || '',
                                        adjuntoUrl: m.adjuntoUrl || '',
                                        origenFondos: 'BANCO PRINCIPAL',
                                        metodoPago: m.documento,
                                        referenciaTransferencia: m.nroDoc || '',
                                        autorizadoPor: ''
                                      });
                                      setShowModalNuevo(true);
                                    }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  {m.adjuntoUrl ? (
                                    <a href={m.adjuntoUrl} target="_blank" rel="noreferrer" className="p-1 hover:bg-gray-100 rounded text-blue-500 hover:text-blue-700 transition-colors" title="Ver adjunto">
                                      <FileText className="w-4 h-4" />
                                    </a>
                                  ) : (
                                    <button disabled className="p-1 hover:bg-gray-100 rounded text-gray-300 transition-colors cursor-not-allowed" title="Sin adjunto">
                                      <FileText className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button onClick={() => setModalEliminar({show: true, id: m.id})} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                                    <Trash2 className="w-4 h-4" />
                                  </button>`;
content = content.replace(editTrashOld, editTrashNew);

// Add file upload logic and file input component
const handleFileUpload = `
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
      
      setForm(prev => ({ ...prev, adjuntoUrl: res.publicUrl }));
      toast.success('Documento adjuntado correctamente');
    } catch (err) {
      console.error(err);
      toast.error('Error al subir el documento');
    } finally {
      setUploadingDoc(false);
    }
  };
`;

content = content.replace("const handleAgregarMovimiento", handleFileUpload + "\n  const handleAgregarMovimiento");

// Replace File Input UI
const fileInputOld = `<input type="file" className="hidden" accept="image/*,application/pdf" />`;
const fileInputNew = `<input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" disabled={uploadingDoc} />`;
content = content.replace(fileInputOld, fileInputNew);

const filePlaceholderOld = `<span className="text-sm text-gray-500">
                        Adjuntar boleta, voucher o captura de transferencia
                      </span>`;
const filePlaceholderNew = `<span className="text-sm text-gray-500">
                        {uploadingDoc ? 'Subiendo documento...' : (form.adjuntoUrl ? 'Documento cargado (Clic para cambiar)' : 'Adjuntar boleta, voucher o captura de transferencia')}
                      </span>`;
content = content.replace(filePlaceholderOld, filePlaceholderNew);

// Fix modal title for Edit
content = content.replace(
  /<h2 className="text-lg font-bold text-gray-900">\{tipoMovimiento === 'INGRESO' \? 'Recargar Fondo' : 'Registrar Gasto'\}<\/h2>/,
  `<h2 className="text-lg font-bold text-gray-900">{editandoMovimientoId ? 'Editar Movimiento' : (tipoMovimiento === 'INGRESO' ? 'Recargar Fondo' : 'Registrar Gasto')}</h2>`
);

content = content.replace(
  /\{tipoMovimiento === 'INGRESO' \? 'Recarga' : 'Gasto'\}/g,
  `{editandoMovimientoId ? 'Edición' : (tipoMovimiento === 'INGRESO' ? 'Recarga' : 'Gasto')}`
);

content = content.replace(
  /<button\s+onClick=\{handleAgregarMovimiento\}\s+className=\{`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all shadow-sm \$\{\s+tipoMovimiento === 'INGRESO'\s+\? 'bg-green-600 hover:bg-green-700 shadow-green-600\/20'\s+: 'bg-red-600 hover:bg-red-700 shadow-red-600\/20'\s+\}`\}\s+>\s+<Plus className="w-4 h-4" \/>\s+\{tipoMovimiento === 'INGRESO' \? 'Recargar Fondo' : 'Registrar Gasto'\}\s+<\/button>/,
  `<button
                onClick={handleAgregarMovimiento}
                disabled={uploadingDoc}
                className={\`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all shadow-sm \${
                  tipoMovimiento === 'INGRESO'
                    ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                } \${uploadingDoc ? 'opacity-70 cursor-not-allowed' : ''}\`}
              >
                <Plus className="w-4 h-4" />
                {editandoMovimientoId ? 'Guardar Cambios' : (tipoMovimiento === 'INGRESO' ? 'Recargar Fondo' : 'Registrar Gasto')}
              </button>`
);

content = content.replace(
  /onClick=\{\(\) => setShowModalNuevo\(false\)\}/g,
  `onClick={() => { setShowModalNuevo(false); setEditandoMovimientoId(null); setForm(formVacio); }}`
);

// Append the Beautiful Delete Modal at the end of the file, just before the closing </div> of the main component return
const deleteModalStr = `

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
`;

content = content.replace("    </div>\n  );\n}", deleteModalStr + "\n    </div>\n  );\n}");

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);

console.log("Transform applied successfully.");
