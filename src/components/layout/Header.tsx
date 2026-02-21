import Image from 'next/image';
import { Search, Bell } from 'lucide-react';

export function Header() {
    return (
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-10 w-full">

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
                <div className="relative flex items-center w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4" />
                    <input
                        type="text"
                        placeholder="Buscar en toda la plataforma..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-12 py-2.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                    />
                    <div className="absolute right-4 flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-medium text-slate-400">⌘K</kbd>
                    </div>
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-6 ml-6">

                {/* System Status Badge */}
                <div className="hidden md:flex items-center gap-2 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-100">
                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                    <span className="text-xs font-medium text-brand-700">Sistema Operativo</span>
                </div>

                {/* Notifications */}
                <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
                </button>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                    <div className="flex flex-col items-end hidden md:flex">
                        <span className="text-sm font-semibold text-slate-700 leading-tight">Isaac Paz</span>
                        <span className="text-xs text-slate-400">Administrador General</span>
                    </div>
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 shrink-0 relative">
                        <Image
                            src="https://i.ibb.co/99640p19/foto-isaac.png"
                            alt="Isaac Paz"
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>

            </div>
        </header>
    );
}
