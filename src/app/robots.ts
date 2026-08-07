import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/landing', '/productos', '/servicios', '/contacto', '/nosotros', '/bio'],
        disallow: ['/trazabilidad/', '/v/', '/c/', '/api/', '/admin/', '/dashboard/', '/login'],
      },
    ],
  };
}
