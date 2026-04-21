import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  History, 
  BarChart, 
  CalendarDays, 
  Settings,
  Bell,
  MessageSquare,
  Search,
  Plus,
  Download,
  CreditCard,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

// --- Types ---

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  progress?: number;
  limit?: string;
}

interface BillingRow {
  date: string;
  description: string;
  amount: string;
  status: 'Paid' | 'Failed';
}

// --- Components ---

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active }) => (
  <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
    active 
    ? 'bg-white text-slate-900 shadow-sm' 
    : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'
  }`}>
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, progress, limit }) => (
  <div className="bg-white/60 backdrop-blur-md border border-white/40 p-6 rounded-[2.5rem] shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-slate-500 font-medium">{title}</h3>
      {progress !== undefined && (
        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
          {Math.round(progress)}%
        </span>
      )}
    </div>
    <div className="mb-4">
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      {subtitle && <div className="text-sm text-slate-500 mt-1">{subtitle}</div>}
    </div>
    {progress !== undefined && (
      <div className="space-y-2">
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span>{value.split(' ')[0]} Used</span>
          <span>{limit} Limit</span>
        </div>
      </div>
    )}
  </div>
);

const Sidebar = () => (
  <aside className="w-64 h-screen border-r border-slate-200 bg-slate-50/50 flex flex-col p-6 fixed left-0 top-0 overflow-y-auto">
    <div className="flex items-center gap-2 mb-10 px-2">
      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">H</div>
      <span className="text-xl font-bold text-slate-900">HerreraAndonie</span>
    </div>

    <div className="space-y-8 flex-1">
      <div>
        <h4 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Main Features</h4>
        <div className="space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" />
          <NavItem icon={BarChart} label="Analytics" />
          <NavItem icon={History} label="Activity Log" />
        </div>
      </div>

      <div>
        <h4 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Legal Dept</h4>
        <div className="space-y-1">
          <NavItem icon={History} label="Escrituración" />
          <NavItem icon={Receipt} label="Cobros" active />
          <NavItem icon={CalendarDays} label="Calendar" />
        </div>
      </div>
    </div>

    <div className="pt-6 border-t border-slate-200">
      <div className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Amanda" alt="User" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900">Amanda Rachel</div>
          <div className="text-xs text-slate-500">Managing Partner</div>
        </div>
      </div>
    </div>
  </aside>
);

const BillingDashboard = () => {
  const billingHistory: BillingRow[] = [
    { date: 'Aug 03, 2025', description: 'Pro Plan - Monthly', amount: '$29.00', status: 'Paid' },
    { date: 'Aug 01, 2025', description: 'Pro Plan - Monthly', amount: '$29.00', status: 'Failed' },
    { date: 'Jul 01, 2025', description: 'Pro Plan - Monthly', amount: '$29.00', status: 'Paid' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-['Plus_Jakarta_Sans']">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-peach-200 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-indigo-100 blur-[100px] rounded-full -translate-y-1/2" />
        <div className="absolute top-[10%] right-[10%] w-[300px] h-[300px] bg-cyan-100 blur-[80px] rounded-full" />
      </div>

      <Sidebar />

      <main className="pl-64 min-h-screen relative">
        <header className="h-20 flex items-center justify-between px-10 border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search cases, invoices, or clients..." 
              className="w-full bg-slate-100/50 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <MessageSquare size={20} />
            </button>
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <button className="flex items-center gap-2 px-1 py-1 rounded-full hover:bg-slate-100 transition-colors">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">AR</div>
            </button>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto space-y-10">
          <section>
            <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-2">Billing & Collections</h1>
                <p className="text-slate-500">Manage your subscription, view payment history, and update billing details.</p>
              </div>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                <Plus size={20} />
                New Invoice
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/60 backdrop-blur-md border border-white/40 p-6 rounded-[2.5rem] shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-slate-500 font-medium mb-1">Current Plan</h3>
                  <div className="text-3xl font-bold mb-4">Pro Plan</div>
                  <div className="text-xl font-bold text-slate-900">$29<span className="text-sm font-medium text-slate-400">/Month</span></div>
                </div>
                <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all">
                  Upgrade
                </button>
              </div>
              <StatCard 
                title="Usage Summary" 
                value="8,500 / 10,000" 
                subtitle="API Requests Used"
                progress={85}
                limit="10,000"
              />
            </div>
          </section>

          <section className="bg-white/60 backdrop-blur-md border border-white/40 rounded-[2.5rem] shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">Billing History</h2>
              <button className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors border border-slate-200 px-4 py-2 rounded-xl">
                Filter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="px-8 py-4">Date</th>
                    <th className="px-8 py-4">Description</th>
                    <th className="px-8 py-4 text-right">Amount</th>
                    <th className="px-8 py-4 text-center">Status</th>
                    <th className="px-8 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {billingHistory.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4 font-medium text-slate-500">{row.date}</td>
                      <td className="px-8 py-4 font-bold">{row.description}</td>
                      <td className="px-8 py-4 text-right font-bold">{row.amount}</td>
                      <td className="px-8 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          row.status === 'Paid' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-red-50 text-red-600'
                        }`}>
                          <div className={`w-1 h-1 rounded-full ${row.status === 'Paid' ? 'bg-emerald-600' : 'bg-red-600'}`} />
                          {row.status}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button className="text-slate-400 hover:text-indigo-600 transition-colors inline-flex items-center gap-2 text-xs font-bold">
                          {row.status === 'Paid' ? 'Download Invoice' : 'No Action Available'}
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
            <div className="space-y-6">
              <h2 className="text-xl font-bold px-2">Payment Method</h2>
              <div className="relative group overflow-hidden rounded-[2rem] aspect-[1.6/1] bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white shadow-2xl shadow-indigo-200">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                <div className="relative h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <CreditCard size={40} strokeWidth={1.5} />
                    <div className="text-2xl font-bold tracking-widest italic">VISA</div>
                  </div>
                  <div>
                    <div className="text-2xl font-mono tracking-[0.3em] mb-6">1520 0100 3356 6888</div>
                    <div className="flex gap-8">
                      <div>
                        <div className="text-[10px] font-bold uppercase opacity-60 mb-1">Name</div>
                        <div className="text-sm font-bold">John Smith</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase opacity-60 mb-1">Valid Thru</div>
                        <div className="text-sm font-bold">24/11</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 flex flex-col">
              <h2 className="text-xl font-bold px-2 opacity-0">Add New</h2>
              <button className="flex-1 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all hover:bg-indigo-50/30 group">
                <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={24} />
                </div>
                <span className="font-bold">Add New Card</span>
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default BillingDashboard;