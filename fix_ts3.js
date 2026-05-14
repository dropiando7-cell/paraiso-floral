const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

content = content.replace(
  "const res = await abrirCajaAction(Number(montoApertura));",
  "const res = await openCajaChicaSession(organization?.id || dbUser?.organizationId, Number(montoApertura), dbUser.id);"
);

content = content.replace(
  "const res = await cerrarCajaAction(sesionActiva.id, stats.saldoFinal, 'Cierre por sistema');",
  "const res = await closeCajaChicaSession(sesionActiva.id, stats.saldoFinal, 'Cierre por sistema', dbUser.id);"
);

content = content.replace(
  "const res = await anularMovimientoAction(modalEliminar.id);",
  "const res = await anularCajaChicaMovimiento(modalEliminar.id, dbUser.id);"
);

content = content.replace(
  "setUserRole(res.userRole || '');",
  "setUserRole(dbUser?.role || '');"
);

content = content.replace(/\(f\) => setForm/g, "(f: any) => setForm");
content = content.replace(/\(f\) =>\n\s+setForm/g, "(f: any) =>\n                            setForm");

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);
