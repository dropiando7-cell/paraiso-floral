'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { createVaultItem, updateVaultItem } from './actions'

type VaultModalProps = {
    item: any | null
    onClose: () => void
    forcedCategory?: string
}

export function VaultModal({ item, onClose, forcedCategory }: VaultModalProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<string>(
        item?.category || forcedCategory || 'General'
    )

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)

        const formData = new FormData(e.currentTarget)

        // Ensure passwords are not empty if creating, except for RAM
        if (!item && !formData.get('password') && selectedCategory !== 'Memorias RAM') {
            setError('La contraseña es obligatoria para una nueva credencial/activo.')
            return
        }

        // Extract dynamic fields to a details JSON object
        const baseFields = ['title', 'username', 'password', 'url', 'category', 'notes']
        const details: Record<string, any> = {}

        formData.forEach((value, key) => {
            if (!baseFields.includes(key) && value) {
                details[key] = value
            }
        })

        formData.set('details', JSON.stringify(details))

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

    const details = item?.details || {}

    const renderDynamicFields = () => {
        if (selectedCategory === 'Computadoras') return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sistema Operativo</label>
                        <input name="Sistema Operativo" defaultValue={details['Sistema Operativo']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ID del Producto</label>
                        <input name="ID del Producto" defaultValue={details['ID del Producto']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Marca</label>
                        <input name="Marca" defaultValue={details['Marca']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                        <input name="Modelo" defaultValue={details['Modelo']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Serie</label>
                        <input name="Serie" defaultValue={details['Serie']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Renovación AV</label>
                        <input type="date" name="Renovacion AV" defaultValue={details['Renovacion AV']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                </div>
            </>
        )
        if (selectedCategory === 'Memorias RAM') return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">DeviceLocator</label>
                        <input name="DeviceLocator" defaultValue={details['DeviceLocator']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Capacity</label>
                        <input name="Capacity" defaultValue={details['Capacity']} placeholder="Ej. 8GB" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer</label>
                        <input name="Manufacturer" defaultValue={details['Manufacturer']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">SerialNumber</label>
                        <input name="SerialNumber" defaultValue={details['SerialNumber']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                </div>
            </>
        )
        if (selectedCategory === 'Telefonía') return (
            <>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Correo de Configuración</label>
                    <input name="Correo" type="email" defaultValue={details['Correo']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                </div>
            </>
        )
        if (selectedCategory === 'Servicios Externos') return (
            <>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
                        <input name="Responsable" defaultValue={details['Responsable']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cuentas de Recuperación</label>
                        <input name="Cuentas de Recuperacion" defaultValue={details['Cuentas de Recuperacion']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Última Actualización</label>
                        <input type="date" name="Ultima Actualización" defaultValue={details['Ultima Actualización']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                </div>
            </>
        )
        if (selectedCategory === 'Licencias') return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Código de Activación</label>
                        <input name="Código de Activación" defaultValue={details['Código de Activación']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Llave de Licencia</label>
                        <input name="Llave de licencia" defaultValue={details['Llave de licencia']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Compra</label>
                        <input type="date" name="Fecha compra" defaultValue={details['Fecha compra']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Dispositivos conectados</label>
                        <input name="Dispositivos conectados" defaultValue={details['Dispositivos conectados']} placeholder="Ej. 1/5" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                </div>
            </>
        )
        if (selectedCategory === 'RED') return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">SSID</label>
                        <input name="SSID" defaultValue={details['SSID']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password Wifi</label>
                        <input name="Password Wifi" defaultValue={details['Password Wifi']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Marca / Modelo</label>
                        <input name="Modelo" defaultValue={details['Modelo']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">IP WAN</label>
                        <input name="WAN" defaultValue={details['WAN']} placeholder="192.168... / Externa" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">IP LAN</label>
                        <input name="LAN" defaultValue={details['LAN']} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                    </div>
                </div>
            </>
        )
        return null
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-[600px] overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h2 className="font-semibold text-slate-800">
                        {item ? 'Editar Información' : 'Nuevo Registro'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                            <select
                                name="category"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-brand-700 font-medium"
                            >
                                <option>Computadoras</option>
                                <option>Memorias RAM</option>
                                <option>Telefonía</option>
                                <option>Servicios Externos</option>
                                <option>Licencias</option>
                                <option>RED</option>
                                <option>General</option>
                            </select>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Título / Nombre Principal *</label>
                            <input
                                name="title"
                                defaultValue={item?.title}
                                required
                                placeholder="Ej. Equipo XYZ / Licencia Office"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Usuario / Correo General {selectedCategory !== 'Memorias RAM' && '*'}
                            </label>
                            <input
                                name="username"
                                defaultValue={item?.username}
                                required={selectedCategory !== 'Memorias RAM'}
                                placeholder="admin@ / user"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            />
                        </div>

                        {selectedCategory !== 'Memorias RAM' && (
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Contraseña {item ? '(En blanco = no cambiar)' : '*'}
                                </label>
                                <input
                                    name="password"
                                    type="password"
                                    required={!item}
                                    placeholder={item ? "••••••••" : "Ingrese la contraseña"}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                />
                            </div>
                        )}
                    </div>

                    {/* DYNAMIC FIELDS BOUNDARY */}
                    {selectedCategory !== 'General' && (
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Campos Específicos de {selectedCategory}</h3>
                            {renderDynamicFields()}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">URL (Opcional)</label>
                            <input
                                name="url"
                                defaultValue={item?.url || ''}
                                placeholder="https://..."
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Notas / Observaciones</label>
                            <textarea
                                name="notes"
                                defaultValue={item?.notes || ''}
                                rows={2}
                                placeholder="Información adicional..."
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                            />
                        </div>
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
                            {item ? 'Guardar Cambios' : 'Crear Registro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
