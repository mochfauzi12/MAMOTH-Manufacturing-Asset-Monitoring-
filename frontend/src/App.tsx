import React, { useEffect } from 'react';
import { AppRouter } from './presentation/router/AppRouter';
import { OfflineBanner } from './presentation/components/common/OfflineBanner';
import { useUIStore } from './application/store/ui.store';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

function App() {
  const { toast, clearToast } = useUIStore();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        clearToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  return (
    <div className="min-h-screen bg-[#080b14] relative overflow-hidden">
      {/* Global Offline Mode banner */}
      <OfflineBanner />

      {/* Global App Role-based Router */}
      <AppRouter />

      {/* Premium Toast Notification overlay */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in max-w-sm w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl flex items-start gap-3 backdrop-blur-md">
          {toast.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          )}
          {toast.type === 'error' && (
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          )}
          {toast.type === 'info' && (
            <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          )}
          
          <div className="flex-1 space-y-1">
            <p className="text-xs font-bold text-slate-200">Notifikasi Sistem</p>
            <p className="text-xs text-slate-400">{toast.message}</p>
          </div>

          <button onClick={clearToast} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
