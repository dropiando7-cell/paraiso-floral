import http from 'http';

async function testEndpoint(path: string) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Path: ${path} -> Status: ${res.statusCode}`);
        try {
          const json = JSON.parse(data);
          console.log('Response summary:', Array.isArray(json) ? `Array length: ${json.length}` : json);
        } catch (e) {
          console.log('Raw response:', data.slice(0, 200));
        }
        resolve(res.statusCode);
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Testing endpoints on running dev server...');
  await testEndpoint('/api/cxc/vendedores');
  await testEndpoint('/api/cxc/resumen');
  await testEndpoint('/api/cxc/clientes?filtro=CON_SALDO');
}

main().catch(console.error);
