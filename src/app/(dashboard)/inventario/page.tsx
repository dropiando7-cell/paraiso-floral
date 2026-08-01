import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { getActivos, getActivoStats } from './actions';
import { InventarioClient } from './InventarioClient';

export const metadata = {
    title: 'Catálogo de Productos | Bioelectrónica',
    description: 'Gestión y control de inventario y ventas',
};

export default async function InventarioPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true, organizationId: true },
    });

    if (!dbUser) redirect('/unauthorized');

    // @ts-ignore - Prisma client needs regeneration to include INVENTARIO_EDITOR
    if (dbUser.role === 'INVENTARIO_EDITOR') {
        redirect('/inventario/historico');
    }

    const orgId = dbUser.organizationId;

    // Fetch initial data on the server for instant UI rendering!
    const initialData = await getActivos(1, '', '', '');
    const initialStats = await getActivoStats();
    const dbAreas = await prisma.area.findMany({
        where: { organizationId: orgId },
        orderBy: { name: 'asc' },
    });

    // Fetch system settings for origins
    const originsSetting = await prisma.systemSetting.findUnique({
        where: { key: 'inventory_origins' }
    });
    const defaultSetting = await prisma.systemSetting.findUnique({
        where: { key: 'default_inventory_origin' }
    });
    const customOrigins = originsSetting ? JSON.parse(originsSetting.value) : ["Americano", "Chino", "Otro"];
    const defaultOrigin = defaultSetting ? defaultSetting.value : "";

    // Fetch system settings for conditions
    const conditionsSetting = await prisma.systemSetting.findUnique({
        where: { key: 'inventory_conditions' }
    });
    const defaultCondSetting = await prisma.systemSetting.findUnique({
        where: { key: 'default_inventory_condition' }
    });
    const customConditions = conditionsSetting ? JSON.parse(conditionsSetting.value) : ["Nuevo", "Usado", "Remanufacturado"];
    const defaultCondition = defaultCondSetting ? defaultCondSetting.value : "";

    const disableAiSetting = await prisma.systemSetting.findUnique({
        where: { key: 'disable_ai_vision' }
    });
    const disableAiVision = disableAiSetting ? disableAiSetting.value === 'true' : false;

    const clientes = await prisma.cliente.findMany({
        where: { organizationId: orgId },
        orderBy: { nombre: 'asc' },
    });

    const serializedData = JSON.parse(JSON.stringify(initialData));
    const serializedStats = JSON.parse(JSON.stringify(initialStats));
    const serializedAreas = JSON.parse(JSON.stringify(dbAreas));
    const serializedClientes = JSON.parse(JSON.stringify(clientes));

    return (
        <InventarioClient 
            initialData={serializedData} 
            initialStats={serializedStats} 
            dbAreas={serializedAreas} 
            userRole={dbUser.role} 
            initialOrigins={customOrigins}
            initialDefaultOrigin={defaultOrigin}
            initialConditions={customConditions}
            initialDefaultCondition={defaultCondition}
            disableAiVision={disableAiVision}
            clientes={serializedClientes}
        />
    );
}
