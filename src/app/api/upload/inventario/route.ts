import { NextRequest, NextResponse } from 'next/server';
import { getR2UploadUrl } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('[Upload Inventario] Auth failed:', authError?.message);
        return NextResponse.json({ error: `Auth: ${authError?.message || 'No user session'}` }, { status: 401 });
    }

    // 2. Parse body
    let fileName: string, contentType: string;
    try {
        const body = await req.json();
        fileName = body.fileName;
        contentType = body.contentType;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!fileName || !contentType) {
        return NextResponse.json({ error: 'Missing fileName or contentType' }, { status: 400 });
    }

    // 3. Check R2 env vars
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT || !process.env.R2_BUCKET_NAME) {
        console.error('[Upload Inventario] Missing R2 environment variables');
        return NextResponse.json({ error: 'R2 not configured on server' }, { status: 500 });
    }

    // 4. Generate pre-signed URL
    try {
        const ext = fileName.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
        const uniqueName = `inventario/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const uploadUrl = await getR2UploadUrl(uniqueName, contentType);
        const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${uniqueName}`;
        return NextResponse.json({ uploadUrl, publicUrl });
    } catch (err: any) {
        console.error('[Upload Inventario] R2 Error:', err);
        return NextResponse.json({ error: `R2 Error: ${err.message}` }, { status: 500 });
    }
}
