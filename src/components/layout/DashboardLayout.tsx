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
            <InactivityGuard enabled={dbUser?.idleTimeoutEnabled ?? true}>
                <ActivityTracker />
                {children}
            </InactivityGuard>
        </MobileDashboardWrapper>
    );
}
