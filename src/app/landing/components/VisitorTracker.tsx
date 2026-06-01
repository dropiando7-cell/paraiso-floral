'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function VisitorTracker() {
    const pathname = usePathname();

    useEffect(() => {
        const trackVisitor = async () => {
            try {
                await fetch('/api/web/traffic', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        pagina: pathname || window.location.pathname || '/',
                        userAgent: navigator.userAgent
                    })
                });
            } catch (e) {
                // Fail silently in background
                console.error('Error tracking visitor:', e);
            }
        };

        trackVisitor();
    }, [pathname]);

    return null;
}
