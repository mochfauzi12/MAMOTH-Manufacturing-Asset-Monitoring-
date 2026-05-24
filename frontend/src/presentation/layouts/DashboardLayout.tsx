import React from 'react';
import { useAuthStore } from '../../application/store/auth.store';
import { useUIStore } from '../../application/store/ui.store';
import { LogOut, User, LayoutDashboard, Shield, AlertTriangle, Users, Activity } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  activeMenu?: 'DASHBOARD' | 'USERS' | 'IOT';
  onMenuChange?: (menu: 'DASHBOARD' | 'USERS' | 'IOT') => void;
}

export function DashboardLayout({ children, title, subtitle, activeMenu = 'DASHBOARD', onMenuChange }: DashboardLayoutProps) {
  const { user, logout } = useAuthStore();
  const { isSidebarOpen, toggleSidebar } = useUIStore();

  return (
    <div className="min-h-screen bg-[#080b14] text-slate-100 flex selection:bg-indigo-500 selection:text-white font-sans">
      {/* Background radial overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/15 via-slate-950/90 to-[#080b14] pointer-events-none" />
      
      {/* Glassmorphic Sidebar */}
      <aside className={`relative z-20 flex-shrink-0 ${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-950/80 border-r border-slate-900/80 backdrop-blur-md flex flex-col transition-all duration-300 ease-in-out`}>
        {/* Brand Logo Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-900/60 gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {isSidebarOpen && (
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              MAMOTH-Ops
            </span>
          )}
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button 
            type="button"
            onClick={() => onMenuChange?.('DASHBOARD')}
            className={`w-full flex items-center gap-4 px-4 py-3 font-semibold text-sm rounded-lg transition-all ${
              activeMenu === 'DASHBOARD'
                ? 'bg-gradient-to-r from-indigo-500/10 to-indigo-500/0 border-l-2 border-indigo-500 text-indigo-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span>Dashboard Utama</span>}
          </button>
          
          <button 
            type="button"
            onClick={() => onMenuChange?.('USERS')}
            className={`w-full flex items-center gap-4 px-4 py-3 font-semibold text-sm rounded-lg transition-all ${
              activeMenu === 'USERS'
                ? 'bg-gradient-to-r from-indigo-500/10 to-indigo-500/0 border-l-2 border-indigo-500 text-indigo-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40'
            }`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span>Kelola Karyawan</span>}
          </button>

          <button 
            type="button"
            onClick={() => onMenuChange?.('IOT')}
            className={`w-full flex items-center gap-4 px-4 py-3 font-semibold text-sm rounded-lg transition-all ${
              activeMenu === 'IOT'
                ? 'bg-gradient-to-r from-indigo-500/10 to-indigo-500/0 border-l-2 border-indigo-500 text-indigo-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40'
            }`}
          >
            <Activity className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span>IoT Telemetri</span>}
          </button>
        </nav>

        {/* User profile footer info */}
        <div className="p-4 border-t border-slate-900/60 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-indigo-400" />
            </div>
            {isSidebarOpen && (
              <div className="truncate">
                <p className="font-semibold text-sm text-slate-100 truncate">{user?.fullName}</p>
                <p className="text-[10px] text-indigo-400 font-mono font-semibold tracking-wide truncate">{user?.role}</p>
              </div>
            )}
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-slate-900 hover:bg-red-950/20 border border-slate-800 hover:border-red-900/30 text-slate-400 hover:text-red-400 text-xs font-bold rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            {isSidebarOpen && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Header */}
        <header className="h-20 bg-slate-950/40 border-b border-slate-900/40 backdrop-blur-sm flex items-center justify-between px-8 relative z-10">
          <div>
            <h2 className="font-bold text-xl text-slate-100">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          
          {/* Right controls */}
          <div className="flex items-center gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-1.5 flex items-center gap-2.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Supervisor Area: <strong>{user?.area || 'Zona Utama'}</strong></span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8 overflow-y-auto relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}