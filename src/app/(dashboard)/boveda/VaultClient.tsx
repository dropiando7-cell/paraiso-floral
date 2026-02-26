'use client'

import { useState, useTransition } from 'react'
import { Search, Shield, Copy, ExternalLink, MoreVertical, Key, Plus, Trash2, Edit, CheckCircle2, XCircle } from 'lucide-react'
import { decryptVaultPassword, deleteVaultItem } from './actions'
import { VaultModal } from './VaultModal'

type VaultItem = {
    id: string
    title: string
    username: string
    url: string | null
    notes: string | null
    category: string
    details?: any
}

export function VaultClient({ initialItems, userRole }: { initialItems: VaultItem[], userRole: string }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('Todas las categorías')
    const [isPending, startTransition] = useTransition()

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<VaultItem | null>(null)

    // Action state
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    // Toast State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }

    const categories = ['Todas las categorías', 'Computadoras', 'Memorias RAM', 'Telefonía', 'Servicios Externos', 'Licencias', 'RED']

    const filteredItems = initialItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.username.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = categoryFilter === 'Todas las categorías' || item.category === categoryFilter
        return matchesSearch && matchesCategory
    })

    const handleCopyPassword = async (id: string, customText?: string) => {
        if (customText) {
            await navigator.clipboard.writeText(customText)
            showToast('Copiado al portapapeles.')
            return;
        }
        try {
            const password = await decryptVaultPassword(id)
            await navigator.clipboard.writeText(password)
            showToast('Contraseña descifrada y copiada al portapapeles de forma segura.')
        } catch (error) {
            console.error(error)
            showToast('Error al descifrar la contraseña.', 'error')
        }
    }

    const handleCopyText = (text: string) => {
        navigator.clipboard.writeText(text)
        showToast('Copiado al portapapeles.')
    }

    const handleDelete = (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta credencial/activo? Esta acción no se puede deshacer.')) return
        startTransition(async () => {
            const res = await deleteVaultItem(id)
            if (res.error) showToast(res.error, 'error')
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

    const renderTableHeaders = () => {
        if (categoryFilter === 'Computadoras') return (
            <>
                <th className="px-6 py-4">Hostname</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Sistema Operativo</th>
                <th className="px-6 py-4">Serie / Modelo</th>
                <th className="px-6 py-4 text-right">Acciones</th>
            </>
        )
        if (categoryFilter === 'Memorias RAM') return (
            <>
                <th className="px-6 py-4">Identificador (DeviceLocator)</th>
                <th className="px-6 py-4">Capacidad</th>
                <th className="px-6 py-4">Fabricante</th>
                <th className="px-6 py-4">Serie</th>
                <th className="px-6 py-4 text-right">Acciones</th>
            </>
        )
        if (categoryFilter === 'Telefonía') return (
            <>
                <th className="px-6 py-4">Modelo</th>
                <th className="px-6 py-4">Usuario / Extensión</th>
                <th className="px-6 py-4">Correo</th>
                <th className="px-6 py-4 text-right">Acciones</th>
            </>
        )
        if (categoryFilter === 'Servicios Externos') return (
            <>
                <th className="px-6 py-4">Nombre Servicio</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Responsable</th>
                <th className="px-6 py-4 hidden lg:table-cell">Última Actualización</th>
                <th className="px-6 py-4 text-right">Acciones</th>
            </>
        )
        if (categoryFilter === 'Licencias') return (
            <>
                <th className="px-6 py-4">Servicio / Licencia</th>
                <th className="px-6 py-4">Correo Asociado</th>
                <th className="px-6 py-4 hidden md:table-cell">Código / Llave</th>
                <th className="px-6 py-4 text-right">Acciones</th>
            </>
        )
        if (categoryFilter === 'RED') return (
            <>
                <th className="px-6 py-4">Nombre / Equipo</th>
                <th className="px-6 py-4">SSID</th>
                <th className="px-6 py-4 hidden lg:table-cell">WAN / LAN</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4 text-right">Acciones</th>
            </>
        )

        // General (Todas las categorías)
        return (
            <>
                <th className="px-6 py-4">Título</th>
                <th className="px-6 py-4">Usuario / Correo</th>
                <th className="px-6 py-4 hidden sm:table-cell">Categoría</th>
                <th className="px-6 py-4 text-right">Acciones</th>
            </>
        )
    }

    const renderTableCells = (item: VaultItem) => {
        const details = item.details || {}

        const renderActionCell = (showSecondaryCopyButton?: boolean, secondaryCopyLabel?: string, secondaryCopyAction?: () => void) => (
            <td className="px-6 py-4 text-right relative">
                <div className="flex items-center justify-end gap-2">
                    {showSecondaryCopyButton && (
                        <button
                            onClick={secondaryCopyAction}
                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors group relative" title={secondaryCopyLabel}
                        >
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                {secondaryCopyLabel}
                            </span>
                            <Copy className="w-4 h-4" />
                        </button>
                    )}
                    {/* The main unlock password button */}
                    {categoryFilter !== 'Memorias RAM' && (
                        <button
                            onClick={() => handleCopyPassword(item.id)}
                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors group relative" title="Descifrar Contraseña Principal"
                        >
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                Contraseña
                            </span>
                            <Key className="w-4 h-4" />
                        </button>
                    )}
                    {userRole === 'SUPER_ADMIN' && (
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
                    )}
                </div>
            </td>
        )

        if (categoryFilter === 'Computadoras') return (
            <>
                <td className="px-6 py-4 font-medium text-slate-900">{item.title}</td>
                <td className="px-6 py-4 text-slate-600">{item.username || '-'}</td>
                <td className="px-6 py-4 text-slate-600">{details['Sistema Operativo'] || '-'}</td>
                <td className="px-6 py-4 text-slate-600 truncate max-w-[150px]" title={details['Serie']}>{details['Serie'] || details['Modelo'] || '-'}</td>
                {renderActionCell()}
            </>
        )
        if (categoryFilter === 'Memorias RAM') return (
            <>
                <td className="px-6 py-4 font-medium text-slate-900">{item.title}</td>
                <td className="px-6 py-4 text-slate-600">{details['Capacity'] || '-'}</td>
                <td className="px-6 py-4 text-slate-600">{details['Manufacturer'] || '-'}</td>
                <td className="px-6 py-4 text-slate-600">{details['SerialNumber'] || '-'}</td>
                {renderActionCell()}
            </>
        )
        if (categoryFilter === 'Telefonía') return (
            <>
                <td className="px-6 py-4 font-medium text-slate-900">{item.title}</td>
                <td className="px-6 py-4 text-slate-600">{item.username || '-'}</td>
                <td className="px-6 py-4 text-slate-600">{details['Correo'] || '-'}</td>
                {renderActionCell()}
            </>
        )
        if (categoryFilter === 'Servicios Externos') return (
            <>
                <td className="px-6 py-4 font-medium text-slate-900">{item.title}</td>
                <td className="px-6 py-4 text-slate-600">{item.username || '-'}</td>
                <td className="px-6 py-4 text-slate-600">{details['Responsable'] || '-'}</td>
                <td className="px-6 py-4 text-slate-600 hidden lg:table-cell">{details['Ultima Actualización'] || '-'}</td>
                {renderActionCell()}
            </>
        )
        if (categoryFilter === 'Licencias') return (
            <>
                <td className="px-6 py-4 font-medium text-slate-900">{item.title}</td>
                <td className="px-6 py-4 text-slate-600">{item.username || '-'}</td>
                <td className="px-6 py-4 text-slate-600 hidden md:table-cell font-mono text-xs">{details['Código de Activación'] || details['Llave de licencia'] || '-'}</td>
                {renderActionCell(!!details['Código de Activación'], "Copiar Código", () => handleCopyText(details['Código de Activación']))}
            </>
        )
        if (categoryFilter === 'RED') return (
            <>
                <td className="px-6 py-4 font-medium text-slate-900">{item.title}</td>
                <td className="px-6 py-4 text-slate-600">{details['SSID'] || '-'}</td>
                <td className="px-6 py-4 text-slate-600 hidden lg:table-cell text-xs">
                    <div>W: {details['WAN'] || '-'}</div>
                    <div>L: {details['LAN'] || '-'}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">{item.username || '-'}</td>
                {renderActionCell(!!details['Password Wifi'], "Copiar Pass WiFi", () => handleCopyText(details['Password Wifi']))}
            </>
        )

        // General
        return (
            <>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                            <Key className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-900">{item.title}</p>
                            {item.url && (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline flex items-center gap-1 mt-0.5" onClick={e => e.stopPropagation()}>
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
                        onClick={() => handleCopyText(item.username)}
                        className="flex items-center gap-2 cursor-pointer hover:text-slate-900 group" title="Copiar usuario"
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
                {renderActionCell()}
            </>
        )
    }

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-brand-600" />
                        Inventario y Credenciales IT
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Almacenamiento encriptado de credenciales y activos. Solo accesible por administradores.
                    </p>
                </div>
                {userRole === 'SUPER_ADMIN' && (
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 bg-[#0A192F] hover:bg-[#0d213f] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A192F]"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Registro
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
                {/* Tabs Navigation */}
                <div className="px-4 border-b border-slate-100 flex overflow-x-auto gap-6 scrollbar-hide">
                    {categories.map(c => (
                        <button
                            key={c}
                            onClick={() => setCategoryFilter(c)}
                            className={`whitespace-nowrap pb-3 pt-4 px-1 text-sm font-medium border-b-2 transition-colors ${categoryFilter === c
                                ? 'border-brand-600 text-brand-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:w-96">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar en la bóveda..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                            <tr>
                                {renderTableHeaders()}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No se encontraron registros en esta pestaña.
                                    </td>
                                </tr>
                            ) : filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    {renderTableCells(item)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                    <span>Mostrando {filteredItems.length} registros</span>
                    <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-green-500" />
                        <span>Cifrado de Base de Datos Activo</span>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <VaultModal
                    item={editingItem}
                    onClose={() => setIsModalOpen(false)}
                    forcedCategory={categoryFilter !== 'Todas las categorías' ? categoryFilter : undefined}
                />
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border border-slate-200 bg-white text-slate-800">
                        {toast.type === 'success' ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                <XCircle className="w-5 h-5 text-red-500" />
                            </div>
                        )}
                        <p className="text-sm font-medium">{toast.message}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
