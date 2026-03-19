import EscanerClient from './EscanerClient';

export const metadata = {
    title: 'Escáner de Salida | Soporte | Bioelectrónica',
    description: 'Escanear QR para entrega de equipos',
};

export default function EscanerPage() {
    return <EscanerClient />;
}
