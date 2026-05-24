import React, { useState } from 'react';
import { useAuthStore } from '../../../application/store/auth.store';
import { useIncidentStore } from '../../../application/store/incident.store';
import { useUIStore } from '../../../application/store/ui.store';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { User, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, LogOut, CheckSquare } from 'lucide-react';

export function TechnicianPage() {
  const { user, logout } = useAuthStore();
  const { incidents, updateIncidentStatus, addAuditLog } = useIncidentStore();
  const showToast = useUIStore(state => state.showToast);

  // Technician personal status states
  const [techStatus, setTechStatus] = useState<'STANDBY' | 'ON_DUTY' | 'OFF_DUTY'>('STANDBY');
  
  // Work notes input states
  const [activeTicketForNotes, setActiveTicketForNotes] = useState<string | null>(null);
  const [workNotes, setWorkNotes] = useState('');

  // Filter incidents assigned to me or dispatched generally
  const assignedTickets = incidents.filter(
    inc => inc.status === 'DISPATCHED_MASSAL' || inc.status === 'UNDER_REPAIR'
  );

  const handleAcceptTicket = (id: string, ticketNumber: string) => {
    updateIncidentStatus(id, 'UNDER_REPAIR');
    setTechStatus('ON_DUTY');
    addAuditLog(ticketNumber, user?.fullName || 'Teknisi', 'Menerima Perintah Kerja (UNDER_REPAIR)');
    showToast(`✅ Tiket ${ticketNumber} diterima. Status berubah ke Under Repair.`, 'success');
  };

  const handleResolveTicketTrigger = (id: string) => {
    setActiveTicketForNotes(id);
    setWorkNotes('');
  };

  const handleCompleteResolveTicket = () => {
    if (!activeTicketForNotes || !workNotes) return;
    
    const ticket = incidents.find(i => i.id === activeTicketForNotes);
    if (ticket) {
      updateIncidentStatus(activeTicketForNotes, 'RESOLVED', user?.fullName, workNotes);
      addAuditLog(ticket.ticketNumber, user?.fullName || 'Teknisi', `Menyelesaikan Tiket. Catatan: ${workNotes}`);
      showToast(`🎉 Tiket ${ticket.ticketNumber} diselesaikan!`, 'success');
    }

    setActiveTicketForNotes(null);
    setTechStatus('STANDBY');
  };

  return (
    <div className="min-h-screen bg-[#080b14] text-slate-100 flex flex-col font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-950/95 to-[#080b14] pointer-events-none" />
      
      {/* Global PWA Offline Warning Banner */}
      <OfflineBanner />

      {/* PWA Mobile Header */}
      <header className="h-20 bg-slate-950/80 border-b border-slate-900/60 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm">{user?.fullName}</h1>
            <p className="text-[10px] text-slate-400">Teknisi &bull; {user?.employeeCode}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 py-2 px-3.5 bg-slate-900 hover:bg-red-950/20 border border-slate-800 hover:border-red-900/30 text-slate-400 hover:text-red-400 text-xs font-bold rounded-xl transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log Out
        </button>
      </header>

      {/* Availability Status controller for Technician */}
      <div className="p-4 bg-slate-950/20 border-b border-slate-900/30 z-10">
        <div className="max-w-md mx-auto bg-slate-900 p-4 border border-slate-850 rounded-2xl space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase block text-center">Status Ketersediaan Anda</p>
          
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTechStatus('STANDBY')}
              className={`py-2 px-1 text-[10px] font-extrabold border rounded-xl transition-all ${techStatus === 'STANDBY' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950/40 border-slate-900 text-slate-500'}`}
            >
              STANDBY
            </button>
            <button
              onClick={() => setTechStatus('ON_DUTY')}
              className={`py-2 px-1 text-[10px] font-extrabold border rounded-xl transition-all ${techStatus === 'ON_DUTY' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950/40 border-slate-900 text-slate-500'}`}
            >
              ON DUTY
            </button>
            <button
              onClick={() => setTechStatus('OFF_DUTY')}
              className={`py-2 px-1 text-[10px] font-extrabold border rounded-xl transition-all ${techStatus === 'OFF_DUTY' ? 'bg-slate-950 border-slate-900 text-slate-400' : 'bg-slate-950/40 border-slate-900 text-slate-500'}`}
            >
              OFF DUTY
            </button>
          </div>
        </div>
      </div>

      {/* Work Orders List */}
      <main className="flex-1 p-6 z-10 max-w-md mx-auto w-full space-y-4">
        <h3 className="font-extrabold text-sm text-slate-300 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-indigo-400" />
          Perintah Kerja Aktif ({assignedTickets.length})
        </h3>

        <div className="space-y-4">
          {assignedTickets.length === 0 ? (
            <div className="text-center py-20 bg-slate-950/20 border border-slate-900 border-dashed rounded-2xl p-6">
              <p className="text-slate-500 text-sm">Tidak ada perintah kerja aktif.</p>
              <p className="text-xs text-slate-600 mt-1">Anda akan menerima push notification bila ditunjuk atau mendapat blast tiket baru.</p>
            </div>
          ) : (
            assignedTickets.map(ticket => {
              const isDispatched = ticket.status === 'DISPATCHED_MASSAL';
              
              return (
                <div
                  key={ticket.id}
                  className="bg-slate-900/80 border border-slate-850 p-5 rounded-2xl space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="font-mono text-xs text-indigo-400 font-bold">{ticket.ticketNumber}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black tracking-wide border ${ticket.urgency === 'CRITICAL' ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                      {ticket.urgency}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-400">
                    <p className="text-sm font-bold text-slate-200">Jenis: <strong className="text-slate-400">{ticket.incidentType}</strong></p>
                    <p className="text-slate-400">{ticket.description}</p>
                    <p className="text-[10px] text-slate-500">Masuk: {new Date(ticket.createdAt).toLocaleString()}</p>
                  </div>

                  {/* Glove-friendly Touch Action Buttons */}
                  <div className="pt-2">
                    {isDispatched ? (
                      <button
                        onClick={() => handleAcceptTicket(ticket.id, ticket.ticketNumber)}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl transition-all shadow"
                      >
                        ✅ TERIMA PERINTAH KERJA
                      </button>
                    ) : (
                      <button
                        onClick={() => handleResolveTicketTrigger(ticket.id)}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl transition-all shadow"
                      >
                        🏁 SELESAIKAN PEKERJAAN
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Complete/Resolve Modal Overlay with Notes required */}
      {activeTicketForNotes && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-slate-200 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
              Catatan Penyelesaian Kerja
            </h3>
            
            <p className="text-xs text-slate-400">Tuliskan analisis tindakan perbaikan secara detail untuk dokumentasi audit control.</p>

            <div className="space-y-4">
              <textarea
                required
                rows={4}
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                placeholder="Contoh: bearing telah diganti dengan part cadangan, conveyor telah ditension ulang..."
                className="w-full bg-slate-950/80 border border-slate-900 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-indigo-500/50 text-slate-200 resize-none"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTicketForNotes(null)}
                  className="py-3 bg-slate-950 border border-slate-900 text-slate-400 font-bold text-xs rounded-xl hover:bg-slate-900 transition-all"
                >
                  BATAL
                </button>
                <button
                  type="button"
                  disabled={!workNotes}
                  onClick={handleCompleteResolveTicket}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs rounded-xl transition-all"
                >
                  SUBMIT RESOLVED
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}