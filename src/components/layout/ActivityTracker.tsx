'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const HEARTBEAT_INTERVAL_MS = 180_000; // 3 minutes (reduced from 30s)
const IDLE_TIMEOUT_MS = 300_000;      // 5 minutes
const MIN_PING_INTERVAL_MS = 60_000;   // Minimum 1 minute between heartbeats on same page
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export function ActivityTracker() {
    const pathname = usePathname();
    const [, setIsIdle] = useState(false);
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPingTime = useRef<number>(0);
    const lastPingPath = useRef<string>('');
    const lastIdleState = useRef<boolean>(false);
    const isIdleRef = useRef(false);

    // Function to send presence ping
    const sendPing = async (path: string, idleState: boolean, force = false) => {
        try {
            const now = Date.now();
            const activePath = path || pathname;

            // Throttle heartbeats if path & idle state haven't changed and interval hasn't elapsed
            if (!force && activePath === lastPingPath.current && idleState === lastIdleState.current) {
                if (now - lastPingTime.current < MIN_PING_INTERVAL_MS) {
                    return;
                }
            }

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
            lastPingPath.current = activePath;
            lastIdleState.current = idleState;
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
            sendPing(pathname, false, true);
        }

        idleTimer.current = setTimeout(() => {
            isIdleRef.current = true;
            setIsIdle(true);
            // Send immediate ping to mark as idle
            sendPing(pathname, true, true);
        }, IDLE_TIMEOUT_MS);
    };

    // Main setup effect for pathname changes, heartbeats, and activity listeners
    useEffect(() => {
        if (!pathname) return;

        // Send ping on module navigation
        sendPing(pathname, isIdleRef.current);
        resetIdleTimer();

        // 1. Periodic heartbeat (runs every 3 minutes if page is visible)
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                sendPing(pathname, isIdleRef.current);
            }
        }, HEARTBEAT_INTERVAL_MS);

        // 2. User activity listener for idle reset
        const activityHandler = () => {
            resetIdleTimer();
        };

        ACTIVITY_EVENTS.forEach((event) => {
            window.addEventListener(event, activityHandler, { passive: true });
        });

        // 3. Tab visibility handler
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

