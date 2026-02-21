'use client'

import { useState } from 'react'
import { Plus, Search, Shield, Copy, ExternalLink, MoreVertical, Key } from 'lucide-react'

export default function PasswordVaultPage() {
    const [passwords, setPasswords] = useState([
        { id: 1, title: 'Portal Banco Atlántida', username: 'admin@elimhonduras.org', url: 'https://bancatlan.hn', category: 'Finanzas' },
        { id: 2, title: 'Cuenta de Zoom Pro', username: 'soporte@elim.hn', url: 'https://zoom.us', category: 'Software' },
        { id: 3, title: 'Cloudflare DNS', username: 'isaac.paz@elim.hn', url: 'https://dash.cloudflare.com', category: 'Infraestructura' },
    ])

    return (
        <div className="space-y-6">
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
                <button className="flex items-center gap-2 bg-[#0A192F] hover:bg-[#0d213f] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A192F]">
                    <Plus className="w-4 h-4" />
                    Nueva Credencial
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:w-96">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar credencial..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-full sm:w-auto">
                            <option>Todas las categorías</option>
                            <option>Finanzas</option>
                            <option>Software</option>
                            <option>Infraestructura</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
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
                            {passwords.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                                                <Key className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{item.title}</p>
                                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline flex items-center gap-1 mt-0.5">
                                                    {new URL(item.url).hostname}
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <div className="flex items-center gap-2 cursor-pointer hover:text-slate-900" title="Copiar usuario">
                                            {item.username}
                                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden sm:table-cell">
                                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Copiar contraseña">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                    <span>Mostrando 3 de 3 credenciales</span>
                    <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-green-500" />
                        <span>Cifrado AES-256 Activo</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
