'use server'

import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper to get current DB user (already authenticated)
export async function getDbUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, organizationId: true, role: true }
    })

    if (!dbUser) throw new Error('Unauthorized')

    // Optional: Only allow SUPER_ADMIN or ORG_ADMIN if you want,
    // For now we allow anyone in the org to view based on layout requirements,
    // though the UI said "Solo accesible por administradores". Let's enforce it:
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ORG_ADMIN') {
        throw new Error('Forbidden: Only administrators can access the vault.')
    }

    return dbUser
}

export async function getVaultItems() {
    try {
        const user = await getDbUser()

        const items = await prisma.passwordVault.findMany({
            where: { organizationId: user.organizationId },
            orderBy: { createdAt: 'desc' }
        })

        // Return everything except the raw encrypted text to the general view
        // to prevent exposing the cipher text payload unnecessarily.
        return items.map(item => ({
            id: item.id,
            title: item.title,
            username: item.username,
            url: item.url,
            notes: item.notes,
            category: item.category,
            details: (item as any).details,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        }))
    } catch (error) {
        console.error('Error fetching vault items:', error)
        return []
    }
}

export async function decryptVaultPassword(id: string) {
    try {
        const user = await getDbUser()

        const item = await prisma.passwordVault.findUnique({
            where: { id }
        })

        if (!item || item.organizationId !== user.organizationId) {
            throw new Error('Item not found')
        }

        return decrypt(item.encryptedPass)
    } catch (error) {
        console.error('Error decrypting password:', error)
        throw new Error('Failed to decrypt password')
    }
}

export async function createVaultItem(formData: FormData) {
    try {
        const user = await getDbUser()

        const title = formData.get('title') as string
        const username = formData.get('username') as string
        const password = formData.get('password') as string
        const url = formData.get('url') as string
        const category = formData.get('category') as string
        const notes = formData.get('notes') as string
        const detailsStr = formData.get('details') as string

        let details = null
        if (detailsStr) {
            try {
                details = JSON.parse(detailsStr)
            } catch (e) {
                console.warn('Failed to parse details JSON', e)
            }
        }

        if (!title || (!username && category !== 'Memorias RAM') || (!password && category !== 'Memorias RAM')) {
            throw new Error('Title, username, and password are required.')
        }

        const encryptedPass = password ? encrypt(password) : encrypt('NO_PASSWORD')

        await prisma.passwordVault.create({
            data: {
                organizationId: user.organizationId,
                title,
                username: username || '',
                encryptedPass,
                url: url || null,
                category: category || 'General',
                notes: notes || null,
                details: details as any,
            } as any
        })

        revalidatePath('/boveda')
        return { success: true }
    } catch (error: any) {
        return { error: error.message || 'Failed to create item' }
    }
}

export async function updateVaultItem(id: string, formData: FormData) {
    try {
        const user = await getDbUser()

        const item = await prisma.passwordVault.findUnique({ where: { id } })
        if (!item || item.organizationId !== user.organizationId) {
            throw new Error('Item not found')
        }

        const title = formData.get('title') as string
        const username = formData.get('username') as string
        const password = formData.get('password') as string
        const url = formData.get('url') as string
        const category = formData.get('category') as string
        const notes = formData.get('notes') as string
        const detailsStr = formData.get('details') as string

        let details = null
        if (detailsStr) {
            try {
                details = JSON.parse(detailsStr)
            } catch (e) {
                console.warn('Failed to parse details JSON', e)
            }
        }

        if (!title || (!username && category !== 'Memorias RAM')) {
            throw new Error('Title and username are required.')
        }

        const dataToUpdate: any = {
            title,
            username: username || '',
            url: url || null,
            category: category || 'General',
            notes: notes || null,
            details: details as any,
        } as any

        if (password) {
            dataToUpdate.encryptedPass = encrypt(password)
        }

        await prisma.passwordVault.update({
            where: { id },
            data: dataToUpdate
        })

        revalidatePath('/boveda')
        return { success: true }
    } catch (error: any) {
        return { error: error.message || 'Failed to update item' }
    }
}

export async function deleteVaultItem(id: string) {
    try {
        const user = await getDbUser()

        const item = await prisma.passwordVault.findUnique({ where: { id } })
        if (!item || item.organizationId !== user.organizationId) {
            throw new Error('Item not found')
        }

        await prisma.passwordVault.delete({ where: { id } })

        revalidatePath('/boveda')
        return { success: true }
    } catch (error: any) {
        return { error: error.message || 'Failed to delete item' }
    }
}
