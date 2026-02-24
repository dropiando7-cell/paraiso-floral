import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { role: true },
        });

        // Only SUPER_ADMIN or ORG_ADMIN can delete
        if (!dbUser || !['SUPER_ADMIN', 'ORG_ADMIN'].includes(dbUser.role)) {
            return NextResponse.json({ error: 'Solo administradores pueden eliminar conciliaciones' }, { status: 403 });
        }

        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

        // Cannot delete approved conciliations
        const existing = await prisma.conciliation.findUnique({ where: { id } });
        if (existing?.isApproved) {
            return NextResponse.json({ error: 'No se puede eliminar una conciliación ya autorizada' }, { status: 409 });
        }

        await prisma.conciliation.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
