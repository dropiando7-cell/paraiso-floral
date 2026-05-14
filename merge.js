const fs = require('fs');

let content = fs.readFileSync('plantilla-concilia/caja-chica/CajaChicaClient.tsx', 'utf8');

// 1. Fix Imports
content = content.replace(
  /import \{\n  getSesionActivaAction,\n  abrirCajaAction,\n  cerrarCajaAction,\n  registrarMovimientoAction,\n  anularMovimientoAction\n\} from '@\/app\/actions\/cajaChica';/,
  `import { getOpenSession, openCajaChicaSession, closeCajaChicaSession, registerCajaChicaMovimiento,
  updateCajaChicaMovimiento, updateCajaChicaSaldoInicial, getUploadUrlCajaChica, anularCajaChicaMovimiento, openAndFundCajaChicaSession } from './actions';
import toast from 'react-hot-toast';`
);

// 2. Fix Component Definition
content = content.replace(
  `const CajaChica = () => {`,
  `export default function CajaChicaClient({ dbUser }: { dbUser: any }) {`
);

// 3. Add necessary states
content = content.replace(
  `const [tipoMovimiento, setTipoMovimiento] = useState('SALIDA');`,
  `const [tipoMovimiento, setTipoMovimiento] = useState<'INGRESO' | 'SALIDA' | 'APERTURA'>('SALIDA');
  const [editandoMovimientoId, setEditandoMovimientoId] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [modalEliminar, setModalEliminar] = useState<{show: boolean, id: string | null}>({show: false, id: null});
  const [showModalEditSaldo, setShowModalEditSaldo] = useState(false);
  const [nuevoSaldoApertura, setNuevoSaldoApertura] = useState('');`
);

// 4. Update cargarSesion
content = content.replace(
  /const res = await getSesionActivaAction\(\);/,
  `const res = await getOpenSession(dbUser.organizationId);`
);

// 5. Update handleAgregarMovimiento logic
const logicRegex = /const res = await registrarMovimientoAction\(\{[\s\S]*?autorizadoPor: tipoMovimiento === 'INGRESO' \? form\.autorizadoPor : undefined,\n    \}\);/;
const submitLogicNew = `let res;
    const payload = {
      categoria: form.categoria,
      cuentaContable: tipoMovimiento === 'SALIDA' ? form.cuentaContable : undefined,
      descripcion: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? (form.descripcion || \\\`\\\${form.categoria} desde \\\${form.origenFondos}\\\`) : form.descripcion,
      documento: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.metodoPago : form.documento,
      nroDoc: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? (form.referenciaTransferencia || undefined) : (form.nroDoc || undefined),
      importe: importeNum,
      moneda: form.moneda,
      tipoCambio: 1, // form.tipoCambio is missing in the new payload, default to 1 for now or add it
      total,
      adjuntoUrl: (form as any).adjuntoUrl || undefined,
      beneficiario: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? undefined : (form.beneficiario || undefined),
      origenFondos: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.origenFondos : undefined,
      metodoPago: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.metodoPago : undefined,
      referenciaTransferencia: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.referenciaTransferencia : undefined,
      autorizadoPor: (tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.autorizadoPor : undefined,
    };

    if (editandoMovimientoId) {
      res = await updateCajaChicaMovimiento(editandoMovimientoId, payload, dbUser.id);
    } else if (tipoMovimiento === 'APERTURA') {
      res = await openAndFundCajaChicaSession(dbUser.organizationId, payload, dbUser.id);
    } else {
      res = await registerCajaChicaMovimiento(sesionActiva.id, tipoMovimiento as any, payload, dbUser.id);
    }`;
content = content.replace(logicRegex, submitLogicNew);

// 6. Update toast in handleAgregarMovimiento
content = content.replace(
  /alert\(res\.error \|\| 'Error al guardar el movimiento'\);/,
  `toast.error(res.error || 'Error al guardar el movimiento');`
);
content = content.replace(
  /await cargarSesion\(\);/g,
  `toast.success(editandoMovimientoId ? 'Movimiento actualizado' : (tipoMovimiento === 'APERTURA' ? 'Caja abierta con fondo inicial' : 'Movimiento registrado'));
      await cargarSesion();
      setShowModalNuevo(false);`
);

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);
