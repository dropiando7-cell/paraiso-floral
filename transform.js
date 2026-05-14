const fs = require('fs');

const srcFile = 'plantilla-concilia/caja-chica/CajaChicaClient.tsx';
const destFile = 'src/app/(dashboard)/caja-chica/CajaChicaClient.tsx';

let content = fs.readFileSync(srcFile, 'utf8');

// 1. Replace imports
content = content.replace(
  /import \{\n  getSesionActivaAction,[\s\S]*?\} from '@\/app\/actions\/cajaChica';/,
  `import toast from 'react-hot-toast';\nimport {\n  getOpenSession,\n  openCajaChicaSession,\n  closeCajaChicaSession,\n  registerCajaChicaMovimiento,\n  anularCajaChicaMovimiento\n} from './actions';`
);

// 2. Component definition
content = content.replace(
  /const CajaChica = \(\) => \{/,
  'export default function CajaChica({ dbUser }: { dbUser: any }) {'
);

// Remove the default export at the bottom if it exists, since we changed the declaration
content = content.replace(/export default CajaChica;\s*$/, '');

// 3. Alerts -> Toasts
content = content.replace(/alert\((.*?)\)/g, 'toast.error($1)');

// 4. cargarSesion
content = content.replace(
  /const res = await getSesionActivaAction\(\);/g,
  'const res = await getOpenSession(dbUser.organizationId);'
);

content = content.replace(
  /if \(res\.success && res\.data\) \{([\s\S]*?)setSesionActiva\(res\.data\);([\s\S]*?)setSaldoInicial\(res\.data\.saldoInicial\);([\s\S]*?)setMovimientos\(res\.data\.movimientos \|\| \[\]\);/g,
  `if (res.success && res.session) {$1setSesionActiva(res.session);$2setSaldoInicial(res.session.saldoInicial);$3setMovimientos(res.session.movimientos || []);`
);

// 5. handleAbrirCaja
content = content.replace(
  /const res = await abrirCajaAction\(amt\);/g,
  'const res = await openCajaChicaSession(dbUser.organizationId, amt, dbUser.id);'
);

// 6. handleCerrarCaja
content = content.replace(
  /const res = await cerrarCajaAction\(sesionActiva\.id, stats\.saldoFinal\);/g,
  "const res = await closeCajaChicaSession(sesionActiva.id, stats.saldoFinal, '', dbUser.id);"
);

// 7. handleAgregarMovimiento
content = content.replace(
  /const res = await registrarMovimientoAction\(\{[\s\S]*?\}\);/g,
  `const res = await registerCajaChicaMovimiento(
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
    );`
);

// 8. eliminarMovimiento
content = content.replace(
  /const res = await anularMovimientoAction\(id\);/g,
  'const res = await anularCajaChicaMovimiento(id, dbUser.id);'
);

// 9. Fix userRole condition
content = content.replace(
  /setUserRole\(res\.userRole \|\| ''\);/g,
  'setUserRole(dbUser.role || \'\');'
);

// 10. Replace dates
content = content.replace(/13\/05\/2026 08:15 a\.m\./g, '{sesionActiva ? new Date(sesionActiva.createdAt).toLocaleString(\'es-HN\') : \'—\'}');

fs.writeFileSync(destFile, content, 'utf8');
console.log('Transformation complete!');
