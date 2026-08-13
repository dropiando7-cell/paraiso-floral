import { NextRequest, NextResponse } from 'next/server';
import { getR2UploadUrl } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const contentTypeHeader = req.headers.get('content-type') || '';

        // 1. Direct Multipart Form Upload (works without Cloudflare R2 configured)
        if (contentTypeHeader.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;

            if (!file) {
                return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 });
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            const mimeType = file.type || 'image/jpeg';
            const base64Data = buffer.toString('base64');
            const publicUrl = `data:${mimeType};base64,${base64Data}`;

            return NextResponse.json({ uploadUrl: null, publicUrl });
        }

        // 2. JSON Payload (Presigned R2 Upload request)
        const body = await req.json().catch(() => ({}));
        const { fileName, contentType } = body;

        const isR2Configured = Boolean(
            process.env.R2_ACCESS_KEY_ID &&
            process.env.R2_SECRET_ACCESS_KEY &&
            process.env.R2_ENDPOINT &&
            process.env.R2_BUCKET_NAME
        );

        if (isR2Configured && fileName && contentType) {
            try {
                const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
                const storagePath = `avatars/${user.id}/${Date.now()}-${safeFileName}`;
                const uploadUrl = await getR2UploadUrl(storagePath, contentType);
                const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''}/${storagePath}`;

                return NextResponse.json({ uploadUrl, publicUrl });
            } catch (r2Err: any) {
                console.warn('[Upload API] Error en R2, se usará modo directo:', r2Err?.message);
            }
        }

        return NextResponse.json({ error: 'Servicio de almacenamiento no disponible. Usa multipart/form-data.' }, { status: 400 });

    } catch (err: any) {
        console.error("Upload API Error:", err);
        return NextResponse.json({ error: err.message || 'Error interno del servidor al procesar la imagen' }, { status: 500 });
    }
}
