import { NextRequest, NextResponse } from 'next/server';
import { getR2UploadUrl } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse Request
        const { fileName, contentType } = await req.json();

        if (!fileName || !contentType) {
            return NextResponse.json({ error: 'Missing fileName or contentType' }, { status: 400 });
        }

        // Clean file name to prevent directory traversal attacks
        const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

        // Generate a unique path: e.g. "avatars/user-id/my-photo.jpg"
        const storagePath = `avatars/${user.id}/${Date.now()}-${safeFileName}`;

        // Get Pre-Signed URL from Cloudflare R2
        const uploadUrl = await getR2UploadUrl(storagePath, contentType);

        // Calculate the final public URL where the image will live
        const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${storagePath}`;

        return NextResponse.json({ uploadUrl, publicUrl });

    } catch (err) {
        console.error("Upload API Error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
