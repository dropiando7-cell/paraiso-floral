'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ShieldAlert } from 'lucide-react'

export default function SecurityVerificationPage() {
    const supabase = createClient()
    const router = useRouter()
    const [code, setCode] = useState(['', '', '', '', '', ''])
    const [method, setMethod] = useState<'totp' | 'whatsapp'>('totp')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [factorId, setFactorId] = useState<string | null>(null)

    // Check if user actually needs to be here and load their Factor ID
    useEffect(() => {
        checkMfaRequirement()
    }, [])

    const checkMfaRequirement = async () => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
            router.push('/login')
            return
        }

        // If they are already AAL2 (fully authenticated), send them to dashboard
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.currentLevel === 'aal2') {
            router.push('/')
            return
        }

        // If AAL1, check which factors they have enrolled
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()
        if (factorsError) {
            console.error(factorsError)
            return
        }

        const totpFactor = factorsData.all?.find((f: any) => f.factor_type === 'totp' && f.status === 'verified')
        if (totpFactor) {
            setFactorId(totpFactor.id)
        } else {
            // If we reach here and they don't have a verified TOTP factor, they shouldn't be on this screen
            router.push('/')
        }
    }

    const handleInput = (index: number, value: string) => {
        if (!/^[0-9]*$/.test(value)) return

        const newCode = [...code]
        newCode[index] = value
        setCode(newCode)
        setError(null)

        if (value && index < 5) {
            const nextInput = document.getElementById(`mfa-input-${index + 1}`)
            nextInput?.focus()
        }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            const prevInput = document.getElementById(`mfa-input-${index - 1}`)
            prevInput?.focus()
        }
    }

    const handleVerify = async () => {
        if (!factorId) {
            setError("No se encontró configuración de autenticador para esta cuenta.")
            return;
        }

        const fullCode = code.join('')
        if (fullCode.length < 6) return

        setLoading(true)
        setError(null)

        try {
            // 1. Create Challenge
            const challenge = await supabase.auth.mfa.challenge({ factorId })
            if (challenge.error) throw challenge.error

            // 2. Verify Code
            const verify = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.data.id,
                code: fullCode
            })

            if (verify.error) throw verify.error

            // Success! Upgrade completed.
            router.push('/')
            router.refresh()

        } catch (err: any) {
            console.error("MFA Verify Error:", err)
            setError("El código es incorrecto o ha expirado. Inténtalo de nuevo.")
            // Clear inputs on error
            setCode(['', '', '', '', '', ''])
            document.getElementById('mfa-input-0')?.focus()
        } finally {
            setLoading(false)
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 shadow-sm border-4 border-white">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                </div>
                <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                    Verificación de Seguridad
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Tu cuenta está protegida. Ingresa el código generado por tu aplicación para continuar.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-[16px] sm:px-10 border border-gray-100">

                    <p className="text-center text-sm font-medium text-slate-700 mb-6">
                        Abre Google Authenticator o Authy y escribe el código temporal de 6 dígitos.
                    </p>

                    <div className="flex justify-center gap-2 sm:gap-4 mb-3">
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                id={`mfa-input-${index}`}
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleInput(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                disabled={loading}
                                className="w-10 h-10 sm:w-12 sm:h-14 text-center text-xl font-bold text-[#0A192F] bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#0A192F]/20 focus:border-[#0A192F] transition-all disabled:opacity-50"
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center border border-red-100">
                            {error}
                        </div>
                    )}
                    <div className="mb-6"></div>

                    <div>
                        <button
                            onClick={handleVerify}
                            disabled={loading || code.some(c => c === '')}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-[12px] shadow-sm text-sm font-medium text-white bg-[#0A192F] hover:bg-[#0d213f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A192F] disabled:opacity-70 transition-all gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 flex items-center justify-center">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                'Verificar Identidad'
                            )}
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <button
                            onClick={handleSignOut}
                            className="font-medium text-slate-500 hover:text-slate-700 text-sm transition-colors underline">
                            Cancelar y cerrar sesión
                        </button>
                    </div>

                </div>
            </div>
        </div>
    )
}
