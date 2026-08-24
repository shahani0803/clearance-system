import React, { useEffect, useState } from 'react';
import { ViewType, Student } from '../Types';
import logoImg from '../LOGO.png';
import { api } from '../api';

interface SidebarProps {
  students: Student[];
  activeTab: ViewType;
  setActiveTab: (tab: ViewType) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  students = [],
  activeTab,
  setActiveTab,
  onLogout
}) => {
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalUncollected, setTotalUncollected] = useState(0);

  const safeStudents = Array.isArray(students) ? students : [];

  // Fetch real fine summary from backend
  const loadFinesSummary = async () => {
    const summary = await api.getFinesSummary();
    setTotalCollected(summary.totalCollected);
    setTotalUncollected(summary.totalUncollected);
  };

  useEffect(() => {
    loadFinesSummary();
    // Refresh every 30s to stay in sync
    const interval = setInterval(loadFinesSummary, 30000);
    return () => clearInterval(interval);
  }, [safeStudents]);

  const navItems = [
    { id: 'dashboard',   label: 'Dashboard',   icon: '📊' },
    { id: 'students',    label: 'Students',     icon: '👥' },
    { id: 'clearance',   label: 'Clearance',    icon: '✅' },
    { id: 'collections', label: 'Collections',  icon: '💰' },
    { id: 'history',     label: 'History',      icon: '📜' },
    { id: 'blockchain',  label: 'Blockchain',   icon: '⛓️' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 no-print shadow-sm z-50">

      {/* 1. Header */}
      <div className="shrink-0 p-6 border-b border-slate-200 flex items-center gap-3 bg-slate-50/50">
        <img src={logoImg} alt="CampusSync Logo" className='w-10 h-10 object-contain drop-shadow-sm' />
        <div className="flex flex-col">
          <h1 className="font-bold text-lg text-slate-800 leading-tight">CampusSync</h1>
          <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold">Admin Portal</span>
        </div>
      </div>

      {/* 2. Navigation */}
      <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as ViewType)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200 font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 3. Bottom Section — Finance Summary */}
      <div className="shrink-0 border-t border-slate-100 bg-slate-50/30">

        {/* Total Collections */}
        <button
          onClick={() => setActiveTab('collections')}
          className={`w-full text-left px-6 py-4 mx-0 mt-4 mb-1 hover:bg-slate-50 transition-colors ${activeTab === 'collections' ? 'bg-emerald-50' : ''}`}
        >
          <div className="bg-white rounded-xl border border-emerald-200 shadow-sm px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Total Collections</p>
              <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-black">PAID</span>
            </div>
            <p className="text-lg font-black text-emerald-700">
              ₱{totalCollected.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </button>

        {/* Total Uncollected */}
        <div className="px-6 pb-3">
          <div className="bg-white rounded-xl border border-rose-200 shadow-sm px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Uncollected Fines</p>
              <span className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-black">PENDING</span>
            </div>
            <p className="text-lg font-black text-rose-600">
              ₱{totalUncollected.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="p-4 pt-0">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">🚪</span>
            <span className="text-sm">Logout</span>
          </button>

          <div className="mt-2 text-center">
            <p className="text-[10px] text-slate-400 font-medium">
              &copy; 2026 CampusSync v1.0
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;