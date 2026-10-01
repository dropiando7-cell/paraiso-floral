import { MobileDashboardWrapper } from './MobileDashboardWrapper';
import { InactivityGuard } from '@/components/InactivityGuard';
import { ActivityTracker } from './ActivityTracker';

interface DashboardLayoutProps {
    children: React.ReactNode;
    dbUser: any;
}

export function DashboardLayout({ children, dbUser }: DashboardLayoutProps) {
    return (
        <MobileDashboardWrapper dbUser={dbUser}>
            {/* Se desactiva el cierre por inactividad globalmente por requerimiento del negocio */}
            <InactivityGuard enabled={false}>
                <ActivityTracker />
                {children}
            </InactivityGuard>
        </MobileDashboardWrapper>
    );
}
