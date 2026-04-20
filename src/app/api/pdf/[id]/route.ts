import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// We need to set max duration since Vercel's default 10s might be too short for chromium booting
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let browser = null;
  try {
    const { id } = await params;
    if (!id) {
      return new Response('Missing ID', { status: 400 });
    }

    const url = new URL(req.url);
    const token = url.searchParams.get('token') || '';
    
    // Derive the base URL to call our own protected print route
    // Typically on Vercel process.env.VERCEL_URL is available, otherwise we use localhost
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const printUrl = `${baseUrl}/print/${id}?token=${token}`;

    console.log('Generating PDF via Puppeteer for:', printUrl);

    // For local Windows development, you must specify the path to your Chrome executable.
    // Feel free to modify this path if your Chrome is installed elsewhere.
    const isLocal = process.env.NODE_ENV === 'development';
    const executablePath = isLocal
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : await chromium.executablePath();

    browser = await puppeteer.launch({
      args: isLocal ? [] : (chromium as any).args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath,
      headless: isLocal ? true : (chromium as any).headless,
    });

    const page = await browser.newPage();
    
    // We wait for networkidle2 to ensure Next.js chunks finish, but catch timeouts
    try {
      await page.goto(printUrl, {
        waitUntil: 'networkidle2',
        timeout: 25000,
      });
    } catch (e: any) {
      console.warn('Puppeteer goto timeout or error, trying to render anyway:', e.message);
    }

    // Force wait for all images in the document to be fully loaded
    await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(images.map(img => {
        if (img.complete) return;
        return new Promise((resolve) => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve); // resolve on error to avoid hangs
        });
      }));
    });

    // Emulate screen media to apply the exact Tailwind layout intended for screen/print exactly
    await page.emulateMediaType('screen');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      }
    });

    await browser.close();
    browser = null;

    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="documento-${id}.pdf"`,
      }
    });
  } catch (error: any) {
    console.error('Puppeteer PDF Error:', error);
    if (browser) {
      await browser.close().catch(console.error);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
