import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
    children: React.ReactNode;
    dbUser: any; // We'll type this properly later, contains user and organization
}

export function DashboardLayout({ children, dbUser }: DashboardLayoutProps) {
    return (
        <div className="flex min-h-screen bg-[#f8fafc]">
            <Sidebar dbUser={dbUser} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header dbUser={dbUser} />
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
