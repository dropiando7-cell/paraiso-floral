const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

// 1. anularMovimientoAction
content = content.replace(/anularMovimientoAction/g, 'anularCajaChicaMovimiento');

// 2. getOpenSession returns session instead of data
content = content.replace(/res\.data/g, 'res.session');

// 3. openCajaChicaSession arguments
content = content.replace(
  /openCajaChicaSession\(Number\(montoApertura\)\)/g,
  'openCajaChicaSession(organization?.id || dbUser?.organizationId, Number(montoApertura), dbUser.id)'
);

// 4. closeCajaChicaSession arguments
content = content.replace(
  /closeCajaChicaSession\(sesionActiva\.id,\s*stats\.saldoFinal,\s*'[^']+'\)/g,
  "closeCajaChicaSession(sesionActiva.id, stats.saldoFinal, 'Cierre por sistema', dbUser.id)"
);

// 5. f implicit any
content = content.replace(/\(f\) => /g, '(f: any) => ');

// 6. remove duplicate getOpenSession import
content = content.replace(
  /import \{ getOpenSession, openCajaChicaSession, closeCajaChicaSession, registerCajaChicaMovimiento,\n  updateCajaChicaMovimiento, updateCajaChicaSaldoInicial, getUploadUrlCajaChica, anularCajaChicaMovimiento, openAndFundCajaChicaSession \} from '\.\/actions';/,
  "import { getOpenSession, openCajaChicaSession, closeCajaChicaSession, registerCajaChicaMovimiento, updateCajaChicaMovimiento, updateCajaChicaSaldoInicial, getUploadUrlCajaChica, anularCajaChicaMovimiento, openAndFundCajaChicaSession } from './actions';"
);

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);
