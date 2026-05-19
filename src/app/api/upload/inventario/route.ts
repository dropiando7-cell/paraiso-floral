import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('[Upload Inventario] Auth failed:', authError?.message);
        return NextResponse.json({ error: `Auth: ${authError?.message || 'No user session'}` }, { status: 401 });
    }

    // 2. Check R2 env vars
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT || !process.env.R2_BUCKET_NAME) {
        console.error('[Upload Inventario] Missing R2 environment variables');
        return NextResponse.json({ error: 'R2 not configured on server' }, { status: 500 });
    }

    // 3. Parse multipart form data
    let file: File | null = null;
    let fileName = 'activo.jpg';
    try {
        const formData = await req.formData();
        file = formData.get('file') as File | null;
        const customName = formData.get('fileName') as string | null;
        if (customName) fileName = customName;
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 4. Upload directly from server to R2
    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = fileName.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
        const uniqueName = `inventario/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const contentType = file.type || 'image/jpeg';

        const publicUrl = await uploadToR2(buffer, uniqueName, contentType);
        console.log('[Upload Inventario] Uploaded to R2:', publicUrl);
        return NextResponse.json({ publicUrl, url: publicUrl });
    } catch (err: any) {
        console.error('[Upload Inventario] R2 Error:', err);
        return NextResponse.json({ error: `R2 Error: ${err.message}` }, { status: 500 });
    }
}
