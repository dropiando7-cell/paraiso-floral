const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

const oldInput = '<input type="file" className="hidden" accept="image/*,application/pdf" />';
const newInput = '{uploadingDoc ? (\n                        <span className="text-sm text-blue-500 flex items-center gap-2"><RefreshCcw className="w-4 h-4 animate-spin"/> Subiendo...</span>\n                      ) : (\n                        <>\n                          <span className="text-sm text-gray-500">\n                            {form.adjuntoUrl ? "Documento adjuntado (clic para cambiar)" : "Adjuntar boleta, voucher o captura de transferencia"}\n                          </span>\n                          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />\n                        </>\n                      )}';

// Remove the hardcoded text span before the input
content = content.replace(
  /<span className="text-sm text-gray-500">\n\s*Adjuntar boleta, voucher o captura de transferencia\n\s*<\/span>\n\s*<input type="file" className="hidden" accept="image\/\*,application\/pdf" \/>/g,
  newInput
);

// We need to add the same block to the GASTO form
const gastoDocBlock = `                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        N° de Documento
                      </label>
                      <input
                        type="text"
                        value={form.nroDoc}
                        onChange={(e) => setForm({ ...form, nroDoc: e.target.value })}
                        placeholder="001-2345"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-mono"
                      />
                    </div>
                  </div>

                  {/* Comprobante adjunto Gasto */}
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Comprobante (opcional)
                    </label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                      <Paperclip className="w-4 h-4 text-gray-400" />
                      ${newInput}
                    </label>
                  </div>`;

content = content.replace(
  /                    <div>\n\s*<label className="block text-xs font-semibold text-gray-700 mb-1\.5">\n\s*N° de Documento\n\s*<\/label>\n\s*<input[\s\S]*?className="[^"]*font-mono"\n\s*\/>\n\s*<\/div>\n\s*<\/div>/,
  gastoDocBlock
);

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);
