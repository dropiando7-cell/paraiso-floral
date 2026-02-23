import { DollarSign, TrendingUp, Users, Activity, ArrowUpRight } from 'lucide-react';

const kpis = [
    {
        title: 'Saldo Consolidado',
        value: 'L 3,245,890',
        trend: '+15.2%',
        icon: DollarSign,
        iconColor: 'text-success',
        iconBg: 'bg-emerald-50',
        sensitive: true,
    },
    {
        title: 'Activos Totales',
        value: 'L 18,450,200',
        trend: '+8.4%',
        icon: TrendingUp,
        iconColor: 'text-brand-500',
        iconBg: 'bg-brand-50',
        sensitive: true,
    },
    {
        title: 'Miembros Activos',
        value: '12,458',
        trend: '+3.1%',
        icon: Users,
        iconColor: 'text-event-purple',
        iconBg: 'bg-event-purple/10',
        sensitive: true,
    },
    {
        title: 'Transacciones Hoy',
        value: '156',
        trend: '+22%',
        icon: Activity,
        iconColor: 'text-orange-500',
        iconBg: 'bg-orange-50',
        sensitive: true,
    }
];

export function KPIGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            {kpis.map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                    <div
                        key={idx}
                        className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.iconBg} transition-transform group-hover:scale-110`}>
                                <Icon className={`w-6 h-6 ${kpi.iconColor}`} />
                            </div>
                            <div className="flex items-center gap-1 text-success text-sm font-medium bg-emerald-50 px-2 py-1 rounded-md">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>{kpi.trend}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-slate-500 text-sm font-medium">{kpi.title}</span>
                            <span className="text-2xl font-bold text-slate-800 tracking-tight">{kpi.value}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
