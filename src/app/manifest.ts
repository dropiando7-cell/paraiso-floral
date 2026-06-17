import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Bioelectrónica ERP',
        short_name: 'Bio ERP',
        description: 'Plataforma ERP de administración para Bioelectrónica Honduras',
        start_url: '/inventario',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0500A3',
        icons: [
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
