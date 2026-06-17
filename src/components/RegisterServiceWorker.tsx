'use client';

import { useEffect } from 'react';

export default function RegisterServiceWorker() {
    useEffect(() => {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((reg) => {
                    console.log('Service Worker de PWA registrado con éxito en el ámbito:', reg.scope);
                })
                .catch((err) => {
                    console.error('Error al registrar el Service Worker de PWA:', err);
                });
        }

        // Listen for beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            (window as any).deferredPrompt = e;
            window.dispatchEvent(new CustomEvent('pwa-installable'));
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    return null;
}

