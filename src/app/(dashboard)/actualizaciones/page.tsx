import React from 'react';
import ActualizacionesClient from './ActualizacionesClient';
import { getActualizacionesData } from './actions';

export const metadata = {
  title: 'Novedades & Actualizaciones ERP | Bioelectrónica',
  description: 'Videotutoriales y centro de soporte explicativo sobre nuevas funciones y correcciones del ERP.',
};

export default async function ActualizacionesPage() {
  const initialData = await getActualizacionesData();
  return <ActualizacionesClient initialData={initialData} />;
}
