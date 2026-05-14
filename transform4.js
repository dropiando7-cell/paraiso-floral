const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

// 1. Import openAndFundCajaChicaSession
content = content.replace(
  "openCajaChicaSession,",
  "openCajaChicaSession,\n  openAndFundCajaChicaSession,"
);

// 2. Update the "Abrir Caja" button to open the big modal
const openBoxBtnOld = `<button
            onClick={() => setShowModalApertura(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Unlock className="w-4 h-4" />
            Abrir Caja
          </button>`;
const openBoxBtnNew = `<button
            onClick={() => {
              setTipoMovimiento('APERTURA');
              setForm({ ...formVacio, categoria: 'Apertura de caja', descripcion: 'Fondo inicial asignado a la caja chica' });
              setShowModalNuevo(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Unlock className="w-4 h-4" />
            Abrir Caja
          </button>`;
content = content.replace(openBoxBtnOld, openBoxBtnNew);

// 3. Update handleAgregarMovimiento to support 'APERTURA'
const submitLogicOld = `    if (editandoMovimientoId) {
      res = await updateCajaChicaMovimiento(editandoMovimientoId, payload, dbUser.id);
    } else {
      if (!sesionActiva) {
        toast.error('No hay sesión activa');
        return;
      }
      res = await registerCajaChicaMovimiento(sesionActiva.id, tipoMovimiento as any, payload, dbUser.id);
    }`;
const submitLogicNew = `    if (editandoMovimientoId) {
      res = await updateCajaChicaMovimiento(editandoMovimientoId, payload, dbUser.id);
    } else if (tipoMovimiento === 'APERTURA') {
      res = await openAndFundCajaChicaSession(organization.id, payload, dbUser.id);
    } else {
      if (!sesionActiva) {
        toast.error('No hay sesión activa');
        return;
      }
      res = await registerCajaChicaMovimiento(sesionActiva.id, tipoMovimiento as any, payload, dbUser.id);
    }`;
content = content.replace(submitLogicOld, submitLogicNew);

const toastSuccessOld = `toast.success(editandoMovimientoId ? 'Movimiento actualizado correctamente' : 'Movimiento registrado exitosamente');`;
const toastSuccessNew = `toast.success(editandoMovimientoId ? 'Movimiento actualizado correctamente' : (tipoMovimiento === 'APERTURA' ? 'Caja abierta con fondo inicial' : 'Movimiento registrado exitosamente'));`;
content = content.replace(toastSuccessOld, toastSuccessNew);

// 4. Update the Modal titles and texts for 'APERTURA'
content = content.replace(
  /\{editandoMovimientoId \? 'Editar Movimiento' : \(tipoMovimiento === 'INGRESO' \? 'Recargar Fondo' : 'Registrar Gasto'\)\}/g,
  `{editandoMovimientoId ? 'Editar Movimiento' : (tipoMovimiento === 'APERTURA' ? 'Abrir Caja Chica' : (tipoMovimiento === 'INGRESO' ? 'Recargar Fondo' : 'Registrar Gasto'))}`
);

content = content.replace(
  /\{editandoMovimientoId \? 'Guardar Cambios' : \(tipoMovimiento === 'INGRESO' \? 'Recargar Fondo' : 'Registrar Gasto'\)\}/g,
  `{editandoMovimientoId ? 'Guardar Cambios' : (tipoMovimiento === 'APERTURA' ? 'Abrir Caja con Fondo' : (tipoMovimiento === 'INGRESO' ? 'Recargar Fondo' : 'Registrar Gasto'))}`
);

content = content.replace(
  /tipoMovimiento === 'INGRESO' \? form\.metodoPago : form\.documento/g,
  `(tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.metodoPago : form.documento`
);
content = content.replace(
  /tipoMovimiento === 'INGRESO' \? \(form\.referenciaTransferencia \|\| undefined\)/g,
  `(tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? (form.referenciaTransferencia || undefined)`
);
content = content.replace(
  /tipoMovimiento === 'INGRESO'\n\s+\? \(form\.referenciaTransferencia \|\| undefined\)/g,
  `(tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA')\n        ? (form.referenciaTransferencia || undefined)`
);
content = content.replace(
  /tipoMovimiento === 'INGRESO' \? undefined : \(form\.beneficiario \|\| undefined\)/g,
  `(tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? undefined : (form.beneficiario || undefined)`
);
content = content.replace(
  /tipoMovimiento === 'INGRESO' \? form\.origenFondos : undefined/g,
  `(tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.origenFondos : undefined`
);
content = content.replace(
  /tipoMovimiento === 'INGRESO' \? form\.metodoPago : undefined/g,
  `(tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.metodoPago : undefined`
);
content = content.replace(
  /tipoMovimiento === 'INGRESO' \? form\.referenciaTransferencia : undefined/g,
  `(tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.referenciaTransferencia : undefined`
);
content = content.replace(
  /tipoMovimiento === 'INGRESO' \? form\.autorizadoPor : undefined/g,
  `(tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') ? form.autorizadoPor : undefined`
);
content = content.replace(
  /tipoMovimiento === 'INGRESO'\n\s+\? \(form\.descripcion \|\| `\$\{form\.categoria\} desde \$\{form\.origenFondos\}`\)/g,
  `(tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA')\n        ? (form.descripcion || \\\`\\\${form.categoria} desde \\\${form.origenFondos}\\\`)`
);

content = content.replace(
  /\{tipoMovimiento === 'INGRESO' && \(/g,
  `{(tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA') && (`
);

content = content.replace(
  /\{tipoMovimiento === 'SALIDA' && \(/g,
  `{tipoMovimiento === 'SALIDA' && (`
);

content = content.replace(
  /\{editandoMovimientoId \? 'Edición' : \(tipoMovimiento === 'INGRESO' \? 'Recarga' : 'Gasto'\)\}/g,
  `{editandoMovimientoId ? 'Edición' : (tipoMovimiento === 'APERTURA' ? 'Apertura' : (tipoMovimiento === 'INGRESO' ? 'Recarga' : 'Gasto'))}`
);

content = content.replace(
  /tipoMovimiento === 'INGRESO'\n\s+\? 'bg-green-600 hover:bg-green-700 shadow-green-600\/20'/g,
  `(tipoMovimiento === 'INGRESO' || tipoMovimiento === 'APERTURA')\n                    ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20'`
);


// 5. Update table type rendering
const typeRenderOld = `<span className={\`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 w-max \${
                            m.tipo === 'INGRESO'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }\`}>
                            {m.tipo === 'INGRESO' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {m.tipo}
                          </span>`;
const typeRenderNew = `<span className={\`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 w-max \${
                            (m.tipo === 'INGRESO' || m.tipo === 'APERTURA')
                              ? (m.tipo === 'APERTURA' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-green-50 text-green-700 border border-green-200')
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }\`}>
                            {(m.tipo === 'INGRESO' || m.tipo === 'APERTURA') ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {m.tipo}
                          </span>`;
content = content.replace(typeRenderOld, typeRenderNew);

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);

console.log("Transform applied successfully.");
