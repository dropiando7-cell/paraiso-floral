'use client';

import { useEffect } from 'react';

export default function RegisterServiceWorker() {
    useEffect(() => {
        if ('serviceWorker' in navigator && window.workbox === undefined) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((reg) => {
                    console.log('Service Worker de PWA registrado con éxito en el ámbito:', reg.scope);
                })
                .catch((err) => {
                    console.error('Error al registrar el Service Worker de PWA:', err);
                });
        }
    }, []);

    return null;
}
