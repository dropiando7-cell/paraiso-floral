import { MobileDashboardWrapper } from './MobileDashboardWrapper';
import { InactivityGuard } from '@/components/InactivityGuard';

interface DashboardLayoutProps {
    children: React.ReactNode;
    dbUser: any;
}

export function DashboardLayout({ children, dbUser }: DashboardLayoutProps) {
    return (
        <MobileDashboardWrapper dbUser={dbUser}>
            <InactivityGuard>
                {children}
            </InactivityGuard>
        </MobileDashboardWrapper>
    );
}
