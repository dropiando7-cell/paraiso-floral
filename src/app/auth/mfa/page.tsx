'use client'

import { useState } from 'react'

export default function SecurityVerificationPage() {
    const [code, setCode] = useState(['', '', '', '', '', ''])
    const [method, setMethod] = useState<'totp' | 'whatsapp'>('totp')
    const [loading, setLoading] = useState(false)

    const handleInput = (index: number, value: string) => {
        if (!/^[0-9]*$/.test(value)) return

        const newCode = [...code]
        newCode[index] = value
        setCode(newCode)

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
        setLoading(true)
        // Server action missing - dummy verification wait
        const fullCode = code.join('')
        console.log(`Verificando código via ${method}: ${fullCode}`)
        await new Promise(r => setTimeout(r, 1000))
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 rounded-[12px] bg-[#0A192F] flex items-center justify-center font-bold text-white shadow-lg text-xl">
                        El
                    </div>
                </div>
                <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                    Verificación de Seguridad
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Esta zona requiere autenticación en dos pasos
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-[16px] sm:px-10 border border-gray-100">

                    <div className="flex justify-center mb-6 space-x-2 bg-gray-100 p-1 rounded-[12px]">
                        <button
                            onClick={() => setMethod('totp')}
                            className={`flex-1 py-2 text-sm font-medium rounded-[10px] transition-all ${method === 'totp' ? 'bg-white shadow text-[#0A192F]' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Authenticator
                        </button>
                        <button
                            onClick={() => setMethod('whatsapp')}
                            className={`flex-1 py-2 text-sm font-medium rounded-[10px] transition-all ${method === 'whatsapp' ? 'bg-white shadow text-[#0A192F]' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            WhatsApp
                        </button>
                    </div>

                    <p className="text-center text-sm text-gray-500 mb-6">
                        {method === 'totp' ? 'Abre Google Authenticator o Authy y escribe el código de 6 dígitos.' : 'Hemovos enviado un mensaje a tu número registrado en WhatsApp. Ingresa el código.'}
                    </p>

                    <div className="flex justify-center gap-2 sm:gap-4 mb-8">
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                id={`mfa-input-${index}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleInput(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="w-10 h-10 sm:w-12 sm:h-14 text-center text-xl font-bold text-[#0A192F] bg-gray-50 border border-gray-200 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#0A192F]/20 focus:border-[#0A192F] transition-all"
                            />
                        ))}
                    </div>

                    <div>
                        <button
                            onClick={handleVerify}
                            disabled={loading || code.some(c => c === '')}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-[12px] shadow-sm text-sm font-medium text-white bg-[#0A192F] hover:bg-[#0d213f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A192F] disabled:opacity-70 transition-all"
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
                        <a href="#" className="font-medium text-[#0A192F] hover:text-blue-800 text-sm transition-colors">
                            ¿No tienes acceso a este método?
                        </a>
                    </div>

                </div>
            </div>
        </div>
    )
}
