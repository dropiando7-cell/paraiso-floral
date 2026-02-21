'use client'

import { useState } from 'react';

export default function ProfilePage() {
    const [isUploading, setIsUploading] = useState(false);
    const [profilePic, setProfilePic] = useState("https://i.ibb.co/99640p19/foto-isaac.png");

    // Handles the native file picker
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB Limit
            alert('La imagen no debe pesar más de 2MB');
            return;
        }

        setIsUploading(true);

        try {
            // 1. Get Pre-Signed URL from our API
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type,
                }),
            });

            if (!response.ok) throw new Error('Error solicitando URL de subida');

            const { uploadUrl, publicUrl } = await response.json();

            // 2. Upload file directly to Cloudflare R2 (Bypassing our Next.js Server)
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type,
                },
                body: file,
            });

            if (!uploadResponse.ok) throw new Error('Error subiendo imagen a Cloudflare R2');

            // 3. Success! Set the new image in the UI
            setProfilePic(publicUrl);

            // NOTE: In a real app we'd ALSO save `publicUrl` into the Prisma "users" table here
            // await updateDbUserAvatar(publicUrl);

        } catch (error) {
            console.error("Error cambiando foto:", error);
            alert("Ocurrió un error al intentar subir la foto.");
        } finally {
            setIsUploading(false);
        }
    };
    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Perfil y Seguridad</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Administra tu información personal y las opciones de seguridad de tu cuenta.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column - Navigation */}
                <div className="md:col-span-1 space-y-1">
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl transition-colors">
                        Información General
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
                        Seguridad y Contraseña
                    </button>
                    <button className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
                        Notificaciones
                    </button>
                </div>

                {/* Right Column - Content */}
                <div className="md:col-span-2 space-y-6">

                    {/* Main Info Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-base font-semibold leading-6 text-slate-900">Foto de Perfil</h3>
                            <button className="text-sm font-medium text-brand-600 hover:text-brand-500">Actualizar</button>
                        </div>
                        <div className="px-6 py-5 flex items-center gap-6">
                            <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden relative shrink-0">
                                <img src={profilePic} alt="Profile" className="object-cover w-full h-full" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 max-w-xs">
                                    Recomendamos una imagen cuadrada de al menos 400x400px en formato JPG o PNG.
                                </p>
                                <div className="mt-3 flex gap-3 items-center">
                                    {/* Hidden File Input */}
                                    <input
                                        type="file"
                                        id="avatar-upload"
                                        accept="image/png, image/jpeg, image/webp"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        disabled={isUploading}
                                    />
                                    <label htmlFor="avatar-upload" className={`px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium ${isUploading ? 'text-slate-400 cursor-wait' : 'text-slate-700 hover:bg-slate-50 cursor-pointer'} shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20`}>
                                        {isUploading ? 'Subiendo a R2...' : 'Cambiar foto'}
                                    </label>
                                    <button className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-base font-semibold leading-6 text-slate-900">Detalles Personales</h3>
                            <button className="text-sm font-medium text-brand-600 hover:text-brand-500">Editar</button>
                        </div>
                        <div className="px-6 py-5">
                            <dl className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <dt className="text-sm font-medium text-slate-500">Nombre completo</dt>
                                    <dd className="text-sm text-slate-900 col-span-2">Isaac Paz</dd>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <dt className="text-sm font-medium text-slate-500">Correo Electrónico</dt>
                                    <dd className="text-sm text-slate-900 col-span-2">admin@elimhonduras.org</dd>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <dt className="text-sm font-medium text-slate-500">Número de Teléfono</dt>
                                    <dd className="text-sm text-slate-900 col-span-2">+504 9999-9999</dd>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <dt className="text-sm font-medium text-slate-500">Rol en el Sistema</dt>
                                    <dd className="col-span-2">
                                        <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-700/10">
                                            Administrador General
                                        </span>
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
