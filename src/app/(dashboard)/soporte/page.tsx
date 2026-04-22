import { getOrdenesActivas } from './actions';
import SoporteClient from './SoporteClient';

export const metadata = {
    title: 'Soporte y Reparaciones | Bioelectrónica',
    description: 'Gestión de taller y reparaciones de equipo',
};

export default async function SoportePage() {
    const ordenes = await getOrdenesActivas();
    
    const safeOrdenes = ordenes.map((orden: any) => ({
        ...orden,
        costoRevision: orden.costoRevision ? Number(orden.costoRevision) : null,
        costoReparacion: orden.costoReparacion ? Number(orden.costoReparacion) : null,
    }));

    return <SoporteClient initialData={safeOrdenes} />;
}
