with open('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'r') as f:
    content = f.read()

import re

# 1. Insert State
state_str = "  const [showModalApertura, setShowModalApertura] = useState(false);"
new_state = state_str + "\n  const [showReembolsoWarning, setShowReembolsoWarning] = useState(false);"
content = content.replace(state_str, new_state)

# 2. Insert Validation in handleAgregarMovimiento
match = re.search(r'const handleAgregarMovimiento = async \(\) => \{.*?const total = form\.moneda === \'USD\' \? importeNum \* tipoCambioNum : importeNum;', content, re.DOTALL)
if match:
    old_code = match.group(0)
    validation = """
    if (tipoMovimiento === 'INGRESO' && form.categoria === 'Reembolso') {
      if (total > stats.salidas) {
        setShowReembolsoWarning(true);
        return;
      }
    }"""
    content = content.replace(old_code, old_code + validation)
else:
    print("Could not find handleAgregarMovimiento")

# 3. Insert Modal at the end
modal_jsx = """      {/* Modal de Advertencia de Reembolso */}
      {showReembolsoWarning && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden border border-red-100">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Monto inválido</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                No puedes reembolsar <span className="font-bold text-gray-900">L. {formatMoneda(parseFloat(String(form.importe || 0)))}</span> porque es superior al total de los gastos registrados (<span className="font-bold text-gray-900">L. {formatMoneda(stats.salidas)}</span>).
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
              <button
                onClick={() => setShowReembolsoWarning(false)}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-600/20"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
"""
content = content.replace("    </div>\n  );\n};\n", modal_jsx)

with open('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'w') as f:
    f.write(content)
