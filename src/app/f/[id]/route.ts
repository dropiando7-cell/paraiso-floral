import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const origin = req.nextUrl.origin;
    return NextResponse.redirect(`${origin}/ficha-tecnica/${id}`);
}
