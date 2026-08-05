import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url');
  
  if (!url) {
    return new Response('Missing URL', { status: 400 });
  }

  try {
    const fetchResponse = await fetch(decodeURIComponent(url));
    if (!fetchResponse.ok) {
      return new Response('Failed to fetch image', { status: fetchResponse.status });
    }

    const originalBuffer = await fetchResponse.arrayBuffer();
    
    // Resize image to max 200px width/height and compress to jpeg with quality 70
    const compressedBuffer = await sharp(Buffer.from(originalBuffer))
      .resize({
        width: 200,
        height: 200,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 70 })
      .toBuffer();
    
    return new NextResponse(compressedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error: any) {
    console.error('Proxy Image Error:', error.message);
    return new Response('Internal Server Error fetching/compressing image', { status: 500 });
  }
}
