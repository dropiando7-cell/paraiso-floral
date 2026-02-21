import Link from 'next/link'

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-[#050B14] flex flex-col justify-center items-center p-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>

            <h1 className="text-4xl font-bold text-white mb-4 text-center">Acceso Denegado</h1>
            <p className="text-gray-400 text-lg text-center max-w-md mb-8">
                Tu cuenta de Google ha sido autenticada, pero no tienes permisos registrados en la base de datos de Sistemas Elim.
            </p>

            <div className="bg-[#0A192F] p-6 rounded-2xl border border-gray-800 max-w-md w-full mb-8">
                <p className="text-sm text-gray-300 text-center">
                    Si crees que esto es un error, por favor contacta a la Administración Central para que registren tu correo electrónico.
                </p>
            </div>

            <Link
                href="/login"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
                Volver al inicio de sesión
            </Link>
        </div>
    )
}
