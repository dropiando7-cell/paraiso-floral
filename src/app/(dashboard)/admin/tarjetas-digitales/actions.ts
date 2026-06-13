'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

// Helper to authenticate user and get organization id
async function getOrgContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true, role: true }
    });
    if (!dbUser) throw new Error('Usuario no registrado en la base de datos');
    
    // Check role access. It must be SUPER_ADMIN or ORG_ADMIN.
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN') {
        throw new Error('No tienes permisos de administración');
    }

    return { userId: dbUser.id, orgId: dbUser.organizationId };
}

export async function getDigitalCards() {
    try {
        const { orgId } = await getOrgContext();
        return await prisma.digitalCard.findMany({
            where: { organizationId: orgId },
            include: {
                user: {
                    select: {
                        nombre: true,
                        apellido: true,
                        email: true
                    }
                },
                leads: true
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (err: any) {
        console.error('Error fetching digital cards:', err);
        throw new Error(err.message || 'Error al obtener tarjetas');
    }
}

export async function getCardLeads() {
    try {
        const { orgId } = await getOrgContext();
        return await prisma.cardLead.findMany({
            where: {
                card: {
                    organizationId: orgId
                }
            },
            include: {
                card: {
                    select: {
                        nombre: true,
                        apellido: true,
                        slug: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (err: any) {
        console.error('Error fetching card leads:', err);
        throw new Error(err.message || 'Error al obtener leads');
    }
}

export async function getOrganizationUsers() {
    try {
        const { orgId } = await getOrgContext();
        return await prisma.user.findMany({
            where: { organizationId: orgId },
            select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                puesto: true,
                phoneNumber: true
            },
            orderBy: { nombre: 'asc' }
        });
    } catch (err: any) {
        console.error('Error fetching organization users:', err);
        throw new Error(err.message || 'Error al obtener usuarios');
    }
}

export async function saveDigitalCard(data: {
    id?: string;
    userId: string;
    slug: string;
    nombre: string;
    apellido: string;
    puesto?: string;
    phoneNumber?: string;
    email?: string;
    bio?: string;
    avatarUrl?: string;
    theme?: string;
    colorTheme?: string;
    whatsappEnabled?: boolean;
    whatsappNumber?: string;
    linkedinUrl?: string;
    websiteUrl?: string;
    instagramUrl?: string;
    facebookUrl?: string;
    leadFormEnabled?: boolean;
}) {
    try {
        const { orgId } = await getOrgContext();

        const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
        if (!cleanSlug) throw new Error('El slug no es válido');

        // Check if slug is taken by another card
        const slugExists = await prisma.digitalCard.findFirst({
            where: {
                slug: cleanSlug,
                id: data.id ? { not: data.id } : undefined
            }
        });
        if (slugExists) {
            throw new Error(`El slug "${cleanSlug}" ya está en uso por otra tarjeta`);
        }

        // Check if user already has a card
        const userExists = await prisma.digitalCard.findFirst({
            where: {
                userId: data.userId,
                id: data.id ? { not: data.id } : undefined
            }
        });
        if (userExists) {
            throw new Error(`El usuario seleccionado ya posee una tarjeta digital`);
        }

        const payload = {
            userId: data.userId,
            organizationId: orgId,
            slug: cleanSlug,
            nombre: data.nombre.trim(),
            apellido: data.apellido.trim(),
            puesto: data.puesto?.trim() || null,
            phoneNumber: data.phoneNumber?.trim() || null,
            email: data.email?.trim() || null,
            bio: data.bio?.trim() || null,
            avatarUrl: data.avatarUrl || null,
            theme: data.theme || 'modern',
            colorTheme: data.colorTheme || 'blue-600',
            whatsappEnabled: data.whatsappEnabled !== false,
            whatsappNumber: data.whatsappNumber?.trim() || null,
            linkedinUrl: data.linkedinUrl?.trim() || null,
            websiteUrl: data.websiteUrl?.trim() || null,
            instagramUrl: data.instagramUrl?.trim() || null,
            facebookUrl: data.facebookUrl?.trim() || null,
            leadFormEnabled: data.leadFormEnabled !== false,
        };

        let savedCard;
        if (data.id) {
            savedCard = await prisma.digitalCard.update({
                where: { id: data.id },
                data: payload
            });
        } else {
            savedCard = await prisma.digitalCard.create({
                data: payload
            });
        }

        revalidatePath('/admin/tarjetas-digitales');
        return { success: true, card: savedCard };
    } catch (err: any) {
        console.error('Error saving digital card:', err);
        throw new Error(err.message || 'Error al guardar la tarjeta');
    }
}

export async function deleteDigitalCard(id: string) {
    try {
        await getOrgContext();
        await prisma.digitalCard.delete({
            where: { id }
        });
        revalidatePath('/admin/tarjetas-digitales');
        return { success: true };
    } catch (err: any) {
        console.error('Error deleting digital card:', err);
        throw new Error(err.message || 'Error al eliminar la tarjeta');
    }
}
