'use client'

import { useState } from 'react'
import { login } from './actions'

export default function LoginPage() {
    const [errorText, setErrorText] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setErrorText(null)
        const formData = new FormData(e.currentTarget)

        // server action
        const res = await login(formData)
        if (res?.error) {
            setErrorText(res.error)
            setLoading(false)
        }
    }

    return (
        <div className="flex bg-[#081c15] min-h-screen items-center justify-center p-4 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600 rounded-full opacity-10 blur-[100px]"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-500 rounded-full opacity-10 blur-[100px]"></div>

            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 sm:p-12 relative z-10">
                <div className="flex flex-col items-center justify-center text-center mb-8">
                    <div className="h-20 flex items-center justify-center overflow-hidden mb-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src="/logo-paraiso-floral.png" 
                            alt="Distribuidora Paraíso Floral" 
                            className="h-16 object-contain" 
                        />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900 mb-1.5">
                        Distribuidora Paraíso Floral
                    </h1>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                        Sistema integral para gestión de inventarios, facturación, ventas y catálogo de flores.
                    </p>
                </div>

                <div className="w-full">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
                                Correo Electrónico
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="master@superapp.com"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="password">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors text-sm"
                            />
                        </div>

                        {errorText && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                                {errorText}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1b4332] hover:bg-[#2d6a4f] text-white py-3 px-4 rounded-xl font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 mt-2 disabled:opacity-70 flex justify-center items-center shadow-md shadow-emerald-900/20"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </form>
                </div>
                
                <div className="mt-8 text-center text-xs text-gray-400">
                    &copy; {new Date().getFullYear()} Distribuidora Paraíso Floral. Todos los derechos reservados.
                </div>
            </div>
        </div>
    )
}
