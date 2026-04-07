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
        <div className="flex bg-[#050B14] min-h-screen items-center justify-center p-4 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-600 rounded-full opacity-10 blur-[100px]"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500 rounded-full opacity-10 blur-[100px]"></div>

            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 sm:p-12 relative z-10">
                <div className="flex flex-col items-center justify-center text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center font-bold text-white shadow-lg text-2xl mb-4">
                        BE
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
                        BioelectrónicaHN
                    </h1>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        Centro de control para gestionar equipos, servicios y operaciones de bioelectrónica desde un solo lugar.
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
                                placeholder="usuario@bioelectronicahn.com"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
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
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
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
                            className="w-full bg-brand-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 mt-2 disabled:opacity-70 flex justify-center items-center shadow-md shadow-brand-500/20"
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
                    &copy; {new Date().getFullYear()} Bioelectrónica Honduras. Todos los derechos reservados.
                </div>
            </div>
        </div>
    )
}
