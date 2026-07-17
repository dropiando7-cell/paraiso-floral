'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds
const IDLE_TIMEOUT_MS = 300_000;      // 5 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export function ActivityTracker() {
    const pathname = usePathname();
    const [, setIsIdle] = useState(false);
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPingTime = useRef<number>(0);
    const isIdleRef = useRef(false);

    // Function to send presence ping
    const sendPing = async (path: string, idleState: boolean) => {
        try {
            const now = Date.now();
            // Throttle heartbeats to prevent overlapping on fast click navigation
            if (!path && now - lastPingTime.current < 5000) {
                return;
            }

            const activePath = path || pathname;
            await fetch('/api/activity/ping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    module: activePath,
                    isIdle: idleState,
                }),
            });
            lastPingTime.current = now;
        } catch (error) {
            console.error('Failed to send activity ping:', error);
        }
    };

    // Reset idle timer
    const resetIdleTimer = () => {
        if (idleTimer.current) {
            clearTimeout(idleTimer.current);
        }

        if (isIdleRef.current) {
            isIdleRef.current = false;
            setIsIdle(false);
            // Send immediate ping to mark as active
            sendPing(pathname, false);
        }

        idleTimer.current = setTimeout(() => {
            isIdleRef.current = true;
            setIsIdle(true);
            // Send immediate ping to mark as idle
            sendPing(pathname, true);
        }, IDLE_TIMEOUT_MS);
    };

    // Trigger ping on pathname change
    useEffect(() => {
        if (pathname) {
            sendPing(pathname, isIdleRef.current);
            resetIdleTimer();
        }
    }, [pathname]);

    // Setup periodic heartbeats and user interaction listeners
    useEffect(() => {
        // Send initial ping
        sendPing(pathname, isIdleRef.current);
        resetIdleTimer();

        // 1. Periodic ping interval (only runs if page is visible)
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                sendPing(pathname, isIdleRef.current);
            }
        }, HEARTBEAT_INTERVAL_MS);

        // 2. User activity listeners for idle check
        const activityHandler = () => {
            resetIdleTimer();
        };

        ACTIVITY_EVENTS.forEach((event) => {
            window.addEventListener(event, activityHandler, { passive: true });
        });

        // 3. Visibility change listener (ping when tab gets focused)
        const visibilityHandler = () => {
            if (document.visibilityState === 'visible') {
                sendPing(pathname, isIdleRef.current);
                resetIdleTimer();
            }
        };
        document.addEventListener('visibilitychange', visibilityHandler);

        return () => {
            clearInterval(interval);
            if (idleTimer.current) {
                clearTimeout(idleTimer.current);
            }
            ACTIVITY_EVENTS.forEach((event) => {
                window.removeEventListener(event, activityHandler);
            });
            document.removeEventListener('visibilitychange', visibilityHandler);
        };
    }, [pathname]);

    return null; // Invisible component
}
