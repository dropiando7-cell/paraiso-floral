import PreciosClient from './PreciosClient';
import { getProductosPricing } from './actions';

export const dynamic = 'force-dynamic';

export default async function PreciosPage() {
    const productosIniciales = await getProductosPricing();
    
    return <PreciosClient productosIniciales={productosIniciales} />;
}
