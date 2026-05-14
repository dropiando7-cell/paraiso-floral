import { Metadata } from 'next';
import CajaChicaClient from './CajaChicaClient';

export const metadata: Metadata = {
  title: 'Caja Chica | Bioelectrónica Honduras',
  description: 'Control de caja chica y gastos menores',
};

export default function CajaChicaPage() {
  return <CajaChicaClient />;
}
