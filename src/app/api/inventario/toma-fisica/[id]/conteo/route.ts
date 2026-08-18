import { NextResponse } from 'next/server';
import { guardarProgresoTomaFisica } from '@/app/(dashboard)/inventario/toma-fisica/actions';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { conteos } = body;

        if (!Array.isArray(conteos)) {
            return NextResponse.json({ error: 'Conteos inválidos' }, { status: 400 });
        }

        const res = await guardarProgresoTomaFisica(id, conteos);
        if (res.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: res.error }, { status: 500 });
        }
    } catch (err: any) {
        console.error('Error in POST api/inventario/toma-fisica/[id]/conteo:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
