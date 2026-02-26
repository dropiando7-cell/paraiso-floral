import { Search, Bell, Menu } from 'lucide-react';
import { UserDropdown } from './UserDropdown';

interface HeaderProps {
    dbUser: any;
    onMenuClick?: () => void;
}

export function Header({ dbUser, onMenuClick }: HeaderProps) {
    return (
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-30 w-full gap-3 print:hidden">

            {/* Hamburger — mobile only */}
            <button
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                aria-label="Abrir menú"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Search Bar */}
            <div className="hidden sm:flex flex-1 max-w-2xl">
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

            {/* Mobile: show app name when search is hidden */}
            <div className="sm:hidden flex-1 font-semibold text-slate-700 text-sm">SistemasElim</div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 md:gap-6 ml-auto">

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

                <UserDropdown dbUser={dbUser} />

            </div>
        </header>
    );
}
