const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

// 1. Fix formVacio and form initialization
content = content.replace(
  /const \[form, setForm\] = useState\(\{[\s\S]*?notaInterna: ''\n\s+\}\);/,
  `const formVacio = {
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

  const [form, setForm] = useState(formVacio);`
);

// 2. Fix the reset of form
content = content.replace(
  /setForm\(\{[\s\S]*?notaInterna: ''\n\s+\}\);/g,
  `setForm(formVacio);`
);

// 3. Fix handleAnularConfirm and replace eliminarMovimiento
content = content.replace(
  /const eliminarMovimiento = async \(id: string\) => \{[\s\S]*?toast\.error\(res\.error \|\| 'Error al anular'\);\n\s+\}\n\s+\};\n/,
  `const handleAnularConfirm = async () => {
    if (!modalEliminar.id) return;
    const res = await anularCajaChicaMovimiento(modalEliminar.id, dbUser.id);
    if (res.success) {
      toast.success('Movimiento eliminado');
      await cargarSesion();
      setModalEliminar({show: false, id: null});
    } else {
      toast.error(res.error || 'Error al anular');
    }
  };\n`
);

// 4. Update the table actions rendering
const tableActionsOld = `<div className="flex items-center justify-center gap-1">
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
                        <button onClick={() => {
                          setTipoMovimiento(m.tipo);
                          setEditandoMovimientoId(m.id);
                          setForm({
                            categoria: m.categoria || '',
                            cuentaContable: m.cuentaContable || '',
                            descripcion: m.descripcion || '',
                            importe: m.importe ? m.importe.toString() : '0',
                            moneda: m.moneda || 'HNL',
                            tipoCambio: m.tipoCambio || 1,
                            beneficiario: m.beneficiario || '',
                            documento: m.documento || 'FACTURA',
                            nroDoc: m.nroDoc || '',
                            adjuntoUrl: m.adjuntoUrl || '',
                            origenFondos: 'BANCO PRINCIPAL',
                            metodoPago: m.documento || 'EFECTIVO',
                            referenciaTransferencia: m.nroDoc || '',
                            autorizadoPor: '',
                            notaInterna: ''
                          } as any);
                          setShowModalNuevo(true);
                        }} className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded transition-colors" title="Editar">
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

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);
