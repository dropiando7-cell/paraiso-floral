import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const id = params.id;
    const origin = req.nextUrl.origin;
    return NextResponse.redirect(`${origin}/ficha-tecnica/${id}`);
}
