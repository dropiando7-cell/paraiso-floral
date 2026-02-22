'use client'

import { useState, useTransition } from 'react'
import { Search, Shield, Copy, ExternalLink, MoreVertical, Key, Plus, Trash2, Edit } from 'lucide-react'
import { decryptVaultPassword, deleteVaultItem } from './actions'
import { VaultModal } from './VaultModal'

type VaultItem = {
    id: string
    title: string
    username: string
    url: string | null
    notes: string | null
    category: string
}

export function VaultClient({ initialItems }: { initialItems: VaultItem[] }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('Todas las categorías')
    const [isPending, startTransition] = useTransition()

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<VaultItem | null>(null)

    // Action state
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    const categories = ['Todas las categorías', 'Finanzas', 'Software', 'Infraestructura', 'General']

    const filteredItems = initialItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.username.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = categoryFilter === 'Todas las categorías' || item.category === categoryFilter
        return matchesSearch && matchesCategory
    })

    const handleCopyPassword = async (id: string) => {
        try {
            const password = await decryptVaultPassword(id)
            await navigator.clipboard.writeText(password)
            alert('Contraseña copiada al portapapeles de forma segura.')
        } catch (error) {
            console.error(error)
            alert('Error al descifrar la contraseña.')
        }
    }

    const handleDelete = (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta credencial? Esta acción no se puede deshacer.')) return
        startTransition(async () => {
            const res = await deleteVaultItem(id)
            if (res.error) alert(res.error)
            setOpenMenuId(null)
        })
    }

    const handleEdit = (item: VaultItem) => {
        setEditingItem(item)
        setIsModalOpen(true)
        setOpenMenuId(null)
    }

    const handleAdd = () => {
        setEditingItem(null)
        setIsModalOpen(true)
    }

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-brand-600" />
                        Bóveda de Contraseñas
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Almacenamiento encriptado de credenciales institucionales. Solo accesible por administradores.
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 bg-[#0A192F] hover:bg-[#0d213f] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A192F]"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Credencial
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:w-96">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar credencial..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-full sm:w-auto"
                        >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Título</th>
                                <th className="px-6 py-4">Usuario / Correo</th>
                                <th className="px-6 py-4 hidden sm:table-cell">Categoría</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        No se encontraron credenciales en esta bóveda.
                                    </td>
                                </tr>
                            ) : filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                                                <Key className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{item.title}</p>
                                                {item.url && (
                                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline flex items-center gap-1 mt-0.5">
                                                        {(() => {
                                                            try { return new URL(item.url).hostname } catch (e) { return item.url }
                                                        })()}
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <div
                                            onClick={() => {
                                                navigator.clipboard.writeText(item.username)
                                                // Could add a toast here
                                            }}
                                            className="flex items-center gap-2 cursor-pointer hover:text-slate-900" title="Copiar usuario"
                                        >
                                            {item.username}
                                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden sm:table-cell">
                                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right relative">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleCopyPassword(item.id)}
                                                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Descifrar y copiar contraseña"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                                {openMenuId === item.id && (
                                                    <div className="absolute right-0 top-10 w-36 bg-white border border-slate-200 shadow-lg rounded-xl z-50 overflow-hidden">
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <Edit className="w-4 h-4" /> Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            disabled={isPending}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Eliminar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                    <span>Mostrando {filteredItems.length} credenciales</span>
                    <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-green-500" />
                        <span>Cifrado AES-256 Activo</span>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <VaultModal
                    item={editingItem}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    )
}
