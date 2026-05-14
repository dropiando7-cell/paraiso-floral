const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

// 1. Imports
content = content.replace(
  "import {\n  getSesionActivaAction,\n  abrirCajaAction,\n  cerrarCajaAction,\n  registrarMovimientoAction,\n  anularMovimientoAction\n} from '@/app/actions/cajaChica';",
  "import { getOpenSession, openCajaChicaSession, closeCajaChicaSession, registerCajaChicaMovimiento,\n  updateCajaChicaMovimiento, updateCajaChicaSaldoInicial, getUploadUrlCajaChica, anularCajaChicaMovimiento, openAndFundCajaChicaSession } from './actions';\nimport toast from 'react-hot-toast';"
);

// 2. Component definition
content = content.replace(
  "const CajaChica = () => {",
  "export default function CajaChicaClient({ dbUser, organization }: { dbUser: any, organization: any }) {"
);

// 3. States
content = content.replace(
  "const [tipoMovimiento, setTipoMovimiento] = useState('SALIDA');",
  "const [tipoMovimiento, setTipoMovimiento] = useState<'INGRESO' | 'SALIDA' | 'APERTURA'>('SALIDA');\n  const [editandoMovimientoId, setEditandoMovimientoId] = useState<string | null>(null);\n  const [uploadingDoc, setUploadingDoc] = useState(false);\n  const [modalEliminar, setModalEliminar] = useState<{show: boolean, id: string | null}>({show: false, id: null});\n  const [showModalEditSaldo, setShowModalEditSaldo] = useState(false);\n  const [nuevoSaldoApertura, setNuevoSaldoApertura] = useState('');"
);

// 4. formVacio
content = content.replace(
  "const [form, setForm] = useState({",
  "const formVacio = {\n    categoria: '',\n    cuentaContable: '',\n    descripcion: '',\n    importe: '',\n    moneda: 'HNL',\n    tipoCambio: 1,\n    documento: 'FACTURA',\n    nroDoc: '',\n    adjuntoUrl: '',\n    beneficiario: '',\n    origenFondos: '',\n    metodoPago: 'EFECTIVO',\n    cuentaOrigen: '',\n    referenciaTransferencia: '',\n    autorizadoPor: '',\n    notaInterna: ''\n  };\n\n  const [form, setForm] = useState<any>(formVacio);"
);
// Remove the rest of the old useState object
content = content.replace(
  /    \/\/ Campos compartidos[\s\S]*?notaInterna: ''\n  \}\);/,
  ""
);

// 5. cargarSesion
content = content.replace(
  "const res = await getSesionActivaAction();",
  "const res = await getOpenSession(organization?.id || dbUser?.organizationId);"
);

// 6. submit logic
content = content.replace(
  "const res = await registrarMovimientoAction({",
  `let res;\n    const payload = {`
);
const submitOld = `      sesionId: sesionActiva.id,
      tipo: tipoMovimiento,
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
      total,
      beneficiario: tipoMovimiento === 'INGRESO' ? undefined : (form.beneficiario || undefined),
      origenFondos: tipoMovimiento === 'INGRESO' ? form.origenFondos : undefined,
      metodoPago: tipoMovimiento === 'INGRESO' ? form.metodoPago : undefined,
      referenciaTransferencia: tipoMovimiento === 'INGRESO' ? form.referenciaTransferencia : undefined,
      autorizadoPor: tipoMovimiento === 'INGRESO' ? form.autorizadoPor : undefined,
    });`;
const submitNew = `      categoria: form.categoria,
      cuentaContable: tipoMovimiento === 'SALIDA' ? form.cuentaContable : undefined,
      descripcion: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? (form.descripcion || \`\${form.categoria} desde \${form.origenFondos}\`) : form.descripcion,
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
    }`;
content = content.replace(submitOld, submitNew);

// 7. Success toasts
content = content.replace("alert(res.error || 'Error al guardar el movimiento');", "toast.error(res.error || 'Error al guardar el movimiento');");
content = content.replace(
  "setForm({",
  `toast.success(editandoMovimientoId ? 'Movimiento actualizado' : (tipoMovimiento === 'APERTURA' ? 'Caja abierta con fondo inicial' : 'Movimiento registrado'));
    setShowModalNuevo(false);
    setForm({`
);
content = content.replace(/    setForm\(\{[\s\S]*?notaInterna: ''\n    \}\);/, "    setForm(formVacio);");

// 8. Add helpers for upload and edit
const helpers = `  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
content = content.replace("const formatMoneda = (valor: number) =>", helpers + "\n  const formatMoneda = (valor: number) =>");

// 9. Fix table actions
const oldTableActions = `<div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
const newTableActions = `<div className="flex items-center justify-center gap-1">
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
content = content.replace(oldTableActions, newTableActions);

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);
