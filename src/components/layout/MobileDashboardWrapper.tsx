'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MobileDashboardWrapperProps {
    children: React.ReactNode;
    dbUser: any;
}

export function MobileDashboardWrapper({ children, dbUser }: MobileDashboardWrapperProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, []);

    // Close on escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSidebarOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, []);

    const pathname = usePathname();
    const isCheckin = pathname === '/checkin';

    if (isCheckin) {
        return (
            <div className="flex min-h-screen bg-[#F0F4FF]">
                <main className="flex-1 w-full relative">
                    {children}
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#f8fafc]">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — desktop: always visible | mobile: drawer */}
            <div
                className={`
          fixed inset-y-0 left-0 z-50 lg:static lg:z-auto lg:translate-x-0
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                <Sidebar dbUser={dbUser} onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 w-full">
                <Header dbUser={dbUser} onMenuClick={() => setSidebarOpen(o => !o)} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
