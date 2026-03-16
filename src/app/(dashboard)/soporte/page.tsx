import { Wrench, Phone, Mail, HelpCircle, ArrowLeft, BookOpen, Video } from 'lucide-react';
import Link from 'next/link';

export default function SoportePage() {
    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
            {/* Header / Hero Section */}
            <div className="bg-white rounded-2xl p-8 md:p-12 border border-slate-200 shadow-sm text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-50 rounded-full blur-3xl -ml-10 -mb-10 opacity-60"></div>

                <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-2">
                        <Wrench className="w-8 h-8 text-brand-600" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                        Centro de Ayuda y Tutoriales
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                        Estamos construyendo una base de conocimientos completa con videos tutoriales y guías paso a paso para ayudarte a dominar cada módulo de la plataforma.
                    </p>
                    <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-medium border border-amber-200 mt-4">
                        <Wrench className="w-4 h-4" />
                        Sección en Construcción
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contactos de Emergencia */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-brand-500" />
                        ¿Necesitas ayuda urgente?
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Si tienes problemas para acceder a un módulo o necesitas soporte inmediato, por favor contáctanos por estos medios:
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Mail className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-slate-900">Soporte Técnico</h3>
                                <p className="text-sm text-slate-500">Para reportar errores del sistema</p>
                                <a href="mailto:soporte@bioelectronicahn.com" className="text-sm font-medium text-brand-600 hover:text-brand-700 mt-1 inline-block">
                                    soporte@bioelectronicahn.com
                                </a>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Phone className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-slate-900">Administración General</h3>
                                <p className="text-sm text-slate-500">Para temas de acceso o permisos</p>
                                <span className="text-sm font-medium text-slate-700 mt-1 inline-block">
                                    Contacta a tu supervisor directo
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lo que viene pronto */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-slate-50 to-transparent"></div>

                    <h2 className="text-xl font-semibold text-slate-900 mb-4">
                        Próximamente en esta sección
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Estamos preparando material exclusivo para facilitar tu trabajo diario en la empresa.
                    </p>

                    <ul className="space-y-4 relative z-10">
                        <li className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <Video className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">Videotutoriales interactivos de cada módulo</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">Base de conocimientos y manuales de usuario</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                                <HelpCircle className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">Preguntas Frecuentes (FAQ) resueltas</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Back Button */}
            <div className="flex justify-center mt-8">
                <Link href="/">
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium shadow-sm">
                        <ArrowLeft className="w-4 h-4" />
                        Volver a Inicio
                    </button>
                </Link>
            </div>
        </div>
    );
}
