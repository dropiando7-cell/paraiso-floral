import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import LegacyTemplatePDF from '@/components/pdf/LegacyTemplatePDF';

// We need to set max duration since Vercel's default 10s might be too short 
export const maxDuration = 60;

// Helper to format currency
const fmt = (val: number) => {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
  }).format(val).replace('HNL', 'L').trim();
};

// Helper to calculate line totals
const calcLine = (item: any) => {
  const q = Number(item.qty) || 0;
  const p = Number(item.unitPrice) || 0;
  const dVal = Number(item.discount) || 0;
  
  let dAmount = 0;
  if (item.discountType === 'amount') {
    dAmount = dVal; 
  } else {
    dAmount = (q * p) * (dVal / 100);
  }
  
  const base = q * p;
  const baseAfterDiscount = base - dAmount;
  let tax = 0;
  if (item.taxType === '15%') tax = baseAfterDiscount * 0.15;
  if (item.taxType === '18%') tax = baseAfterDiscount * 0.18;
  
  return { base, dAmount, baseAfterDiscount, tax, total: baseAfterDiscount + tax };
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return new Response('Missing ID', { status: 400 });
    }

    // 1. Fetch document and organization data
    const doc = await prisma.factura.findUnique({
      where: { id },
      include: { 
        detalles: {
          include: { producto: true, activo: true }
        }, 
        cliente: true,
        creadoPor: true
      }
    });

    const org = await prisma.organization.findFirst();

    if (!doc || !org) {
      return new Response('Document or Organization not found', { status: 404 });
    }

    // 2. Prepare Data Model for the PDF Component
    const lineItems = doc.detalles.map((d: any) => {
      let shortDesc = d.descripcion;
      let longDesc = '';
      if (d.descripcion && d.descripcion.includes('\n')) {
        const parts = d.descripcion.split('\n');
        shortDesc = parts[0];
        longDesc = parts.slice(1).join('\n');
      }
      
      let isSection = false;
      let sectionStyle;
      if (shortDesc.startsWith('__SECTION__')) {
        isSection = true;
        shortDesc = shortDesc.substring(11);
        const styleIdx = shortDesc.indexOf('__STYLE__');
        if (styleIdx !== -1) {
            try { sectionStyle = JSON.parse(shortDesc.substring(styleIdx + 9)); } catch(e){}
            shortDesc = shortDesc.substring(0, styleIdx);
        }
      }

      const code = d.producto?.sku || d.activo?.idQr || '';

      return {
        id: d.id,
        code: code,
        shortDesc: shortDesc,
        longDesc: longDesc,
        showLongDesc: d.mostrarDescripcion,
        qty: d.cantidad,
        unitPrice: d.precioUnitario,
        taxType: d.porcentajeIsv === 18 ? '18%' : (d.porcentajeIsv === 15 ? '15%' : 'exento'),
        discount: d.totalDescuento,
        discountType: 'amount',
        isSection: isSection,
        sectionStyle: sectionStyle,
        imageUrl: d.producto?.imageUrl || d.activo?.imagenUrl || null
      };
    });
    
    const totals = {
      subtotal: lineItems.reduce((acc: number, item: any) => acc + calcLine(item).base, 0),
      descuentos: lineItems.reduce((acc: number, item: any) => acc + calcLine(item).dAmount, 0),
      exento: lineItems.reduce((acc: number, item: any) => item.taxType === 'exento' ? acc + calcLine(item).baseAfterDiscount : acc, 0),
      exonerado: lineItems.reduce((acc: number, item: any) => item.taxType === 'exonerado' ? acc + calcLine(item).baseAfterDiscount : acc, 0),
      gravado15: lineItems.reduce((acc: number, item: any) => item.taxType === '15%' ? acc + calcLine(item).baseAfterDiscount : acc, 0),
      isv15: lineItems.reduce((acc: number, item: any) => item.taxType === '15%' ? acc + calcLine(item).tax : acc, 0),
      gravado18: lineItems.reduce((acc: number, item: any) => item.taxType === '18%' ? acc + calcLine(item).baseAfterDiscount : acc, 0),
      isv18: lineItems.reduce((acc: number, item: any) => item.taxType === '18%' ? acc + calcLine(item).tax : acc, 0),
      get total() { return this.subtotal - this.descuentos + this.isv15 + this.isv18; }
    };

    const DOC_TYPES = [
      { key: 'cotizacion', label: 'COTIZACION' },
      { key: 'proforma', label: 'PRO FORMA' },
      { key: 'factura', label: 'FACTURA OFICIAL' }
    ];
    const currentDocType = DOC_TYPES.find(d => d.key === doc.tipoDocumento.toLowerCase()) || DOC_TYPES[0];

    // Build the data object 
    const templateData = {
      organization: org,
      settings: (org as any).invoiceSettings || {},
      docNumber: (doc as any).correlativo || (doc as any).numeroDocumento || 'PENDIENTE',
      currentDocType,
      selectedClient: doc.cliente ? {
        name: (doc.cliente as any).nombre || (doc.cliente as any).name || '',
        address: (doc.cliente as any).direccion || (doc.cliente as any).address || '',
        city: (doc.cliente as any).ciudad || (doc.cliente as any).city || '',
        rtn: (doc.cliente as any).rtn || '',
      } : null,
      nombreUsuario: (doc as any).nombreUsuario || (doc as any).creadoPor?.nombre || (doc as any).creadoPor?.email || 'Sistema',
      paymentTerms: doc.terminosPago || '30 días netos',
      notes: doc.notas || '',
      lineItems,
      totals,
      today: (() => {
        const d = doc.fechaEmision ? new Date(doc.fechaEmision) : new Date();
        const fecha = d.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const hora = d.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        return `${fecha} ${hora}`;
      })(),
      fmt
    };

    // 3. Pre-fetch external images (Logo and Products) as Buffers
    const images: Record<string, string> = {};
    
    // Helper to fetch and convert to base64
    const fetchImageAsBase64 = async (url: string) => {
      try {
        if (!url || url.startsWith('data:')) return url;
        
        let fetchUrl = url;
        if (url.startsWith('/')) {
          const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          fetchUrl = `${baseUrl}${url}`;
        }

        const res = await fetch(fetchUrl);
        if (!res.ok) return null;
        const arrayBuffer = await res.arrayBuffer();
        let buffer: any = Buffer.from(arrayBuffer);
        let contentType = res.headers.get('content-type') || 'image/jpeg';
        
        // react-pdf/renderer does not support WebP, convert to PNG using sharp
        if (contentType.includes('webp') || url.toLowerCase().endsWith('.webp')) {
          try {
            const sharp = (await import('sharp')).default;
            buffer = await sharp(buffer).png().toBuffer();
            contentType = 'image/png';
          } catch (e) {
            console.warn('Failed to convert webp to png with sharp:', e);
          }
        }

        return `data:${contentType};base64,${buffer.toString('base64')}`;
      } catch (err) {
        console.warn('Failed to fetch image:', url);
        return null;
      }
    };

    // Fetch Logo
    const logoSource = 
      (org as any).logoUrl || 
      (org as any).logo || 
      (org as any).logoPath || 
      (org as any).imagen ||
      (org as any).invoiceSettings?.logoUrl ||
      null;

    if (logoSource) {
      console.log('Intentando cargar logo desde:', logoSource);
      const logoBase64 = await fetchImageAsBase64(logoSource);
      if (logoBase64) {
        images['logo'] = logoBase64;
        console.log('Logo cargado exitosamente');
      } else {
        console.warn('No se pudo cargar el logo desde:', logoSource);
      }
    } else {
      console.warn('No se encontró ningún campo de logo en la organización. Campos disponibles:', Object.keys(org));
    }

    // Fetch Product Images
    for (const item of lineItems as any[]) {
      if (item.imageUrl) {
        const itemImageBase64 = await fetchImageAsBase64(item.imageUrl);
        if (itemImageBase64) images[item.id] = itemImageBase64;
      }
    }

    console.log('=== DEBUG PDF DATA ===');
    console.log('Organization fields:', Object.keys(org));
    console.log('Organization sample:', JSON.stringify(org, null, 2));
    console.log('Cliente:', JSON.stringify(doc.cliente, null, 2));
    console.log('Usuario:', JSON.stringify((doc as any).creadoPor, null, 2));
    console.log('Template Data nombreUsuario:', templateData.nombreUsuario);
    console.log('Images keys:', Object.keys(images));
    console.log('=== END DEBUG ===');

    console.log('Generating PDF via @react-pdf/renderer');

    // 4. Render PDF
    const stream = await renderToStream(React.createElement(LegacyTemplatePDF, { data: templateData, images }) as any);
    
    // We must return the stream directly
    return new Response(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="documento-${id}.pdf"`,
      }
    });

  } catch (error: any) {
    console.error('React-PDF Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/*
// =========================================================================
// OLD PUPPETEER CODE PRESERVED FOR REFERENCE
// =========================================================================

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function GET_PUPPETEER(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let browser = null;
  try {
    const { id } = await params;
    if (!id) {
      return new Response('Missing ID', { status: 400 });
    }

    const url = new URL(req.url);
    const token = url.searchParams.get('token') || '';
    
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const printUrl = `${baseUrl}/print/${id}?token=${token}`;

    console.log('Generating PDF via Puppeteer for:', printUrl);

    const isLocal = process.env.NODE_ENV === 'development';
    const executablePath = isLocal
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : await chromium.executablePath();

    browser = await puppeteer.launch({
      args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : (chromium as any).args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath,
      headless: isLocal ? true : (chromium as any).headless,
    });

    const page = await browser.newPage();
    
    try {
      await page.goto(printUrl, {
        waitUntil: 'networkidle2',
        timeout: 25000,
      });
    } catch (e: any) {
      console.warn('Puppeteer goto timeout or error, trying to render anyway:', e.message);
    }

    await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(images.map(img => {
        if (img.complete) return;
        return new Promise((resolve) => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve); 
        });
      }));
    });

    await page.emulateMediaType('print');

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
*/
