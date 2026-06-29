'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutContextType {
    isFullscreen: boolean;
    setIsFullscreen: (val: boolean) => void;
}

export const LayoutContext = createContext<LayoutContextType>({
    isFullscreen: false,
    setIsFullscreen: () => { },
});

export const useLayoutControls = () => useContext(LayoutContext);

interface MobileDashboardWrapperProps {
    children: React.ReactNode;
    dbUser: any;
}

export function MobileDashboardWrapper({ children, dbUser }: MobileDashboardWrapperProps) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Close sidebar on route change (only for mobile)
    useEffect(() => {
        setMobileSidebarOpen(false);
    }, []);

    // Close on escape (only for mobile)
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileSidebarOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, []);

    const handleMenuClick = () => {
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
            setDesktopSidebarOpen(!desktopSidebarOpen);
        } else {
            setMobileSidebarOpen(!mobileSidebarOpen);
        }
    };

    if (isFullscreen) {
        return (
            <LayoutContext.Provider value={{ isFullscreen, setIsFullscreen }}>
                <div className="flex h-screen overflow-hidden print:min-h-0 print:block bg-[#F0F4FF] w-full">
                    <main className="flex-1 w-full relative">
                        {children}
                    </main>
                </div>
            </LayoutContext.Provider>
        );
    }

    return (
        <LayoutContext.Provider value={{ isFullscreen, setIsFullscreen }}>
            <div className="flex h-screen overflow-hidden print:min-h-0 print:block bg-[#f8fafc]">
                {/* Mobile overlay */}
                {mobileSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <div
                    className={`
          fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
          transition-all duration-300 ease-in-out hide-on-print overflow-hidden
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${desktopSidebarOpen ? 'lg:translate-x-0 lg:w-[280px] lg:min-w-[280px]' : 'lg:-translate-x-[280px] lg:w-0 lg:min-w-0'}
        `}
                >
                    <div className="w-[280px] h-full relative">
                        <Sidebar dbUser={dbUser} onClose={() => setMobileSidebarOpen(false)} />
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 flex flex-col min-w-0 w-full transition-all duration-300 print-expand print:block">
                    <div className="hide-on-print">
                        <Header dbUser={dbUser} onMenuClick={handleMenuClick} />
                    </div>
                    <main className="flex-1 overflow-y-auto print:overflow-visible p-4 md:p-6 lg:p-8 print-expand print:block">
                        <div className={`w-full print-expand print:block transition-all duration-300 ${
                            desktopSidebarOpen ? 'max-w-7xl mx-auto' : 'max-w-none px-2 md:px-4 lg:px-8'
                        }`}>
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </LayoutContext.Provider>
    );
}
