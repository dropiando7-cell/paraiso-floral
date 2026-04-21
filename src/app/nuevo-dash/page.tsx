"use client";
import React from 'react';
import { 
  Puzzle, 
  BarChart2, 
  History, 
  Box, 
  Activity, 
  ShieldCheck, 
  Webhook, 
  Users, 
  GitBranch, 
  CreditCard, 
  Bell, 
  ChevronDown,
  Plus
} from 'lucide-react';

const NavItem = ({ icon: Icon, label, badge, active = false }: any) => (
  <button className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
    active 
    ? 'bg-slate-200/60 text-slate-900 font-semibold' 
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`}>
    <div className="flex items-center gap-2.5">
      <Icon size={18} strokeWidth={active ? 2.5 : 2} className={active ? 'text-slate-800' : 'text-slate-500'} />
      <span className="text-sm tracking-tight">{label}</span>
    </div>
    {badge !== undefined && (
      <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </button>
);

const Sidebar = () => (
  <aside className="w-64 h-screen bg-[#fafafa] border-r border-slate-200 flex flex-col fixed left-0 top-0 overflow-y-auto z-20">
    <div className="p-6 pb-2">
      <div className="flex items-center gap-2 mb-6">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-teal-500 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 3C21 3 17.5 2 13 4C9.5 5.5 6 9 5 13C4.2 16 3 20 3 20C3 20 5 19 8 16C11 13 14 11 16 10C19 8.5 21 8 21 8C21 8 21 5.5 21 3Z" />
          <path d="M16 10C16 10 14 11.5 12 14C10.5 16 9.5 18 9.5 18L11.5 20C11.5 20 13.5 17.5 16 15C18 13 20 11.5 20 11.5L16 10Z" className="text-orange-400 fill-current" />
        </svg>
        <span className="text-xl font-bold text-slate-900 tracking-tight">FeatherDev</span>
      </div>
    </div>

    <div className="flex-1 px-3 space-y-6">
      <div>
        <h4 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Main Features</h4>
        <div className="space-y-0.5">
          <NavItem icon={Puzzle} label="Integrations" />
          <NavItem icon={BarChart2} label="Analytics" />
          <NavItem icon={History} label="Activity Log" />
        </div>
      </div>

      <div>
        <h4 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Categories</h4>
        <div className="space-y-0.5">
          <NavItem icon={Box} label="Environment" badge={7} />
          <NavItem icon={Activity} label="Monitoring" badge={3} />
          <NavItem icon={ShieldCheck} label="Auth & Security" badge={1} />
          <NavItem icon={Webhook} label="Webhooks" badge={2} />
          <NavItem icon={Users} label="Collaboration" badge={4} />
          <NavItem icon={GitBranch} label="Version Control" badge={10} />
        </div>
      </div>

      <div>
        <h4 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Utility</h4>
        <div className="space-y-0.5">
          <NavItem icon={CreditCard} label="Billing" active />
          <NavItem icon={Bell} label="Notifications" />
        </div>
      </div>
    </div>

    <div className="p-4 border-t border-slate-200/60 mt-auto">
      <button className="flex items-center justify-between w-full p-2 hover:bg-slate-100 rounded-xl transition-all">
        <div className="flex items-center gap-3">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Amanda" alt="User" className="w-9 h-9 rounded-full bg-slate-200" />
          <div className="text-left leading-tight">
            <div className="text-sm font-bold text-slate-900">Amanda Rachel</div>
            <div className="text-[11px] text-slate-500 font-medium">Pro Plan</div>
          </div>
        </div>
        <ChevronDown size={14} className="text-slate-400" />
      </button>
    </div>
  </aside>
);

const BillingHistory = [
  { date: '2023-05-05', desc: 'Component billing. Pro plan', amount: '$29.00', status: 'Paid' },
  { date: '2023-05-23', desc: 'Browsing charge', amount: '$29.00', status: 'Failed' },
  { date: '2023-05-27', desc: 'Custom domain', amount: '$29.00', status: 'Paid' },
];

export default function FeatherDevDash() {
  return (
    <div className="bg-[#fcfdfd] min-h-screen text-slate-900 font-sans tracking-tight">
      <Sidebar />

      <main className="pl-64 relative min-h-screen">
        {/* Beautiful Top Hero Gradient mimicking the image closely */}
        <div className="absolute top-0 left-0 w-full h-[650px] overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-150px] left-[10%] w-[600px] h-[600px] bg-orange-300/30 blur-[120px] rounded-full" />
          <div className="absolute top-[-100px] right-[-5%] w-[800px] h-[700px] bg-teal-300/30 blur-[130px] rounded-full" />
          <div className="absolute top-[100px] left-[50%] w-[500px] h-[500px] bg-sky-200/30 blur-[100px] rounded-full" />
        </div>

        <div className="p-12 max-w-5xl mx-auto relative z-10 space-y-10">
          
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 text-slate-800">Billing</h1>
            <p className="text-slate-500 font-medium text-sm">Billing dashboard to pay data fees of FeatherDev.</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Subscription Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Plan Card */}
              <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex items-end justify-between">
                <div className="space-y-2">
                  <div className="text-sm font-bold text-slate-500">Current Plan</div>
                  <div className="text-4xl font-extrabold text-slate-800 tracking-tight">Pro Plan</div>
                  <div className="text-xl font-bold text-slate-800 mt-2">$29<span className="text-sm font-medium text-slate-500">/Month</span></div>
                </div>
                <button className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95">
                  Upgrade
                </button>
              </div>

              {/* Usage Summary Card */}
              <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-slate-800">Usage Summary</h3>
                  </div>
                  <div className="text-xs font-bold text-slate-500 mb-2">8,500 / 10,000 API Requests Used</div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>
                
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2">2 GB / 5 GB Storage Used</div>
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Billing History</h2>
            <div className="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Description</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Amount</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {BillingHistory.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{row.date}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800">{row.desc}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">{row.amount}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest ${
                          row.status === 'Paid' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-red-50 text-red-500'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5 text-sm font-bold">
                          Actions <ChevronDown size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 pb-12">
            <h2 className="text-lg font-bold text-slate-800">Payment Method</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Glassmorphism Credit Card */}
              <div className="relative overflow-hidden rounded-[24px] aspect-[1.6/1] bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900 p-8 text-white shadow-xl">
                {/* Visual Glass overlays mimicking image */}
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-teal-400/20 blur-2xl rounded-full" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-indigo-500/20 blur-2xl rounded-full" />
                
                <div className="relative h-full flex flex-col justify-between z-10">
                  <div className="flex justify-between items-start">
                    <div className="text-lg font-bold">glassmorphism</div>
                    <div className="text-2xl font-bold tracking-widest italic opacity-95">VISA</div>
                  </div>
                  <div>
                    <div className="text-2xl font-mono tracking-widest mb-4 opacity-90 drop-shadow-sm">1234 5678 9010 2345</div>
                    <div className="flex gap-8">
                      <div>
                        <div className="text-[9px] font-bold uppercase opacity-60 mb-0.5 tracking-wider">Card Holder</div>
                        <div className="text-sm font-bold">Amanda Rachel</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold uppercase opacity-60 mb-0.5 tracking-wider">Expires</div>
                        <div className="text-sm font-bold">12/28</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add New Card Button */}
              <button className="flex border border-dashed border-slate-300 bg-slate-50/50 rounded-[24px] flex-col items-center justify-center gap-3 text-slate-400 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all group aspect-[1.6/1]">
                <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={32} strokeWidth={1.5} />
                </div>
                <span className="font-semibold text-sm">Add New Card</span>
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
