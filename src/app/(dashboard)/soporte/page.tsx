import { getOrdenesActivas } from './actions';
import SoporteClient from './SoporteClient';

export const metadata = {
    title: 'Soporte y Reparaciones | Bioelectrónica',
    description: 'Gestión de taller y reparaciones de equipo',
};

export default async function SoportePage() {
    const ordenes = await getOrdenesActivas();
    return <SoporteClient initialData={ordenes} />;
}
