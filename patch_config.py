import sys

with open(r'd:\paraiso-floral\src\app\(dashboard)\configuracion\page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Update activeTab type
c = c.replace(
    "const [activeTab, setActiveTab] = useState<'general' | 'company' | 'emails' | 'sar'>('general');",
    "const [activeTab, setActiveTab] = useState<'general' | 'company' | 'emails' | 'sar' | 'pos'>('general');\n\n    const [posDirectPrint, setPosDirectPrint] = useState(false);\n    useEffect(() => { setPosDirectPrint(localStorage.getItem('pos_direct_print') === 'true'); }, []);\n    const togglePosDirectPrint = () => { const newVal = !posDirectPrint; setPosDirectPrint(newVal); localStorage.setItem('pos_direct_print', String(newVal)); };"
)

# 2. Add navigation button
nav_btn = '''                    <button
                        onClick={() => setActiveTab('pos')}
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-xl transition-colors ${activeTab === 'pos' ? 'text-brand-600 bg-brand-50 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Punto de Venta e Impresión
                    </button>'''

c = c.replace(
    'Preferencias Generales\n                    </button>',
    'Preferencias Generales\n                    </button>\n' + nav_btn
)

# 3. Add tab content
pos_tab = '''
                    {activeTab === 'pos' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                                <Printer className="w-5 h-5 text-slate-400" />
                                <h3 className="text-base font-semibold leading-6 text-slate-900">Punto de Venta e Impresión Local</h3>
                            </div>
                            <div className="px-6 py-5 space-y-6">
                                <div>
                                    <div className="flex items-center justify-between mb-1 max-w-md">
                                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            </svg>
                                            Impresión Directa (Sin Vista Previa)
                                        </label>
                                        <button
                                            onClick={togglePosDirectPrint}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${posDirectPrint ? 'bg-brand-500' : 'bg-slate-300'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${posDirectPrint ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-3 max-w-md">
                                        Si activas esta opción, al presionar "Ticket" en la lista de facturas, se enviará directamente a la cola del Print Server local sin mostrar la ventana emergente de confirmación. Esta configuración se guarda localmente en este dispositivo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
'''

c = c.replace(
    "{activeTab === 'general' && (",
    pos_tab + "\n                    {activeTab === 'general' && ("
)

with open(r'd:\paraiso-floral\src\app\(dashboard)\configuracion\page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
