const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

// Inject formVacio, states and functions
const missingCode = `
  const formVacio = {
    categoria: '',
    descripcion: '',
    documento: 'FACTURA',
    nroDoc: '',
    importe: '0',
    moneda: 'HNL',
    tipoCambio: 1,
    beneficiario: '',
    origenFondos: '',
    metodoPago: '',
    referenciaTransferencia: '',
    autorizadoPor: '',
    adjuntoUrl: ''
  };

  const [form, setForm] = useState<any>(formVacio);
  const [modalEliminar, setModalEliminar] = useState<{show: boolean, id: string | null}>({show: false, id: null});
  const [showModalEditSaldo, setShowModalEditSaldo] = useState(false);
  const [nuevoSaldoApertura, setNuevoSaldoApertura] = useState('');

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

content = content.replace(
  /const \[form, setForm\] = useState\(\{[\s\S]*?beneficiario: ''\n\s+\}\);/,
  missingCode
);

content = content.replace(/setForm\(\{[\s\S]*?beneficiario: ''\n\s+\}\);/g, "setForm(formVacio);");
content = content.replace(/loadData\(\)/g, "cargarSesion()");

// Fix the table action buttons
const tableActionsOld = `<button
                          onClick={() => eliminarMovimiento(m.id)}
                          className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>`;
const tableActionsNew = `<button
                          onClick={() => setModalEliminar({show: true, id: m.id})}
                          className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>`;
content = content.replace(tableActionsOld, tableActionsNew);

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);
