'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Shield, ShieldAlert, CheckCircle2, QrCode } from 'lucide-react'

export function MfaSettings() {
    const supabase = createClient()
    const [mfaStatus, setMfaStatus] = useState<'loading' | 'enabled' | 'disabled'>('loading')
    const [qrCodeHtml, setQrCodeHtml] = useState<string | null>(null)
    const [totpSecret, setTotpSecret] = useState<string | null>(null)
    const [factorId, setFactorId] = useState<string | null>(null)
    const [verifyCode, setVerifyCode] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isEnrolling, setIsEnrolling] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [userRole, setUserRole] = useState<string | null>(null)

    useEffect(() => {
        checkMfaStatus()
    }, [])

    const checkMfaStatus = async () => {
        try {
            // Check MFA status
            const { data, error } = await supabase.auth.mfa.listFactors()
            if (error) throw error
            const totpFactor = data.all?.find((f: any) => f.factor_type === 'totp' && f.status === 'verified')
            if (totpFactor) {
                setMfaStatus('enabled')
            } else {
                setMfaStatus('disabled')
            }

            // Fetch user role
            try {
                const response = await fetch('/api/user/role')
                if (response.ok) {
                    const roleData = await response.json()
                    setUserRole(roleData.role)
                }
            } catch (roleErr) {
                console.error("Failed to fetch user role:", roleErr)
            }

        } catch (err: any) {
            console.error("Error checking MFA:", err)
            setError(err.message)
            setMfaStatus('disabled')
        }
    }

    const startEnrollment = async () => {
        setIsEnrolling(true)
        setError(null)
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser()
            if (userError) throw userError

            const userEmail = userData?.user?.email || 'Usuario Elim'

            // Clean up any existing unverified factors to prevent "friendly name already exists" error
            const { data: existingFactors } = await supabase.auth.mfa.listFactors()
            if (existingFactors && existingFactors.all) {
                for (const factor of existingFactors.all) {
                    if (factor.factor_type === 'totp' && factor.status === 'unverified') {
                        await supabase.auth.mfa.unenroll({ factorId: factor.id })
                    }
                }
            }

            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                issuer: 'Sistemas Elim',
                friendlyName: userEmail
            })
            if (error) throw error
            setFactorId(data.id)
            setQrCodeHtml(data.totp.qr_code)
            setTotpSecret(data.totp.secret)
        } catch (err: any) {
            console.error("Enrollment error:", err)
            setError(err.message)
        } finally {
            setIsEnrolling(false)
        }
    }

    const verifyEnrollment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!factorId || !verifyCode) return

        setIsVerifying(true)
        setError(null)
        try {
            const challenge = await supabase.auth.mfa.challenge({ factorId })
            if (challenge.error) throw challenge.error

            const verify = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.data.id,
                code: verifyCode
            })
            if (verify.error) throw verify.error

            // Success! The factor is now verified.
            setMfaStatus('enabled')
            setQrCodeHtml(null)
            setTotpSecret(null)
            setVerifyCode('')

            // Note: In a complete flow we might also want to update prisma.user.twoFactorEnabled = true
            // by calling a server action here so the rest of the app knows.

        } catch (err: any) {
            console.error("Verify error:", err)
            setError("Código incorrecto, por favor intenta de nuevo.")
        } finally {
            setIsVerifying(false)
        }
    }

    const disableMfa = async () => {
        // En un caso real hay que permitir desactivarlo
        if (!confirm('¿Estás seguro de desactivar la Autenticación de Dos Pasos?')) return;

        setError(null)
        try {
            const { data, error } = await supabase.auth.mfa.listFactors()
            if (error) throw error
            const totpFactor = data.all?.find((f: any) => f.factor_type === 'totp')
            if (totpFactor) {
                const unenrollResult = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id })
                if (unenrollResult.error) throw unenrollResult.error
                setMfaStatus('disabled')
            }
        } catch (err: any) {
            console.error("Unenroll error:", err)
            setError(err.message)
        }
    }

    if (mfaStatus === 'loading') {
        return <div className="p-6 text-sm text-slate-500">Cargando estado de seguridad...</div>
    }

    // Si ya tiene MFA habilitado
    if (mfaStatus === 'enabled') {
        const canDisable = userRole === 'SUPERADMIN'

        return (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-emerald-900">Autenticación de Dos Pasos (MFA) Activada</h3>
                    <p className="text-sm text-emerald-700 mt-1 max-w-lg mb-4">
                        Tu cuenta está protegida. Cada vez que inicies sesión se te pedirá un código generado por tu aplicación de Google Authenticator.
                    </p>

                    {canDisable ? (
                        <button
                            onClick={disableMfa}
                            className="px-4 py-2 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors">
                            Desactivar MFA
                        </button>
                    ) : (
                        <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 max-w-lg mt-2">
                            <p className="text-xs text-rose-800 font-medium">
                                No puedes desactivar esta función por tu cuenta. Necesitas la autorización de un Administrador General.
                            </p>
                            <p className="text-xs text-rose-600 mt-1">
                                Por favor, ponte en contacto con administración.
                            </p>
                            <button
                                disabled
                                className="mt-3 px-4 py-2 bg-white text-slate-400 border border-slate-200 text-xs font-semibold rounded-lg opacity-60 cursor-not-allowed">
                                Desactivar MFA (Bloqueado)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Si está en proceso de configuración mostrando el QR
    if (qrCodeHtml) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                    <h3 className="text-base font-semibold leading-6 text-slate-900 flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-brand-600" />
                        Configurar Authenticator
                    </h3>
                </div>
                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1 space-y-4">
                            <h4 className="font-medium text-slate-800">Sigue estos pasos:</h4>
                            <ol className="list-decimal list-inside space-y-3 text-sm text-slate-600">
                                <li>Descarga <strong>Google Authenticator</strong> o <strong>Authy</strong> en tu celular.</li>
                                <li>Abre la aplicación y selecciona la opción de escanear un código QR.</li>
                                <li>Escanea el código que aparece a la derecha.</li>
                                <li>Ingresa el código de 6 dígitos que te da la aplicación para verificar.</li>
                            </ol>

                            <form onSubmit={verifyEnrollment} className="mt-6">
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                    Código de Verificación
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="123456"
                                        maxLength={6}
                                        value={verifyCode}
                                        onChange={e => setVerifyCode(e.target.value)}
                                        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono tracking-widest text-lg w-40 text-center"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={isVerifying || verifyCode.length < 6}
                                        className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {isVerifying ? 'Verificando...' : 'Confirmar'}
                                    </button>
                                </div>
                                {error && <p className="text-sm text-red-500 mt-2 font-medium">{error}</p>}
                            </form>

                            <button
                                onClick={() => { setQrCodeHtml(null); setTotpSecret(null); setError(null); }}
                                className="mt-4 text-sm text-slate-500 hover:text-slate-700 font-medium underline">
                                Cancelar configuración
                            </button>
                        </div>
                        <div className="w-full md:w-auto shrink-0 flex flex-col items-center bg-slate-50 p-6 rounded-xl border border-slate-200">
                            {/* Rendering the SVG Data URI */}
                            <img src={qrCodeHtml} alt="QR Code" className="w-48 h-48 bg-white object-contain p-2 rounded-lg border border-slate-100 shadow-sm" />

                            {totpSecret && (
                                <div className="mt-6 text-center w-full max-w-[200px]">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">O ingresa esta clave manual:</p>
                                    <code className="text-[11px] bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-700 font-mono select-all break-all block shadow-sm">
                                        {totpSecret}
                                    </code>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Pantalla inicial para dar de alta
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-semibold leading-6 text-slate-900">Añadir Capa de Seguridad (MFA)</h3>
            </div>
            <div className="p-6">
                <p className="text-sm text-slate-600 mb-6 max-w-2xl leading-relaxed">
                    Añade una capa extra de seguridad a tu cuenta. Al activar la autenticación de dos pasos (MFA),
                    se te pedirá un código temporal desde tu teléfono celular además de tu contraseña para iniciar sesión.
                    Esto protege tu información incluso si alguien descubre tu contraseña.
                </p>
                {error && <p className="mb-4 text-sm text-red-500 font-medium bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}

                <button
                    onClick={startEnrollment}
                    disabled={isEnrolling}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0A192F] hover:bg-[#0d213f] text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-70"
                >
                    <Shield className="w-4 h-4" />
                    {isEnrolling ? 'Iniciando proceso...' : 'Configurar Autenticador'}
                </button>
            </div>
        </div>
    )
}
