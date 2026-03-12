'use client'

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function PasswordChange() {
    const supabase = createClient();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage(null);
        setErrorMessage(null);

        // Basic Validation
        if (!newPassword || !confirmPassword) {
            setErrorMessage('Por favor, llena todos los campos.');
            return;
        }

        if (newPassword.length < 6) {
            setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMessage('Las contraseñas nuevas no coinciden.');
            return;
        }

        setIsSaving(true);

        try {
            // Since we are not requiring the old password directly to update (Supabase handles valid sessions),
            // we proceed directly to update the user's password.
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                console.error("Error updating password:", error);
                setErrorMessage(error.message || 'Error al cambiar la contraseña. Intenta de nuevo.');
            } else {
                setSuccessMessage('¡Contraseña actualizada con éxito!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');

                // Clear success message after a few seconds
                setTimeout(() => setSuccessMessage(null), 5000);
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Error inesperado al conectar con el servidor.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-semibold leading-6 text-slate-900">Cambiar Contraseña</h3>
            </div>

            <div className="p-6">
                <p className="text-sm text-slate-600 mb-6 max-w-2xl leading-relaxed">
                    Asegúrate de que tu nueva contraseña tenga al menos 6 caracteres. Te recomendamos usar una combinación
                    de letras, números y símbolos para mayor seguridad.
                </p>

                {successMessage && (
                    <div className="mb-6 bg-emerald-50 text-emerald-700 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{successMessage}</p>
                    </div>
                )}

                {errorMessage && (
                    <div className="mb-6 bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{errorMessage}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="max-w-md space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Nueva contraseña
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white outline-none transition-all text-sm"
                            placeholder="Mínimo 6 caracteres"
                            disabled={isSaving}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Confirmar nueva contraseña
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white outline-none transition-all text-sm"
                            placeholder="Ingresa la contraseña nuevamente"
                            disabled={isSaving}
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSaving || !newPassword || !confirmPassword}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Actualizando...</span>
                                </>
                            ) : (
                                <span>Actualizar Contraseña</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
