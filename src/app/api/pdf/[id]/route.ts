import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import LegacyTemplatePDF from '@/components/pdf/LegacyTemplatePDF';
import OrdenEntregaPDF from '@/components/pdf/OrdenEntregaPDF';
import GarantiaLimitadaPDF from '@/components/pdf/GarantiaLimitadaPDF';
import { DEFAULT_INVOICE_SETTINGS } from '@/types/invoice';
import HistorialPDF from '@/components/pdf/HistorialPDF';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// Helper to sanitize and auto-orient images for react-pdf rendering (strips bad EXIF tags like version 16717)
async function sanitizeImageUrlForPdf(imageUrl: string | null | undefined): Promise<string | null> {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('data:image/')) return imageUrl;
  
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    
    if (!res.ok) return imageUrl;
    
    const arrayBuffer = await res.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    
    // Sanitize image using sharp: auto-rotate based on EXIF orientation and re-encode to clean sRGB JPEG
    const cleanBuffer = await sharp(inputBuffer)
      .rotate()
      .jpeg({ quality: 80, force: true })
      .toBuffer();
      
    return `data:image/jpeg;base64,${cleanBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Error sanitizing image for PDF:', imageUrl, err);
    return imageUrl;
  }
}

// Helper to process multiple images in parallel batches with strict timeout protection
async function sanitizeImagesInParallel(urls: (string | null | undefined)[]): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  const validUrls = Array.from(new Set(urls.filter((u): u is string => typeof u === 'string' && u.length > 0)));

  const chunkSize = 8;
  for (let i = 0; i < validUrls.length; i += chunkSize) {
    const chunk = validUrls.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (url) => {
        try {
          const sanitized = await Promise.race([
            sanitizeImageUrlForPdf(url),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
          if (sanitized) urlMap.set(url, sanitized);
        } catch {
          urlMap.set(url, url);
        }
      })
    );
  }
  return urlMap;
}

// We need to set max duration since Vercel's default 10s might be too short 
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Helper to format currency
const fmt = (val: number) => {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
  }).format(val).replace('HNL', 'L').trim();
};

// Helper to remove emojis that react-pdf does not support
const cleanEmojis = (text: string) => {
  if (!text) return '';
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
};

// Helper to calculate line totals
const calcLine = (item: any, pricesIncludeTax?: boolean) => {
  const q = Number(item.qty) || 0;
  const p = Number(item.unitPrice) || 0;
  const dVal = Number(item.discount) || 0;
  
  let tasaImpuesto = 0;
  if (item.taxType === '15%') tasaImpuesto = 0.15;
  if (item.taxType === '18%') tasaImpuesto = 0.18;

  if (pricesIncludeTax) {
    const baseConImpuesto = q * p;
    const baseNeta = baseConImpuesto / (1 + tasaImpuesto);
    
    let dAmount = 0;
    if (item.discountType === 'amount') {
      dAmount = dVal / (1 + tasaImpuesto);
    } else {
      dAmount = baseNeta * (dVal / 100);
    }
    
    const baseAfterDiscount = baseNeta - dAmount;
    const tax = baseAfterDiscount * tasaImpuesto;
    const total = baseAfterDiscount + tax;

    return { 
      base: baseNeta, 
      dAmount, 
      baseAfterDiscount, 
      tax, 
      total 
    };
  } else {
    let dAmount = 0;
    if (item.discountType === 'amount') {
      dAmount = dVal; 
    } else {
      dAmount = (q * p) * (dVal / 100);
    }
    
    const base = q * p;
    const baseAfterDiscount = base - dAmount;
    const tax = baseAfterDiscount * tasaImpuesto;
    
    return { base, dAmount, baseAfterDiscount, tax, total: baseAfterDiscount + tax };
  }
};

// Helper to extract brand and model from description text when relations are null
const extractBrandAndModelFromDesc = (desc: string) => {
  if (!desc) return { marca: null, modelo: null };
  const marcaMatch = desc.match(/marca\s+([^,]+?)(?=\s+modelo|\s+mod\b|\s+de\b|,|$)/i);
  const modeloMatch = desc.match(/(?:modelo|mod\.?)\s+([^,]+?)(?=\s+de\b|,|$)/i);
  return {
    marca: marcaMatch ? marcaMatch[1].trim() : null,
    modelo: modeloMatch ? modeloMatch[1].trim() : null
  };
};

// Helper to extract warranty from description text
const extractWarrantyFromDesc = (desc: string) => {
  if (!desc) return null;
  const match = desc.match(/garant[íi]a\s+de\s+(\d+\s+(?:meses|mes|a[ñn]os|a[ñn]o))/i);
  return match ? match[1].trim() : null;
};

const resolveServiceImageUrl = (desc: string | null | undefined): string | null => {
  if (!desc) return null;
  const lower = desc.toLowerCase();
  if (lower.includes('servicio de instalacion') || lower.includes('servicio de instalación')) return '/services/instalacion.svg';
  if (lower.includes('servicio de reparacion') || lower.includes('servicio de reparación')) return '/services/reparacion.jpg';
  if (lower.includes('servicio de diagnostico') || lower.includes('servicio de diagnóstico') || lower.includes('revision') || lower.includes('revisión')) return '/services/soporte.svg';
  if (lower.includes('mantenimiento preventivo')) return '/services/mantenimiento.svg';
  if (lower.includes('mantenimiento correctivo')) return '/services/garantia.svg';
  if (lower.includes('mano de obra') || lower.includes('horas de tecnico') || lower.includes('horas de técnico')) return '/services/mano_obra.svg';
  return null;
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId || '');
    if (!id) {
      return new Response('Missing ID', { status: 400 });
    }

    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'factura';
    const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    if (type === 'historial') {
      let targetActivoId = id;
      const checkOrden = isUuid(id) ? await prisma.ordenTrabajo.findUnique({
        where: { id },
        include: {
          cliente: true,
          tecnicoReparacion: {
            select: { nombre: true, apellido: true }
          },
          tecnicosAsignados: {
            select: { id: true, nombre: true }
          },
          repuestos: true,
          tiempos: {
            where: {
              anuladaAt: null
            },
            include: {
              tecnico: {
                select: {
                  nombre: true,
                  apellido: true
                }
              }
            },
            orderBy: {
              inicio: 'asc'
            }
          },
          kanbanTasks: {
            include: {
              attachments: true,
              comments: {
                include: {
                  usuario: {
                    select: { nombre: true }
                  }
                },
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
      }) : null;

      if (checkOrden && checkOrden.activoId) {
        targetActivoId = checkOrden.activoId;
      }

      // Parse configuration filters
      const desde = url.searchParams.get('desde');
      const hasta = url.searchParams.get('hasta');
      const ordenCodigo = url.searchParams.get('ordenCodigo');
      const onlyCurrent = url.searchParams.get('onlyCurrent') === 'true';
      const currentOrderId = url.searchParams.get('currentOrderId') || (checkOrden ? checkOrden.id : undefined);

      const clientUnified = url.searchParams.get('clientUnified') === 'true';
      const paramClienteId = url.searchParams.get('clienteId') || (id.startsWith('client-') ? id.replace('client-', '') : (checkOrden ? checkOrden.clienteId : null));
      const equipoIdsStr = url.searchParams.get('equipoIds');
      const equipoIds = equipoIdsStr ? equipoIdsStr.split(',').filter(Boolean) : [];

      const ordenesWhereClause: any = {};
      if (desde || hasta) {
        ordenesWhereClause.fechaRecibido = {};
        if (desde) {
          ordenesWhereClause.fechaRecibido.gte = new Date(`${desde}T00:00:00.000Z`);
        }
        if (hasta) {
          ordenesWhereClause.fechaRecibido.lte = new Date(`${hasta}T23:59:59.999Z`);
        }
      }
      if (ordenCodigo) {
        ordenesWhereClause.codigoSeguridad = {
          equals: ordenCodigo.replace('#', '').trim(),
          mode: 'insensitive'
        };
      }
      if (onlyCurrent && currentOrderId) {
        ordenesWhereClause.id = currentOrderId;
      }

      let activo = null;

      if (clientUnified && paramClienteId) {
        const cleanClienteId = paramClienteId.replace(/^(client-|CLIENTE-)/i, '').trim();
        const dbCliente = await prisma.cliente.findUnique({ where: { id: cleanClienteId } });
        
        let clientWhereClause: any = { clienteId: cleanClienteId };
        if (equipoIds.length > 0) {
          clientWhereClause.activoId = { in: equipoIds };
        }
        if (ordenesWhereClause.fechaRecibido) {
          clientWhereClause.fechaRecibido = ordenesWhereClause.fechaRecibido;
        }

        const clientOrdenes = await prisma.ordenTrabajo.findMany({
          where: clientWhereClause,
          include: {
            activo: true,
            tecnicosAsignados: { select: { id: true, nombre: true } },
            repuestos: true,
            tiempos: {
              where: { anuladaAt: null },
              include: { tecnico: { select: { nombre: true, apellido: true } } },
              orderBy: { inicio: 'asc' }
            },
            kanbanTasks: {
              include: {
                attachments: true,
                comments: {
                  include: { usuario: { select: { nombre: true } } },
                  orderBy: { createdAt: 'desc' }
                }
              }
            }
          },
          orderBy: { fechaRecibido: 'desc' }
        });

        activo = {
          id: `client-${cleanClienteId}`,
          idQr: `client-${cleanClienteId}`,
          descripcionCorta: `Reporte Unificado de Mantenimientos — ${dbCliente?.nombre || 'Cliente'}`,
          marca: 'Varios Equipos',
          modelo: 'Cliente Unificado',
          serie: 'N/A',
          fechaAdq: new Date(),
          createdAt: new Date(),
          cliente: dbCliente,
          ordenesTrabajo: clientOrdenes
        } as any;
      } else if (isUuid(targetActivoId)) {
        activo = await prisma.activoFijo.findUnique({
          where: { id: targetActivoId },
          include: {
            cliente: true,
            createdBy: {
              select: { nombre: true, apellido: true }
            },
            ordenesTrabajo: {
              where: ordenesWhereClause,
              include: {
                tecnicosAsignados: {
                  select: { id: true, nombre: true }
                },
                repuestos: true,
                tiempos: {
                  where: {
                    anuladaAt: null
                  },
                  include: {
                    tecnico: {
                      select: {
                        nombre: true,
                        apellido: true
                      }
                    }
                  },
                  orderBy: {
                    inicio: 'asc'
                  }
                },
                kanbanTasks: {
                  include: {
                    attachments: true,
                    comments: {
                      include: {
                        usuario: {
                          select: { nombre: true }
                        }
                      },
                      orderBy: { createdAt: 'desc' }
                    }
                  }
                }
              },
              orderBy: { fechaRecibido: 'desc' }
            }
          }
        });
      } else {
        activo = await prisma.activoFijo.findFirst({
          where: { idQr: targetActivoId },
          include: {
            cliente: true,
            createdBy: {
              select: { nombre: true, apellido: true }
            },
            ordenesTrabajo: {
              where: ordenesWhereClause,
              include: {
                tecnicosAsignados: {
                  select: { id: true, nombre: true }
                },
                repuestos: true,
                tiempos: {
                  where: {
                    anuladaAt: null
                  },
                  include: {
                    tecnico: {
                      select: {
                        nombre: true,
                        apellido: true
                      }
                    }
                  },
                  orderBy: {
                    inicio: 'asc'
                  }
                },
                kanbanTasks: {
                  include: {
                    attachments: true,
                    comments: {
                      include: {
                        usuario: {
                          select: { nombre: true }
                        }
                      },
                      orderBy: { createdAt: 'desc' }
                    }
                  }
                }
              },
              orderBy: { fechaRecibido: 'desc' }
            }
          }
        });
      }

      if (!activo && checkOrden) {
        let includeCheckOrden = true;
        if (ordenCodigo && checkOrden.codigoSeguridad?.toLowerCase() !== ordenCodigo.replace('#', '').trim().toLowerCase()) {
          includeCheckOrden = false;
        }
        if (onlyCurrent && currentOrderId && checkOrden.id !== currentOrderId) {
          includeCheckOrden = false;
        }
        if (desde && new Date(checkOrden.fechaRecibido) < new Date(`${desde}T00:00:00.000Z`)) {
          includeCheckOrden = false;
        }
        if (hasta && new Date(checkOrden.fechaRecibido) > new Date(`${hasta}T23:59:59.999Z`)) {
          includeCheckOrden = false;
        }

        activo = {
          id: checkOrden.id,
          idQr: checkOrden.codigoSeguridad || 'N/A',
          descripcionCorta: checkOrden.equipoDano || 'Equipo Externo',
          marca: checkOrden.marcaModelo?.split(' ')[0] || '',
          modelo: checkOrden.marcaModelo?.split(' ').slice(1).join(' ') || '',
          serie: checkOrden.serie || 'N/A',
          fechaAdq: checkOrden.fechaRecibido,
          createdAt: checkOrden.fechaRecibido,
          createdBy: checkOrden.tecnicoReparacion || null,
          cliente: checkOrden.cliente,
          ordenesTrabajo: includeCheckOrden ? [checkOrden] : []
        } as any;
      }

      if (!activo) {
        return new Response('Activo not found', { status: 404 });
      }

      // Convert local logo file to base64 Data URI
      const logoPath = path.join(process.cwd(), 'public', 'logo-bioelectronica.jpg');
      let logoBase64 = '';
      try {
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
        }
      } catch (err) {
        console.error('Error loading logo for PDF:', err);
      }

      const requestHost = req.headers.get('host') || 'bioelectronicahn.com';
      const protocol = requestHost.includes('localhost') ? 'http' : 'https';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${requestHost}`;
      const targetIdentifier = activo.idQr || activo.id || id;
      const targetUrl = `${appUrl}/trazabilidad/${targetIdentifier}`;
      const qrCodeUrl = `https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${encodeURIComponent(targetUrl)}&scale=6&eclevel=M&includetext=false`;

      const hideSignatures = url.searchParams.get('mostrarFirmas') === 'false';

      // Sanitize all image URLs in `activo` object in parallel batches to prevent Vercel 504 timeouts
      if (activo) {
        const allImageUrls: (string | null | undefined)[] = [];
        if (activo.imagenUrl) allImageUrls.push(activo.imagenUrl);
        if (activo.imagenWeb) allImageUrls.push(activo.imagenWeb);

        if (activo.ordenesTrabajo && Array.isArray(activo.ordenesTrabajo)) {
          for (const orden of activo.ordenesTrabajo) {
            if (orden.firmaClienteUrl) allImageUrls.push(orden.firmaClienteUrl);
            if (orden.firmaTecnicoUrl) allImageUrls.push(orden.firmaTecnicoUrl);
            if (Array.isArray(orden.fotosEstadoInicial)) allImageUrls.push(...orden.fotosEstadoInicial);
            if (Array.isArray(orden.fotosTecnico)) allImageUrls.push(...orden.fotosTecnico);
            if (Array.isArray(orden.kanbanTasks)) {
              for (const task of orden.kanbanTasks) {
                if (Array.isArray(task.attachments)) {
                  for (const att of task.attachments) {
                    if (att.url) allImageUrls.push(att.url);
                  }
                }
              }
            }
          }
        }

        const sanitizedMap = await sanitizeImagesInParallel(allImageUrls);

        if (activo.imagenUrl) activo.imagenUrl = sanitizedMap.get(activo.imagenUrl) || activo.imagenUrl;
        if (activo.imagenWeb) activo.imagenWeb = sanitizedMap.get(activo.imagenWeb) || activo.imagenWeb;

        if (activo.ordenesTrabajo && Array.isArray(activo.ordenesTrabajo)) {
          for (const orden of activo.ordenesTrabajo) {
            if (orden.firmaClienteUrl) orden.firmaClienteUrl = sanitizedMap.get(orden.firmaClienteUrl) || orden.firmaClienteUrl;
            if (orden.firmaTecnicoUrl) orden.firmaTecnicoUrl = sanitizedMap.get(orden.firmaTecnicoUrl) || orden.firmaTecnicoUrl;
            if (Array.isArray(orden.fotosEstadoInicial)) {
              orden.fotosEstadoInicial = orden.fotosEstadoInicial.map((u: string) => sanitizedMap.get(u) || u);
            }
            if (Array.isArray(orden.fotosTecnico)) {
              orden.fotosTecnico = orden.fotosTecnico.map((u: string) => sanitizedMap.get(u) || u);
            }
            if (Array.isArray(orden.kanbanTasks)) {
              for (const task of orden.kanbanTasks) {
                if (Array.isArray(task.attachments)) {
                  for (const att of task.attachments) {
                    if (att.url) att.url = sanitizedMap.get(att.url) || att.url;
                  }
                }
              }
            }
          }
        }
      }

      const stream = await renderToStream(
        React.createElement(HistorialPDF, {
          activo,
          logoUrl: logoBase64 || undefined,
          qrCodeUrl,
          hideSignatures
        }) as any
      );

      return new Response(stream as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="historial-mantenimiento-${activo.idQr}.pdf"`,
        }
      });
    }

    // 1. Fetch document and organization data
    const doc = await prisma.factura.findUnique({
      where: { id },
      include: { 
        detalles: {
          include: { 
            producto: true, 
            activo: {
              include: {
                producto: true
              }
            }
          }
        }, 
        cliente: true,
        creadoPor: true,
        ordenTrabajo: true,
        ordenEntrega: true
      }
    });

    const org = doc
      ? await prisma.organization.findUnique({
          where: { id: doc.organizationId }
        })
      : null;

    if (!doc || !org) {
      return new Response('Document or Organization not found', { status: 404 });
    }

    // 2. Prepare Data Model for the PDF Component
    const lineItems = await Promise.all(doc.detalles.map(async (d: any) => {
      let isSection = false;
      let sectionStyle;
      let metadata: any = {};
      let rawDesc = d.descripcion || '';
      
      const metaIdx = rawDesc.indexOf('__METADATA__');
      if (metaIdx !== -1) {
        try {
          metadata = JSON.parse(rawDesc.substring(metaIdx + 12));
        } catch (e) {
          console.error('Error parsing metadata in route:', e);
        }
        rawDesc = rawDesc.substring(0, metaIdx);
      }

      if (rawDesc.startsWith('__SECTION__')) {
        isSection = true;
        rawDesc = rawDesc.substring(11);
        const styleIdx = rawDesc.indexOf('__STYLE__');
        if (styleIdx !== -1) {
          try {
            sectionStyle = JSON.parse(rawDesc.substring(styleIdx + 9));
          } catch (e) {
            console.error('Error parsing section style in route:', e);
          }
          rawDesc = rawDesc.substring(0, styleIdx);
        }
      }

      let shortDesc = rawDesc;
      let longDesc = '';
      if (rawDesc.includes('\n')) {
        const parts = rawDesc.split('\n');
        shortDesc = parts[0];
        longDesc = parts.slice(1).join('\n');
      }
      
      shortDesc = cleanEmojis(shortDesc);
      longDesc = cleanEmojis(longDesc);

      const parsedBrand = extractBrandAndModelFromDesc(d.descripcion || '').marca;
      const parsedModel = extractBrandAndModelFromDesc(d.descripcion || '').modelo;

      let resolvedActivo = d.activo;
      if (!resolvedActivo && parsedBrand && parsedModel) {
        const cleanBrand = parsedBrand.trim();
        const modelNumMatch = parsedModel.match(/\d+/);
        const modelSearchTerm = modelNumMatch ? modelNumMatch[0] : parsedModel.trim();

        resolvedActivo = await prisma.activoFijo.findFirst({
          where: {
            organizationId: doc.organizationId,
            OR: [
              {
                AND: [
                  {
                    OR: [
                      { marca: { contains: cleanBrand, mode: 'insensitive' } },
                      { descripcionCorta: { contains: cleanBrand, mode: 'insensitive' } }
                    ]
                  },
                  {
                    OR: [
                      { modelo: { contains: modelSearchTerm, mode: 'insensitive' } },
                      { descripcionCorta: { contains: modelSearchTerm, mode: 'insensitive' } },
                      { descripcionDetallada: { contains: modelSearchTerm, mode: 'insensitive' } }
                    ]
                  }
                ]
              }
            ]
          }
        });
      }

      const code = resolvedActivo?.idQr || d.producto?.sku || '';
      const isAsset = !!resolvedActivo?.idQr;

      return {
        id: d.id,
        code: code,
        isAsset: isAsset,
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
        imageUrl: metadata.imageUrl || d.producto?.imagenWeb || (d.producto?.imagenes && d.producto?.imagenes[0]) || resolvedActivo?.imagenUrl || resolveServiceImageUrl(shortDesc) || null,
        garantia: resolvedActivo?.garantia || extractWarrantyFromDesc(d.descripcion || '') || null,
        mantenimientosIncluidos: resolvedActivo?.mantenimientosIncluidos || null,
        frecuenciaMantenimientoMeses: resolvedActivo?.frecuenciaMantenimientoMeses || null,
        serie: metadata.serie || resolvedActivo?.serie || null,
        marca: resolvedActivo?.marca || resolvedActivo?.producto?.marca || d.producto?.marca || parsedBrand || null,
        modelo: resolvedActivo?.modelo || resolvedActivo?.producto?.modelo || d.producto?.modelo || parsedModel || null,
        marcaModelo: metadata.marcaModelo || (resolvedActivo?.marca && resolvedActivo?.modelo ? `${resolvedActivo.marca} ${resolvedActivo.modelo}` : resolvedActivo?.marca || resolvedActivo?.modelo || (parsedBrand && parsedModel ? `${parsedBrand} ${parsedModel}` : parsedBrand || parsedModel || null))
      };
    }));
    
    const DOC_TYPES = [
      { key: 'cotizacion', label: 'COTIZACIÓN' },
      { key: 'proforma', label: 'PRO FORMA' },
      { key: 'factura', label: 'FACTURA OFICIAL' },
      { key: 'nota_credito', label: 'NOTA DE CRÉDITO' },
      { key: 'presupuesto_reparacion', label: 'PRESUPUESTO DE REPARACIÓN' },
      { key: 'presupuesto_mantenimiento', label: 'PRESUPUESTO DE MANTENIMIENTO' }
    ];
    const resolvedDocType = doc.tipoDocumento.toLowerCase();
    let currentDocType = DOC_TYPES.find(d => d.key === resolvedDocType) || DOC_TYPES[0];

    // Si es una cotización vinculada a soporte, cambiar la etiqueta del PDF
    if (resolvedDocType === 'cotizacion' && doc.ordenTrabajo) {
      if (doc.ordenTrabajo.tipoTrabajo === 'MANTENIMIENTO') {
        currentDocType = { key: 'cotizacion', label: 'PRESUPUESTO DE MANTENIMIENTO' };
      } else {
        currentDocType = { key: 'cotizacion', label: 'PRESUPUESTO DE REPARACIÓN' };
      }
    }

    const docSettings = (doc as any).templateSettings || {};
    const orgSettings = (org as any).invoiceSettings || {};
    const settings = { ...DEFAULT_INVOICE_SETTINGS, ...orgSettings, ...docSettings };

    const totals = {
      subtotal: lineItems.reduce((acc: number, item: any) => acc + calcLine(item, settings?.pricesIncludeTax).base, 0),
      descuentos: lineItems.reduce((acc: number, item: any) => acc + calcLine(item, settings?.pricesIncludeTax).dAmount, 0),
      get exento() {
        const val = lineItems.reduce((acc: number, item: any) => item.taxType === 'exento' ? acc + calcLine(item, settings?.pricesIncludeTax).baseAfterDiscount : acc, 0);
        const adjustment = Number(settings?.roundAdjustment) || 0;
        if (this.isv15 === 0 && this.isv18 === 0 && val > 0) {
          return val + adjustment;
        }
        return val;
      },
      get exonerado() {
        const val = lineItems.reduce((acc: number, item: any) => item.taxType === 'exonerado' ? acc + calcLine(item, settings?.pricesIncludeTax).baseAfterDiscount : acc, 0);
        const adjustment = Number(settings?.roundAdjustment) || 0;
        if (this.isv15 === 0 && this.isv18 === 0 && this.exento === 0 && val > 0) {
          return val + adjustment;
        }
        return val;
      },
      gravado15: lineItems.reduce((acc: number, item: any) => item.taxType === '15%' ? acc + calcLine(item, settings?.pricesIncludeTax).baseAfterDiscount : acc, 0),
      get isv15() {
        const val = lineItems.reduce((acc: number, item: any) => item.taxType === '15%' ? acc + calcLine(item, settings?.pricesIncludeTax).tax : acc, 0);
        const adjustment = Number(settings?.roundAdjustment) || 0;
        if (val > 0) {
          return val + adjustment;
        }
        return val;
      },
      gravado18: lineItems.reduce((acc: number, item: any) => item.taxType === '18%' ? acc + calcLine(item, settings?.pricesIncludeTax).baseAfterDiscount : acc, 0),
      get isv18() {
        const val = lineItems.reduce((acc: number, item: any) => item.taxType === '18%' ? acc + calcLine(item, settings?.pricesIncludeTax).tax : acc, 0);
        const adjustment = Number(settings?.roundAdjustment) || 0;
        if (val > 0 && this.isv15 === 0) {
          return val + adjustment;
        }
        return val;
      },
      get total() { 
        const baseTotal = this.subtotal - this.descuentos + this.isv15 + this.isv18;
        if (this.isv15 === 0 && this.isv18 === 0) {
          const adjustment = Number(settings?.roundAdjustment) || 0;
          if (this.exento > 0 || this.exonerado > 0) {
            return baseTotal + adjustment;
          }
        }
        return baseTotal;
      }
    };

    // Build the data object 
    const templateData = {
      organization: org,
      settings: settings,
      docNumber: (doc as any).correlativo || (doc as any).numeroDocumento || 'PENDIENTE',
      currentDocType,
      selectedClient: doc.cliente ? {
        name: (doc.cliente as any).nombre || (doc.cliente as any).name || '',
        address: (doc.cliente as any).direccion || (doc.cliente as any).address || '',
        city: (doc.cliente as any).ciudad || (doc.cliente as any).city || '',
        rtn: (doc.cliente as any).rtn || '',
        phone: (doc.cliente as any).telefono || '',
        nombreContacto: (doc.cliente as any).nombreContacto || '',
        telefonoContacto: (doc.cliente as any).telefonoContacto || '',
      } : null,
      nombreUsuario: (doc.creadoPor ? [doc.creadoPor.nombre, doc.creadoPor.apellido].filter(Boolean).join(' ') : null) || (doc as any).nombreUsuario || (doc as any).creadoPor?.email || 'Sistema',
      paymentTerms: doc.terminosPago || 'Pago inmediato',
      paymentMethod: doc.metodoPago || 'Efectivo',
      docType: resolvedDocType,
      notes: cleanEmojis(doc.notas || ''),
      lineItems,
      totals,
      today: (() => {
        const d = doc.fechaEmision ? new Date(doc.fechaEmision) : new Date();
        const shiftedDate = new Date(d.getTime() - 6 * 60 * 60 * 1000);
        const day = String(shiftedDate.getUTCDate()).padStart(2, '0');
        const month = String(shiftedDate.getUTCMonth() + 1).padStart(2, '0');
        const year = shiftedDate.getUTCFullYear();
        
        let hours = shiftedDate.getUTCHours();
        const minutes = String(shiftedDate.getUTCMinutes()).padStart(2, '0');
        const seconds = String(shiftedDate.getUTCSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const strHours = String(hours).padStart(2, '0');
        
        return `${day}/${month}/${year} ${strHours}:${minutes}:${seconds} ${ampm}`;
      })(),
      fmt,
      fechaEmision: doc.fechaEmision || null,
      ordenEntrega: doc.ordenEntrega || null,
      ordenTrabajo: doc.ordenTrabajo || null
    };

    // 3. Pre-fetch external images (Logo and Products) as Buffers
    const images: Record<string, string> = {};
    
    // Helper to fetch and convert to base64
    const fetchImageAsBase64 = async (url: string, resizeOptions?: { width?: number, height?: number, quality?: number } | null) => {
      try {
        if (!url || url.startsWith('data:')) return url;
        
        // If it's a local file path, read it directly from the public folder
        if (url.startsWith('/')) {
          const localPath = path.join(process.cwd(), 'public', url);
          if (fs.existsSync(localPath)) {
            let buffer = fs.readFileSync(localPath);
            let contentType = 'image/jpeg';
            if (url.toLowerCase().endsWith('.png')) contentType = 'image/png';
            if (url.toLowerCase().endsWith('.svg')) contentType = 'image/svg+xml';
            if (url.toLowerCase().endsWith('.gif')) contentType = 'image/gif';
            
            if (resizeOptions && !url.toLowerCase().endsWith('.svg')) {
              try {
                const sharp = (await import('sharp')).default;
                let sharpInstance = sharp(buffer);
                if (resizeOptions.width || resizeOptions.height) {
                  sharpInstance = sharpInstance.resize({
                    width: resizeOptions.width,
                    height: resizeOptions.height,
                    fit: 'inside',
                    withoutEnlargement: true
                  });
                }
                buffer = await sharpInstance.jpeg({ quality: resizeOptions.quality || 70 }).toBuffer();
                contentType = 'image/jpeg';
              } catch (e) {
                console.warn(`Failed to compress local ${url}:`, e);
              }
            } else if (url.toLowerCase().endsWith('.webp') || url.toLowerCase().endsWith('.svg')) {
              try {
                const sharp = (await import('sharp')).default;
                buffer = await sharp(buffer).png().toBuffer();
                contentType = 'image/png';
              } catch (e) {
                console.warn(`Failed to convert local ${url} to png:`, e);
                if (url.toLowerCase().endsWith('.webp')) contentType = 'image/webp';
              }
            }
            return `data:${contentType};base64,${buffer.toString('base64')}`;
          }
        }

        let fetchUrl = url;
        const res = await fetch(fetchUrl);
        if (!res.ok) return null;
        const arrayBuffer = await res.arrayBuffer();
        let buffer: any = Buffer.from(arrayBuffer);
        let contentType = res.headers.get('content-type') || 'image/jpeg';
        
        if (!contentType.includes('svg')) {
          try {
            const sharp = (await import('sharp')).default;
            let sharpInstance = sharp(buffer);
            if (resizeOptions && (resizeOptions.width || resizeOptions.height)) {
              sharpInstance = sharpInstance.resize({
                width: resizeOptions.width,
                height: resizeOptions.height,
                fit: 'inside',
                withoutEnlargement: true
              });
              buffer = await sharpInstance.jpeg({ quality: resizeOptions.quality || 70 }).toBuffer();
              contentType = 'image/jpeg';
            } else if (resizeOptions !== null) {
              // Default thumbnail compression for remote images (unless explicitly requested null)
              sharpInstance = sharpInstance.resize({
                width: 200,
                height: 200,
                fit: 'inside',
                withoutEnlargement: true
              });
              buffer = await sharpInstance.jpeg({ quality: 70 }).toBuffer();
              contentType = 'image/jpeg';
            } else {
              // Handle webp to png fallback if no resize but webp
              if (contentType.includes('webp') || url.toLowerCase().endsWith('.webp')) {
                buffer = await sharpInstance.png().toBuffer();
                contentType = 'image/png';
              }
            }
          } catch (e) {
            console.warn('Failed to resize remote image with sharp:', e);
            if (contentType.includes('webp') || url.toLowerCase().endsWith('.webp')) {
              try {
                const sharp = (await import('sharp')).default;
                buffer = await sharp(buffer).png().toBuffer();
                contentType = 'image/png';
              } catch (e2) {}
            }
          }
        } else {
          try {
            const sharp = (await import('sharp')).default;
            buffer = await sharp(buffer).png().toBuffer();
            contentType = 'image/png';
          } catch (e) {}
        }

        return `data:${contentType};base64,${buffer.toString('base64')}`;
      } catch (err) {
        console.warn('Failed to fetch image:', url, err);
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
        const itemImageBase64 = await fetchImageAsBase64(item.imageUrl, { width: 180, height: 180, quality: 60 });
        if (itemImageBase64) images[item.id] = itemImageBase64;
      }
    }

    // Fetch QR Code Images for assets
    for (const item of lineItems as any[]) {
      if (item.isAsset && item.code) {
        const qrText = encodeURIComponent(`${baseUrl}/ficha-tecnica/${item.code}`);
        const qrUrl = `https://bwipjs-api.metafloor.com/?bcid=qrcode&text=${qrText}&scale=3&eclevel=M&includetext=false`;
        const qrBase64 = await fetchImageAsBase64(qrUrl);
        if (qrBase64) {
          images[`qr_${item.code}`] = qrBase64;
        }
      }
    }

    // Fetch Delivery Evidence Images if type === 'entrega'
    if (doc.ordenEntrega && type === 'entrega' && Array.isArray(doc.ordenEntrega.evidenciaFotos)) {
      for (let i = 0; i < doc.ordenEntrega.evidenciaFotos.length; i++) {
        const fotoUrl = doc.ordenEntrega.evidenciaFotos[i];
        const base64 = await fetchImageAsBase64(fotoUrl, { width: 400, height: 400, quality: 60 });
        if (base64) {
          images[`evidencia_${i}`] = base64;
        }
      }
    }

    // Load signatures and seals if enabled
    const getLocalOrRemoteImage = async (url: string) => {
      try {
        if (url.startsWith('/')) {
          const fs = await import('fs');
          const path = await import('path');
          const localPath = path.join(process.cwd(), 'public', url);
          if (fs.existsSync(localPath)) {
            let buffer = fs.readFileSync(localPath);
            
            // Process signature and seal images to make their white background transparent
            try {
              const sharp = (await import('sharp')).default;
              const image = sharp(buffer);
              const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
              for (let i = 0; i < data.length; i += 4) {
                // If pixel is white/near-white, make it transparent
                if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
                  data[i+3] = 0;
                } else {
                  // Enhance contrast/visibility by making non-white lines darker (decrease RGB values by 55%)
                  data[i] = Math.max(0, Math.floor(data[i] * 0.45));
                  data[i+1] = Math.max(0, Math.floor(data[i+1] * 0.45));
                  data[i+2] = Math.max(0, Math.floor(data[i+2] * 0.45));
                }
              }
              buffer = (await sharp(data as any, {
                raw: {
                  width: info.width,
                  height: info.height,
                  channels: 4
                }
              }).png().toBuffer()) as any;
            } catch (sharpErr) {
              console.warn('Failed to process image transparency with sharp:', sharpErr);
            }

            const contentType = 'image/png';
            return `data:${contentType};base64,${buffer.toString('base64')}`;
          }
        }
      } catch (err) {
        console.warn('Failed to read local image, trying fetch:', err);
      }
      return fetchImageAsBase64(url);
    };

    const shouldLoadSignatures = settings.showSignatures || (doc.ordenEntrega && doc.ordenEntrega.mostrarFirmas !== false);
    const shouldLoadSeals = settings.showSeals || (doc.ordenEntrega && doc.ordenEntrega.mostrarSello !== false) || type === 'garantia';

    if (shouldLoadSignatures) {
      const signaturesList = settings.signaturesList || [
        { id: 'emilia', name: 'Ing. Emilia Zapata', role: 'Jefa del departamento de Biomédica', imageUrl: '/firmas-sellos/firma emilia zapata.png', enabled: settings.showEmiliaZapata !== false },
        { id: 'manuel', name: 'Ing. Manuel Tejada', role: 'Gerente General', imageUrl: '/firmas-sellos/firma Ing Manuel Tejada.png', enabled: settings.showManuelTejada !== false }
      ];
      for (const sig of signaturesList) {
        if (sig.enabled && sig.imageUrl) {
          const sigBase64 = await getLocalOrRemoteImage(sig.imageUrl);
          if (sigBase64) {
            images[`sig_${sig.id}`] = sigBase64;
          }
        }
      }

      // Cargar firma del cliente si existe en la factura
      if (doc.firmaClienteBase64) {
        const clientSigBase64 = await fetchImageAsBase64(doc.firmaClienteBase64);
        if (clientSigBase64) {
          images['sig_cliente'] = clientSigBase64;
        }
      }
    }

    // Generar Código QR de Trazabilidad Digital / Validación de Entrega
    if (doc.ordenEntrega?.id) {
      try {
        const QRCode = (await import('qrcode')).default;
        const targetHost = req.headers.get('host') || 'www.bioelectronicahn.com';
        const protocol = targetHost.includes('localhost') ? 'http' : 'https';
        const validationUrl = `${protocol}://${targetHost}/v/entrega/${doc.ordenEntrega.id}`;
        const qrDataUrl = await QRCode.toDataURL(validationUrl, { margin: 1, width: 250, errorCorrectionLevel: 'M' });
        images['qr_code'] = qrDataUrl;
      } catch (qrErr) {
        console.error('Error generando QR de validación:', qrErr);
      }
    }

    if (shouldLoadSeals) {
      const companySealImg = settings.companySealUrl || '/firmas-sellos/SELLO DE BIOELECTRONICA.png';
      if (settings.showCompanySeal !== false) {
        const companySealBase64 = await getLocalOrRemoteImage(companySealImg);
        if (companySealBase64) images['seal_company'] = companySealBase64;
      }
      
      let statusSealImg = '';
      if (settings.selectedStatusSeal === 'cancelado') {
        statusSealImg = '/firmas-sellos/SELLO DE CANCELADO.png';
      } else if (settings.selectedStatusSeal === 'entregado') {
        statusSealImg = '/firmas-sellos/SELLO DE ENTREGADO.png';
      } else if (settings.selectedStatusSeal && settings.selectedStatusSeal !== 'none') {
        statusSealImg = settings.selectedStatusSeal; // Custom URL
      }
      
      if (statusSealImg) {
        const statusSealBase64 = await getLocalOrRemoteImage(statusSealImg);
        if (statusSealBase64) {
          images[`seal_${settings.selectedStatusSeal}`] = statusSealBase64;
        }
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

    // Select Component to render
    let pdfTemplate = LegacyTemplatePDF;
    let downloadFileName = `documento-${id}.pdf`;
    if (type === 'entrega') {
      pdfTemplate = OrdenEntregaPDF;
      downloadFileName = `orden-entrega-${doc.ordenEntrega?.correlativo || id}.pdf`;
    } else if (type === 'garantia') {
      pdfTemplate = GarantiaLimitadaPDF;
      downloadFileName = `garantia-${doc.ordenEntrega?.correlativo || id}.pdf`;
    }

    // 4. Render PDF
    const stream = await renderToStream(React.createElement(pdfTemplate, { data: templateData, images }) as any);
    
    // We must return the stream directly
    return new Response(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${downloadFileName}"`,
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
