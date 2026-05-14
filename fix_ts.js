const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

// 1. Export at bottom
content = content.replace(/export default CajaChica;\n?/, '');

// 2. Component props
content = content.replace(
  /export default function CajaChicaClient\(\{ dbUser, organization \}: \{ dbUser: any, organization: any \}\) \{/,
  'export default function CajaChicaClient({ dbUser }: { dbUser: any }) {\n  const organization = dbUser?.organization;'
);

// 3. Actions
content = content.replace(/abrirCajaAction/g, 'openCajaChicaSession');
content = content.replace(/cerrarCajaAction/g, 'closeCajaChicaSession');

// 4. TS any
content = content.replace(/\(f\) =>/g, '(f: any) =>');

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);
