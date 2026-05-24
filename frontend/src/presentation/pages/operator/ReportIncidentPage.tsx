import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../application/store/auth.store';
import { db } from '../../../adapters/db/dexie';
import { useIncidentStore } from '../../../application/store/incident.store';
import { useIncidentSync } from '../../../application/hooks/useIncidentSync';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { AlertCircle, PlusCircle, CheckCircle, Clock, Search, LogOut } from 'lucide-react';

export function ReportIncidentPage() {
  const { user, logout } = useAuthStore();
  const { incidents, addIncident, updateIncidentStatus, addAuditLog } = useIncidentStore();

  // Activate offline sync hook
  const { isSyncing } = useIncidentSync();

  const [activeSubTab, setActiveSubTab] = useState<'NEW' | 'ACTIVE' | 'HISTORY'>('NEW');

  // Input states
  const [machineName, setMachineName] = useState('');
  const [location, setLocation] = useState('');
  const [incidentType, setIncidentType] = useState('Mekanik');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [description, setDescription] = useState('');
  
  // Custom Modal state for Autonomous Maintenance Resolution
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolvingIncident, setResolvingIncident] = useState<{ id: string; ticketNumber: string } | null>(null);
  const [correctiveNote, setCorrectiveNote] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [isResolveSuccess, setIsResolveSuccess] = useState(false);

  
  // Auto-suggest machine states
  const mockMachines = [
    { name: 'Extruder Press A1', loc: 'Lantai 1 - Area Cetak A' },
    { name: 'CNC Milling B3', loc: 'Lantai 1 - Area Bubut B' },
    { name: 'Hydraulic Pump Motor C1', loc: 'Lantai 2 - Ruang Utilitas' },
    { name: 'Boiler Steam Generator D1', loc: 'Lantai 1 - Area Luar Boiler' },
    { name: 'Fasilitas Pendukung Kantor (AC / Lampu / Kalibrasi)', loc: 'Gedung Kantor / Lab QC' },
    { name: 'Fasilitas Pendukung Gudang (Forklift / Rak)', loc: 'Gedung Gudang Utama' },
    { name: 'Utilitas Umum (Plumbing / Air / Toilet / Sipil)', loc: 'Pendukung Lini Pabrik' }
  ];
  const [suggestions, setSuggestions] = useState<{name: string, loc: string}[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);

  // Form submit state
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [ticketNumberCreated, setTicketNumberCreated] = useState('');
  
  // History local state
  const [localHistory, setLocalHistory] = useState<any[]>([]);

  // Filter global active incidents for operator view
  const activeGlobalIncidents = incidents.filter(i => i.status !== 'RESOLVED');

  useEffect(() => {
    loadLocalHistory();
  }, [activeSubTab]);

  const loadLocalHistory = async () => {
    const list = await db.incidents.orderBy('id').reverse().limit(10).toArray();
    setLocalHistory(list);
  };

  const handleMachineSearch = (val: string) => {
    setMachineName(val);
    if (val.length > 1) {
      const filtered = mockMachines.filter(m => m.name.toLowerCase().includes(val.toLowerCase()));
      setSuggestions(filtered);
      setShowSuggest(true);
    } else {
      setSuggestions([]);
      setShowSuggest(false);
    }
  };

  const handleSelectMachine = (mach: {name: string, loc: string}) => {
    setMachineName(mach.name);
    setLocation(mach.loc);
    setShowSuggest(false);
  };

  // Autonomous Self-Resolution Handlers
  const handleSelfResolve = (id: string, ticketNumber: string) => {
    setResolvingIncident({ id, ticketNumber });
    setCorrectiveNote('');
    setResolveError('');
    setIsResolveSuccess(false);
    setIsResolveModalOpen(true);
  };

  const handleSubmitSelfResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingIncident) return;
    
    if (correctiveNote.trim().length < 5) {
      setResolveError("⚠️ Gagal: Catatan perbaikan wajib diisi minimal 5 karakter untuk verifikasi tindakan!");
      return;
    }

    // Update Zustand store
    updateIncidentStatus(resolvingIncident.id, 'RESOLVED', 'Operator (Self-Resolved)', correctiveNote);
    addAuditLog(resolvingIncident.ticketNumber, user?.fullName || 'Operator Lantai', `Menyelesaikan insiden sendiri (Autonomous Maintenance): ${correctiveNote}`);
    
    // Refresh lists
    loadLocalHistory();
    setIsResolveSuccess(true);
    
    // Auto close modal after 1.8 seconds
    setTimeout(() => {
      setIsResolveModalOpen(false);
      setResolvingIncident(null);
      setCorrectiveNote('');
    }, 1800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineName || !location || !description) return;

    const isOnline = navigator.onLine;
    const localId = 'loc-' + Math.random().toString(36).substr(2, 9);
    
    // Determine Area code based on location for supervisor dashboard filter
    const parsedArea = location.includes('Cetak A') || location.includes('Area A') ? 'Area A' :
                       location.includes('Bubut B') || location.includes('Area B') ? 'Area B' : 'Area C';
    
    // Save to IndexedDB (Dexie) first (Zero-Data-Loss offline strategy)
    const localIncidentRecord = {
      localId: localId,
      machineId: 'mach-' + Math.random().toString(36).substr(2, 5),
      machineName: machineName,
      location: location,
      incidentType: incidentType,
      urgency: urgency,
      description: description,
      reportedBy: user?.fullName || 'Operator Lantai',
      syncStatus: (isOnline ? 'synced' : 'pending_sync') as any,
      createdAt: new Date(),
      retryCount: 0
    };

    const insertedId = await db.incidents.add(localIncidentRecord);

    if (isOnline) {
      // Create global ticket number
      const ticketNumber = 'INC-OP-' + new Date().toISOString().substring(0,10).replace(/-/g,'') + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
      
      // Update IndexedDB to store server info
      await db.incidents.update(insertedId, {
        serverUuid: 'srv-' + localId,
        ticketNumber: ticketNumber
      });

      // Add to Zustand for live dashboard
      addIncident({
        id: 'srv-' + localId,
        ticketNumber: ticketNumber,
        machineId: 'm-x',
        reportedById: user?.id || 'op',
        incidentType,
        description: `[Operator: ${user?.fullName}] Mesin: ${machineName} - ${description}`,
        urgency,
        status: 'PENDING_DISPATCH',
        photoUrls: [],
        createdAt: new Date().toISOString(),
        area: parsedArea
      });

      addAuditLog(ticketNumber, user?.fullName || 'Operator', 'Melaporkan Kerusakan (Online Direct)');
      setTicketNumberCreated(ticketNumber);
    } else {
      setTicketNumberCreated(`OFFLINE-${localId.toUpperCase()}`);
      addAuditLog(`OFFLINE-${localId.toUpperCase()}`, user?.fullName || 'Operator', 'Melaporkan Kerusakan offline (Tersimpan Lokal)');
    }

    setIsSubmitSuccess(true);
    
    // Clear inputs
    setMachineName('');
    setLocation('');
    setDescription('');
  };

  return (
    <div className="min-h-screen bg-[#080b14] text-slate-100 flex flex-col font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-950/95 to-[#080b14] pointer-events-none" />
      
      {/* Global PWA Offline Warning Banner */}
      <OfflineBanner />

      {/* Header Operator */}
      <header className="h-20 bg-slate-950/80 border-b border-slate-900/60 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">Form Pelaporan Insiden</h1>
            <p className="text-[10px] text-slate-400">Tablet Produksi &bull; {user?.fullName} &bull; {user?.department}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSyncing && (
            <div className="flex items-center gap-2 text-xs bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              Sync Offline data...
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 py-2 px-4 bg-slate-900 hover:bg-red-950/20 border border-slate-800 hover:border-red-900/30 text-slate-400 hover:text-red-400 text-xs font-bold rounded-xl transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Shift
          </button>
        </div>
      </header>

      {/* Navigation Sub-Tabs */}
      <div className="flex justify-center p-4 bg-slate-950/20 z-10">
        <div className="grid grid-cols-3 p-1 bg-slate-950/60 border border-slate-900 rounded-xl w-full max-w-[550px] shadow-inner shadow-black/40">
          <button
            type="button"
            onClick={() => { setActiveSubTab('NEW'); setIsSubmitSuccess(false); }}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'NEW' ? 'bg-slate-800 text-slate-100 shadow' : 'text-slate-500 hover:text-slate-350'}`}
          >
            <PlusCircle className="w-4 h-4" />
            Lapor Insiden Baru
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('ACTIVE')}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'ACTIVE' ? 'bg-slate-800 text-slate-100 shadow' : 'text-slate-500 hover:text-slate-350'}`}
          >
            <AlertCircle className="w-4 h-4 text-indigo-450" />
            Laporan Aktif ({activeGlobalIncidents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('HISTORY')}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeSubTab === 'HISTORY' ? 'bg-slate-800 text-slate-100 shadow' : 'text-slate-500 hover:text-slate-350'}`}
          >
            <Clock className="w-4 h-4" />
            Riwayat Tablet ({localHistory.length})
          </button>
        </div>
      </div>

      {/* Content area */}
      <main className="flex-1 p-6 flex items-center justify-center z-10">
        {activeSubTab === 'NEW' && (
          isSubmitSuccess ? (
            <div className="max-w-md w-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">Laporan Berhasil Tersimpan!</h2>
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-900 text-sm space-y-1 text-slate-400">
                <p>Kode Tiket Antrean:</p>
                <p className="font-mono text-lg font-bold text-slate-200 select-all">{ticketNumberCreated}</p>
                <p className="text-[10px] mt-2 text-indigo-400 font-semibold uppercase">
                  {navigator.onLine ? 'Terkirim langsung ke pusat kontrol (Online)' : 'Disimpan offline di device. Akan disinkronisasikan otomatis'}
                </p>
              </div>
              <button
                onClick={() => setIsSubmitSuccess(false)}
                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95 animate-pulse-light"
              >
                Buat Laporan Baru Lagi
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-xl w-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl space-y-4">
              <div className="text-center md:text-left border-b border-slate-800/50 pb-4">
                <h3 className="text-lg font-bold text-slate-100">Form Laporan Gangguan Mesin</h3>
                <p className="text-xs text-slate-500">Silakan isi formulir di bawah dengan target tombol berukuran sentuh besar.</p>
              </div>

              {/* Machine Search Autocomplete */}
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-slate-400">Nama Mesin (Ketik untuk cari)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={machineName}
                    onChange={(e) => handleMachineSearch(e.target.value)}
                    placeholder="Ketik untuk mencari mesin..."
                    className="w-full bg-slate-950/80 border border-slate-900 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-indigo-500/50 text-slate-200"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute right-4 top-4" />
                </div>
                
                {/* Suggestions dropdown */}
                {showSuggest && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-20">
                    {suggestions.map(s => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => handleSelectMachine(s)}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-slate-900 text-slate-300 border-b border-slate-900 flex justify-between items-center"
                      >
                        <span className="font-bold">{s.name}</span>
                        <span className="text-xs text-slate-500">{s.loc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Lokasi / Lantai</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Lantai 1 - Area Cetak A"
                  className="w-full bg-slate-950/80 border border-slate-900 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-indigo-500/50 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Jenis Kerusakan</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-900 rounded-xl px-4 py-3.5 text-sm focus:outline-none text-slate-200"
                  >
                    <option value="Mekanik">Mekanik</option>
                    <option value="Kelistrikan">Kelistrikan</option>
                    <option value="Suhu Tinggi">Suhu Tinggi</option>
                    <option value="Hidrolik">Hidrolik</option>
                    <option value="Fasilitas & Pendukung">Fasilitas & Pendukung</option>
                    <option value="Utilitas & Sipil">Utilitas & Sipil</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Urgensi</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className={`w-full border rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none ${urgency === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500 text-rose-400' : urgency === 'HIGH' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950/80 border-slate-900 text-slate-200'}`}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Deskripsi Masalah</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan secara ringkas bunyi aneh, asap, kebocoran, atau kejanggalan lain..."
                  className="w-full bg-slate-950/80 border border-slate-900 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-indigo-500/50 text-slate-200 resize-none"
                />
              </div>

              {/* Large glove-friendly Touch submit buttons */}
              <button
                type="submit"
                className="w-full py-4.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-extrabold text-base rounded-xl transition-all shadow-xl shadow-indigo-500/10 active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
              >
                🚀 SUBMIT LAPORAN INSIDEN
              </button>
            </form>
          )
        )}

        {/* ===================================================================== */}
        {/* NEW SUB-TAB: ACTIVE INCIDENTS LIST WITH AUTONOMOUS RESOLVE */}
        {/* ===================================================================== */}
        {activeSubTab === 'ACTIVE' && (
          <div className="max-w-2xl w-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-indigo-400" />
                Laporan Gangguan Aktif Lantai Pabrik
              </h3>
              <span className="text-[10px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded font-mono text-slate-400">{activeGlobalIncidents.length} Aktif</span>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Daftar kerusakan mesin yang sedang menunggu dispatch atau dalam perbaikan. Jika Anda berhasil menyelesaikan masalah minor secara mandiri, tekan tombol **"Selesaikan Sendiri"** untuk verifikasi tindakan.
            </p>

            {activeGlobalIncidents.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-20 bg-slate-950/20 border border-slate-900 border-dashed rounded-xl">Luar biasa! Tidak ada gangguan mesin aktif di lantai pabrik saat ini.</p>
            ) : (
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-2">
                {activeGlobalIncidents.map(inc => {
                  const isCritical = inc.urgency === 'CRITICAL';
                  return (
                    <div 
                      key={inc.id} 
                      className={`p-4 bg-slate-950/50 border rounded-xl flex flex-col space-y-3 ${isCritical ? 'border-rose-950/80 shadow-[inset_0_0_8px_rgba(244,63,94,0.08)]' : 'border-slate-900/60'}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1 truncate">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-indigo-400 font-bold">{inc.ticketNumber}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${inc.urgency === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/25' : inc.urgency === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                              {inc.urgency}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-200">
                            {inc.description}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">Dilaporkan: {new Date(inc.createdAt).toLocaleTimeString()}</p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className={`text-[10px] px-2.5 py-1 rounded-xl font-bold font-mono tracking-wide border ${
                            inc.status === 'PENDING_DISPATCH' 
                              ? 'bg-slate-900 border-slate-800 text-slate-400' 
                              : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                          }`}>
                            {inc.status === 'PENDING_DISPATCH' ? 'PENDING' : inc.status === 'DISPATCHED_MASSAL' ? 'BLASTED' : 'UNDER REPAIR'}
                          </span>
                        </div>
                      </div>

                      {/* Autonomous Resolution button */}
                      <div className="flex justify-end border-t border-slate-900/40 pt-2.5">
                        <button
                          type="button"
                          onClick={() => handleSelfResolve(inc.id, inc.ticketNumber)}
                          className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/25 px-3 py-1.5 rounded-xl transition-all active:scale-95"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          SELESAIKAN SENDIRI (AUTONOMOUS)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeSubTab === 'HISTORY' && (
          <div className="max-w-xl w-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              10 Laporan Terakhir Dari Tablet Ini
            </h3>
            
            {localHistory.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-10">Belum ada riwayat laporan yang dibuat di tablet ini.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {localHistory.map(lh => (
                  <div key={lh.id} className="p-4 bg-slate-950/50 border border-slate-900 rounded-xl flex items-center justify-between gap-4">
                    <div className="space-y-1 truncate">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-200">{lh.machineName}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${lh.urgency === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : lh.urgency === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400'}`}>
                          {lh.urgency}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-[340px]">{lh.description}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{new Date(lh.createdAt).toLocaleString()}</p>
                    </div>
                    
                    <div className="text-right">
                      <span className={`text-[10px] px-3 py-1.5 rounded-xl font-bold tracking-wide border ${lh.syncStatus === 'synced' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/5 border-amber-500/20 text-amber-400 animate-pulse'}`}>
                        {lh.syncStatus === 'synced' ? 'SYNCED ✅' : 'PENDING 📱'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Self-Resolution */}
      {isResolveModalOpen && resolvingIncident && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-slate-950/90 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-in">
            {isResolveSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">Resolusi Mandiri Berhasil!</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tiket <span className="font-mono font-bold text-indigo-400">{resolvingIncident.ticketNumber}</span> berhasil diselesaikan secara mandiri. Status telah di-update menjadi <span className="font-bold text-emerald-400">RESOLVED</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitSelfResolve} className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="font-extrabold text-slate-100 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    Tindakan Korektif (Autonomous Maintenance)
                  </h3>
                  <p className="text-[10px] text-indigo-400 font-mono font-bold mt-1">Tiket: {resolvingIncident.ticketNumber}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">
                    Deskripsikan perbaikan minor yang Anda lakukan untuk meresolusi insiden secara mandiri:
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={correctiveNote}
                    onChange={(e) => {
                      setCorrectiveNote(e.target.value);
                      if (e.target.value.trim().length >= 5) setResolveError('');
                    }}
                    placeholder="Contoh: Mengencangkan baut penutup motor yang longgar, membersihkan sisa debu oli, dan mengetes fungsi mesin kembali..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 text-slate-200 resize-none placeholder-slate-600"
                  />
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                    <span className={correctiveNote.trim().length < 5 ? 'text-rose-450' : 'text-emerald-450'}>
                      Minimal 5 karakter (Kini: {correctiveNote.trim().length})
                    </span>
                  </div>
                </div>

                {resolveError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>{resolveError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResolveModalOpen(false);
                      setResolvingIncident(null);
                    }}
                    className="py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl transition-all active:scale-[0.98]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Konfirmasi Selesai
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}