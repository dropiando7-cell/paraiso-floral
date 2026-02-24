import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id } = await request.json();
        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        const updated = await prisma.conciliation.update({
            where: { id },
            data: {
                isApproved: true,
                approvedBy: user.email,
                approvedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true, id: updated.id, approvedBy: updated.approvedBy });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[conciliacion/approve] Error:', message);
        return NextResponse.json({ error: `Error interno: ${message}` }, { status: 500 });
    }
}
