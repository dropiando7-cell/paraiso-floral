import { NextResponse } from 'next/server';

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

    const buffer = await fetchResponse.arrayBuffer();
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': fetchResponse.headers.get('Content-Type') || 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error: any) {
    console.error('Proxy Image Error:', error.message);
    return new Response('Internal Server Error fetching image', { status: 500 });
  }
}
