'use client'

import { useState } from 'react'
import { login } from './actions'
import { createClient } from '@/utils/supabase/client'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
    const [errorText, setErrorText] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

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

    async function handleGoogleLogin() {
        setLoading(true)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/`,
            },
        })
        if (error) {
            setErrorText(error.message)
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
                        Tu centro de mando para una gestión inteligente. Accede a todas tus herramientas administrativas y simplifica tu flujo de trabajo desde un solo lugar.
                    </p>
                </div>

                <div className="w-full">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition-all shadow-sm mb-6 disabled:opacity-80 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
                                <span>Conectando con Google...</span>
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
                                    <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.25033 6.60998L5.32028 9.77C6.27528 6.64 9.21028 4.75 12.0003 4.75Z" fill="#EA4335" />
                                    <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                                    <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.5399C0.46 8.1799 0 10.0099 0 11.9999C0 13.9899 0.46 15.8199 1.28 17.4599L5.26498 14.2949Z" fill="#FBBC05" />
                                    <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C9.21042 19.245 6.27541 17.355 5.32041 14.225L1.27539 17.39C3.25539 21.31 7.31042 24.0001 12.0004 24.0001Z" fill="#34A853" />
                                </svg>
                                <span>Continuar con Google Workspace</span>
                            </>
                        )}
                    </button>

                    <div className="relative flex items-center py-4">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">o también por</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

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
