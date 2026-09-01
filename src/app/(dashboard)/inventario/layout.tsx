import { withRoleGuard } from '@/utils/rbac';

function InventarioLayout({ children }: { children: React.ReactNode }) {
    return <div className="inventario-module-uppercase min-h-screen">{children}</div>;
}

export default withRoleGuard('/inventario', InventarioLayout);
