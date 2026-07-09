import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { logId, documentId, status } = await req.json();

        if (!logId) {
            return NextResponse.json({ error: 'El logId es requerido' }, { status: 400 });
        }

        await prisma.asistenteVozLog.update({
            where: { id: logId },
            data: {
                documentoCreadoId: documentId || null,
                estado: status || 'PROCESADO'
            }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Error al actualizar AsistenteVozLog:", e);
        return NextResponse.json({ success: false, error: e.message || 'Error interno' }, { status: 500 });
    }
}
