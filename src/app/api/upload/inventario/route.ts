import { NextRequest, NextResponse } from 'next/server';
import { getR2UploadUrl } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
    try {
        // Auth check
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileName, contentType } = await req.json();

        if (!fileName || !contentType) {
            return NextResponse.json({ error: 'Missing fileName or contentType' }, { status: 400 });
        }

        // Sanitize filename
        const ext = fileName.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
        const uniqueName = `inventario/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

        // Generate pre-signed URL (15 min expiry) — client uploads directly to R2
        const uploadUrl = await getR2UploadUrl(uniqueName, contentType);
        const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${uniqueName}`;

        return NextResponse.json({ uploadUrl, publicUrl });

    } catch (err) {
        console.error('[Upload Inventario] Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
