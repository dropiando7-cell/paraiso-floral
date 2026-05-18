import { NextResponse } from 'next/server';
import { sendSoporteRecepcion } from '@/lib/checkin-notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const phone = searchParams.get('phone');
        if (!phone) return NextResponse.json({ error: 'Provide ?phone=' });

        const res = await sendSoporteRecepcion(
            "Prueba Cliente",
            phone,
            "TEST-002",
            "Monitor de Paciente",
            "SN-999",
            "Soporte Bioelectronica"
        );

        return NextResponse.json({ success: true, result: res });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message });
    }
}
