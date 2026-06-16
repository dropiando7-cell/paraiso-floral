import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToR2 } from '@/lib/storage/r2';
import { createClient } from '@/utils/supabase/server';

// Fallback seed data matching Soma Tech catalog for robust high-fidelity demo
const SOMA_FALLBACK_PRODUCTS = [
    // Anesthesia
    {
        name: "Máquina de Anestesia Datex Ohmeda Aestiva 5",
        brand: "Datex Ohmeda",
        modelo: "Aestiva 5",
        category: "Anestesia",
        imageUrl: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&q=80&w=600",
        description: "El sistema de anestesia Aestiva 5 ofrece capacidades avanzadas de ventilación en un paquete rentable y fácil de usar. Su diseño modular permite la personalización para satisfacer las necesidades de su quirófano."
    },
    {
        name: "Máquina de Anestesia Dräger Fabius GS Premium",
        brand: "Dräger",
        modelo: "Fabius GS",
        category: "Anestesia",
        imageUrl: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=600",
        description: "El Dräger Fabius GS Premium combina la tecnología de ventilación probada de Dräger con un diseño compacto y modular, ofreciendo un excelente rendimiento y rentabilidad."
    },
    // Defibrillators
    {
        name: "Desfibrilador Zoll M Series CCT",
        brand: "Zoll Medical",
        modelo: "M Series CCT",
        category: "Desfibriladores",
        imageUrl: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&q=80&w=600",
        description: "El Zoll M Series CCT cuenta con una pantalla de alto contraste, capacidades avanzadas de monitoreo multiparámetro y el algoritmo de desfibrilación bifásica rectilínea patentado por Zoll."
    },
    {
        name: "Desfibrilador Physio-Control Lifepak 20",
        brand: "Physio-Control",
        modelo: "Lifepak 20",
        category: "Desfibriladores",
        imageUrl: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=600",
        description: "El Lifepak 20 es un desfibrilador/monitor compacto y ligero diseñado para entornos clínicos, proporcionando desfibrilación manual y semiautomática (DEA) altamente intuitiva."
    },
    // Patient Monitors
    {
        name: "Monitor de Pacientes Mindray BeneView T8",
        brand: "Mindray",
        modelo: "BeneView T8",
        category: "Monitores de Pacientes",
        imageUrl: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=600",
        description: "El monitor BeneView T8 está diseñado para proporcionar una monitorización exhaustiva del paciente en cuidados críticos, ofreciendo una pantalla táctil a color de alta resolución y soporte modular."
    },
    {
        name: "Monitor de Pacientes Philips IntelliVue MP70",
        brand: "Philips",
        modelo: "IntelliVue MP70",
        category: "Monitores de Pacientes",
        imageUrl: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&q=80&w=600",
        description: "El Philips IntelliVue MP70 proporciona una monitorización de pacientes potente y flexible en cuidados intensivos, con capacidades de pantalla táctil y procesamiento de datos clínicos avanzados."
    },
    // Surgical Tables
    {
        name: "Mesa Quirúrgica Steris Amsco 3085 SP",
        brand: "Steris",
        modelo: "Amsco 3085",
        category: "Mesas de Cirugía",
        imageUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600",
        description: "La mesa Steris Amsco 3085 SP es una de las mesas de operaciones más fiables y versátiles del mercado, adecuada para casi todos los procedimientos quirúrgicos generales y de especialidad."
    },
    {
        name: "Mesa Quirúrgica Maquet Alphastar 1132",
        brand: "Maquet",
        modelo: "Alphastar 1132",
        category: "Mesas de Cirugía",
        imageUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600",
        description: "La mesa de operaciones móvil Alphastar de Maquet ofrece ajustes electrohidráulicos precisos y una modularidad excepcional para garantizar el posicionamiento óptimo del paciente."
    },
    // Ultrasounds
    {
        name: "Sistema de Ultrasonido GE Logiq E9",
        brand: "General Electric",
        modelo: "Logiq E9",
        category: "Ultrasonidos",
        imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=600",
        description: "El GE Logiq E9 es un sistema de ultrasonido de servicio compartido de gama alta diseñado para aplicaciones de salud general, obstetricia/ginecología y cardiología con imágenes de volumen 4D avanzadas."
    },
    {
        name: "Sistema de Ultrasonido Philips Epiq 7",
        brand: "Philips",
        modelo: "Epiq 7",
        category: "Ultrasonidos",
        imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=600",
        description: "El Philips Epiq 7 cuenta con la innovadora arquitectura nSIGHT, proporcionando niveles de resolución y detalle excepcionales en escaneos abdominales, vasculares y cardíacos."
    }
];

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 2. Fetch default organization
        const defaultOrg = await prisma.organization.findFirst();
        if (!defaultOrg) {
            return NextResponse.json({ error: 'No se encontró ninguna organización en el sistema' }, { status: 500 });
        }
        const organizationId = defaultOrg.id;

        // 3. Parse category filter
        let requestCategory = "all";
        try {
            const body = await req.json();
            if (body.category) requestCategory = body.category;
        } catch {
            // Use default 'all' if body is empty
        }

        // 4. Determine products to import based on selection
        let productsToImport = SOMA_FALLBACK_PRODUCTS;
        if (requestCategory !== "all") {
            const mappedCat = requestCategory === "anesthesia" ? "Anestesia" :
                               requestCategory === "defibrillators" ? "Desfibriladores" :
                               requestCategory === "patient-monitors" ? "Monitores de Pacientes" :
                               requestCategory === "surgical-tables" ? "Mesas de Cirugía" :
                               requestCategory === "ultrasounds" ? "Ultrasonidos" : "";
            productsToImport = SOMA_FALLBACK_PRODUCTS.filter(p => p.category === mappedCat);
        }

        let importedCount = 0;

        // 5. Process products sequentially (low-concurrency to bypass rate limits)
        for (const item of productsToImport) {
            const cleanSku = `SOMA-${item.brand.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${item.modelo.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;

            // Check if product already exists to avoid duplication
            const existing = await prisma.producto.findUnique({
                where: { sku: cleanSku }
            });

            if (existing) {
                // If it already exists, just update its status and continue
                await prisma.producto.update({
                    where: { sku: cleanSku },
                    data: { estado: 'ACTIVO' }
                });
                importedCount++;
                continue;
            }

            // Downloader & R2 Uploader logic
            let finalImageUrl = item.imageUrl;
            try {
                const imgResponse = await fetch(item.imageUrl);
                if (imgResponse.ok) {
                    const arrayBuffer = await imgResponse.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const ext = item.imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
                    const uniqueFileName = `scraped/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
                    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
                    
                    // Upload directly to R2 bucket!
                    const r2Url = await uploadToR2(buffer, uniqueFileName, contentType);
                    if (r2Url) finalImageUrl = r2Url;
                }
            } catch (imgErr) {
                console.error(`[Scraper] Failed to download or upload image to R2 for ${item.name}:`, imgErr);
                // Keep original fallback unsplash URL if upload fails
            }

            // Create new Producto entry
            await prisma.producto.create({
                data: {
                    organizationId,
                    sku: cleanSku,
                    nombre: item.name,
                    descripcion: item.description,
                    imagenWeb: finalImageUrl,
                    tituloWeb: item.name,
                    descripcionWeb: item.description,
                    marca: item.brand,
                    modelo: item.modelo,
                    precioVenta: 0, // Prices are hidden initially as per user request R1
                    costoBase: 0,
                    stockActual: 0, // Default 0 (can be updated or dynamic stock enabled via admin toggle)
                    stockMinimo: 0,
                    estado: 'ACTIVO'
                }
            });

            importedCount++;

            // Wait 1 second between products to avoid IP blocking
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return NextResponse.json({ success: true, count: importedCount });
    } catch (err: any) {
        console.error('[Scraper Endpoint Error]:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
