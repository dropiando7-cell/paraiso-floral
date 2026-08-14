'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Portal Principal',
  '/facturas': 'Facturación y Cotizaciones',
  '/facturas/pos': 'Caja Rápida POS',
  '/inventario': 'Inventario y Catálogos',
  '/inventario/entradas': 'Entradas de Inventario',
  '/inventario/salidas': 'Salidas de Inventario',
  '/inventario/kardex': 'Kardex de Productos',
  '/contactos': 'Directorio de Contactos y Clientes',
  '/cierre-caja': 'Control y Cierre de Caja',
  '/caja-chica': 'Control de Caja Chica',
  '/mantenimientos': 'Órdenes de Trabajo y Mantenimiento',
  '/soporte': 'Soporte Técnico y Reparaciones',
  '/rentas': 'Rentas y Alquileres de Equipos',
  '/configuracion': 'Configuración de Cuenta',
  '/perfil': 'Mi Perfil de Usuario',
  '/admin/users': 'Gestión de Usuarios y Roles',
  '/admin/gestion-web': 'Gestión Web y Tienda',
  '/admin/bio-settings': 'Link en Bio (QR)',
  '/admin/avances': 'Avances del Desarrollo',
  '/admin/areas': 'Gestión de Áreas',
  '/calendario': 'Calendario y Agenda',
  '/checkin': 'Control de Check-In',
  '/graficas': 'Gráficas e Informes',
};

interface Props {
  orgName?: string;
}

export function DynamicTabTitle({ orgName = 'Distribuidora Paraíso Floral' }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    let moduleTitle = ROUTE_TITLES[pathname];

    if (!moduleTitle) {
      if (pathname.startsWith('/facturas')) moduleTitle = 'Facturación';
      else if (pathname.startsWith('/inventario')) moduleTitle = 'Inventario';
      else if (pathname.startsWith('/admin')) moduleTitle = 'Administración';
      else if (pathname.startsWith('/rentas')) moduleTitle = 'Rentas de Equipos';
      else if (pathname.startsWith('/soporte')) moduleTitle = 'Soporte Técnico';
      else if (pathname.startsWith('/c')) moduleTitle = 'Comprobante Digital';
      else moduleTitle = 'Sistemas ERP';
    }

    const companyName = orgName || 'Distribuidora Paraíso Floral';
    document.title = `${moduleTitle} | ${companyName}`;
  }, [pathname, orgName]);

  return null;
}
