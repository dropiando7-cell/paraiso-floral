const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

// 1. Import updateCajaChicaSaldoInicial
content = content.replace(
  "updateCajaChicaMovimiento,",
  "updateCajaChicaMovimiento,\n  updateCajaChicaSaldoInicial,"
);

// 2. Add states
content = content.replace(
  /const \[modalEliminar, setModalEliminar\] = useState<\{show: boolean, id: string \| null\}>\(\{show: false, id: null\}\);/,
  `const [modalEliminar, setModalEliminar] = useState<{show: boolean, id: string | null}>({show: false, id: null});
  const [showModalEditSaldo, setShowModalEditSaldo] = useState(false);
  const [nuevoSaldoApertura, setNuevoSaldoApertura] = useState('');`
);

// 3. Add handleUpdateSaldo
const handleUpdateSaldo = `
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
`;
content = content.replace("const handleAbrirCaja = async () => {", handleUpdateSaldo + "\n  const handleAbrirCaja = async () => {");

// 4. Update the card
const cardOld = `<p className="text-xs text-gray-500 font-medium mb-1">Saldo de Apertura</p>`;
const cardNew = `<div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-gray-500 font-medium">Saldo de Apertura</p>
              {sesionActiva?.estado === 'ABIERTA' && (
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
            </div>`;
content = content.replace(cardOld, cardNew);

// 5. Add Modal HTML
const editSaldoModalStr = `

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
`;
content = content.replace("    </div>\n  );\n}", editSaldoModalStr + "\n    </div>\n  );\n}");

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);

console.log("Transform applied successfully.");
