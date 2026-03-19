import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({ where: { email: user.email }, select: { organizationId: true } });
        if (!dbUser?.organizationId) return NextResponse.json({ error: 'Usuario sin organización' }, { status: 403 });

        const { organizationId } = dbUser;

        // Fetch up to 50 active items without a category
        const activos = await prisma.activoFijo.findMany({
            where: { organizationId, categoriaId: null },
            select: { id: true, descripcionCorta: true, modelo: true, cuentaAct: true },
            take: 50
        });

        if (activos.length === 0) {
            return NextResponse.json({ message: 'No hay productos pendientes por categorizar.', processedCount: 0 });
        }

        // Fetch existing categories
        const categorias = await prisma.categoria.findMany({
            where: { organizationId },
            select: { id: true, nombre: true }
        });

        const prompt = `
Actúas como un experto ingeniero clínico y analista de inventario biomédico.
Tu tarea es clasificar una lista de productos en categorías lógicas.
        
Aquí están las categorías existentes en el sistema (ID: Nombre):
${categorias.length > 0 ? categorias.map(c => `- ${c.id}: ${c.nombre}`).join('\n') : '(No hay categorías creadas aún)'}

Si ninguna de las categorías existentes describe bien el producto, invéntate una NUEVA categoría corta, descriptiva y general (Ej: "Sensores SpO2", "Componentes Electrónicos", "Herramientas de Precisión", "Equipos Médicos", "Computación", "Cables Médicos", "Baterías y Fuentes"). No crees demasiadas categorías nuevas; agrupa.

A continuación, la lista de productos a clasificar (formato JSON):
${JSON.stringify(activos.map(a => ({ id: a.id, descripcion: a.descripcionCorta, modelo: a.modelo, cuentaOdoo: a.cuentaAct })))}

Devuelve estrictamente un objeto JSON con una propiedad "results" que contenga un array. Cada elemento debe tener:
- "productId": string (el ID del producto)
- "categoriaId": string (el ID de una categoría EXiSTENTE, o null si estás creando una nueva)
- "nuevaCategoria": string (el nombre sugerido de la categoría; deja en null si usaste un "categoriaId" existente)

NO devuelvas explicaciones, SOLO EL JSON.
`;

        const message = await client.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 4096,
            temperature: 0.2,
            messages: [
                { role: "user", content: prompt }
            ]
        });

        const textResponse = (message.content[0] as Anthropic.TextBlock).text;
        
        // Extract JSON
        let jsonStr = textResponse;
        if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
        } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
        }

        const data = JSON.parse(jsonStr);
        const results: Array<{ productId: string, categoriaId: string | null, nuevaCategoria: string | null }> = data.results || [];

        let processCount = 0;
        let createdCatsCount = 0;
        
        // Cache to prevent duplicate categories in the same run
        const newCatMap = new Map<string, string>(); // name -> mapped UUID
        const knownCats = new Set(categorias.map(c => c.nombre.toUpperCase()));

        for (const res of results) {
            let catIdToUse = res.categoriaId;
            
            // Generate standard color logic
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

            if (!catIdToUse && res.nuevaCategoria) {
                const upperName = res.nuevaCategoria.trim().toUpperCase();
                
                if (newCatMap.has(upperName)) {
                    catIdToUse = newCatMap.get(upperName)!;
                } else {
                    // check if DB already has it
                    const dbExists = await prisma.categoria.findFirst({ where: { organizationId, nombre: upperName } });
                    if (dbExists) {
                        catIdToUse = dbExists.id;
                        newCatMap.set(upperName, dbExists.id);
                    } else {
                        // Create it
                        const newCat = await prisma.categoria.create({
                            data: {
                                organizationId,
                                nombre: upperName,
                                color: colors[Math.floor(Math.random() * colors.length)]
                            }
                        });
                        catIdToUse = newCat.id;
                        newCatMap.set(upperName, newCat.id);
                        createdCatsCount++;
                    }
                }
            }

            if (catIdToUse) {
                await prisma.activoFijo.update({
                    where: { id: res.productId },
                    data: { categoriaId: catIdToUse }
                });
                processCount++;
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Se recategorizaron ${processCount} productos exitosamente. Se crearon ${createdCatsCount} categorías nuevas.`,
            processedCount: processCount
        });

    } catch (error: any) {
        console.error('Error auto-categorizing:', error);
        return NextResponse.json({ error: error.message || 'Error analizando' }, { status: 500 });
    }
}
