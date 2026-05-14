const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

// fix prev: any
content = content.replace(/setForm\(\(prev\) => \(/g, 'setForm((prev: any) => (');

// fix duplicate import
content = content.replace(/import \{ getOpenSession, openCajaChicaSession, closeCajaChicaSession, registerCajaChicaMovimiento, anularCajaChicaMovimiento, updateCajaChicaSaldoInicial \} from '\.\/actions';\nimport \{ getOpenSession as gs2, openCajaChicaSession as ocs2, closeCajaChicaSession as ccs2, registerCajaChicaMovimiento as rccm2, anularCajaChicaMovimiento as accm2, updateCajaChicaMovimiento, updateCajaChicaSaldoInicial as uccsi2, getUploadUrlCajaChica, openAndFundCajaChicaSession \} from '\.\/actions';/,
  "import { getOpenSession, openCajaChicaSession, closeCajaChicaSession, registerCajaChicaMovimiento, anularCajaChicaMovimiento, updateCajaChicaMovimiento, updateCajaChicaSaldoInicial, getUploadUrlCajaChica, openAndFundCajaChicaSession } from './actions';"
);
content = content.replace(/import \{ getOpenSession, openCajaChicaSession, closeCajaChicaSession, registerCajaChicaMovimiento, anularCajaChicaMovimiento, updateCajaChicaSaldoInicial \} from '\.\/actions';/g, '');

content = content.replace(/updateCajaChicaSaldoInicial,\s*updateCajaChicaSaldoInicial,/g, 'updateCajaChicaSaldoInicial,');

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);
