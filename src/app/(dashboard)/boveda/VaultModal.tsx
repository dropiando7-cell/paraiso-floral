'use client'

import { useState, useTransition } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { createVaultItem, updateVaultItem } from './actions'

type VaultModalProps = {
    item: any | null
    onClose: () => void
}

export function VaultModal({ item, onClose }: VaultModalProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)

        const formData = new FormData(e.currentTarget)

        // Ensure passwords are not empty if creating
        if (!item && !formData.get('password')) {
            setError('La contraseña es obligatoria para una nueva credencial.')
            return
        }

        startTransition(async () => {
            const res = item
                ? await updateVaultItem(item.id, formData)
                : await createVaultItem(formData)

            if (res.error) {
                setError(res.error)
            } else {
                onClose()
            }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h2 className="font-semibold text-slate-800">
                        {item ? 'Editar Credencial' : 'Nueva Credencial'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1 space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
                        <input
                            name="title"
                            defaultValue={item?.title}
                            required
                            placeholder="Ej. Portal Banco Atlántida"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Usuario / Correo *</label>
                        <input
                            name="username"
                            defaultValue={item?.username}
                            required
                            placeholder="Ej. admin@elim.hn"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Contraseña {item ? '(Dejar en blanco para no cambiarla)' : '*'}
                        </label>
                        <input
                            name="password"
                            type="password"
                            required={!item}
                            placeholder={item ? "••••••••" : "Ingrese la contraseña"}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                            <select
                                name="category"
                                defaultValue={item?.category || 'General'}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            >
                                <option>Finanzas</option>
                                <option>Software</option>
                                <option>Infraestructura</option>
                                <option>General</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">URL (Opcional)</label>
                            <input
                                name="url"
                                defaultValue={item?.url || ''}
                                placeholder="https://..."
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notas Adicionales</label>
                        <textarea
                            name="notes"
                            defaultValue={item?.notes || ''}
                            rows={3}
                            placeholder="Información adicional..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {item ? 'Guardar Cambios' : 'Crear Credencial'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
