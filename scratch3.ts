import { searchProductos } from './src/app/(dashboard)/facturas/actions';

async function test() {
  const prd = await searchProductos('BEA-001-000095');
  console.log(prd);
}
test().catch(console.error);
