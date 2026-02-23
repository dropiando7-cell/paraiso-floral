import { MobileDashboardWrapper } from './MobileDashboardWrapper';

interface DashboardLayoutProps {
    children: React.ReactNode;
    dbUser: any;
}

export function DashboardLayout({ children, dbUser }: DashboardLayoutProps) {
    return (
        <MobileDashboardWrapper dbUser={dbUser}>
            {children}
        </MobileDashboardWrapper>
    );
}
