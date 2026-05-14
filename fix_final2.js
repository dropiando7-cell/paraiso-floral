const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', 'utf8');

content = content.replace(/cargarSesion/g, 'loadData');
content = content.replace(/sesionActiva/g, 'sessionData');
content = content.replace(
  /const \[form, setForm\] = useState<any>\(formVacio\);/,
  `const [form, setForm] = useState<any>(formVacio);\n  const [uploadingDoc, setUploadingDoc] = useState(false);\n  const [editandoMovimientoId, setEditandoMovimientoId] = useState<string | null>(null);`
);
content = content.replace(/\(prev\)/g, '(prev: any)');

fs.writeFileSync('src/app/(dashboard)/caja-chica/CajaChicaClient.tsx', content);
