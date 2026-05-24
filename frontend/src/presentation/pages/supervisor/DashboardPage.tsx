import React, { useState } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useIncidentStore } from '../../../application/store/incident.store';
import { useUserStore } from '../../../application/store/user.store';
import { useWebSocketSimulation } from '../../../application/hooks/useWebSocket';
import { useUIStore } from '../../../application/store/ui.store';
import { AlertCircle, AlertTriangle, ShieldCheck, CheckCircle2, Megaphone, Clock, Info, UserPlus, Trash2, Shield, Hammer, HardHat, Activity, Cpu, TrendingUp } from 'lucide-react';

export function DashboardPage() {
  const { incidents, activeTicketCount, mttrAverage, technicianStats, auditLogs, updateIncidentStatus, addAuditLog } = useIncidentStore();
  const { employees, addEmployee, removeEmployee } = useUserStore();
  const showToast = useUIStore(state => state.showToast);

  // Active view routing state
  const [activeMenu, setActiveMenu] = useState<'DASHBOARD' | 'USERS' | 'IOT'>('DASHBOARD');

  // IoT Predictive Telemetry & Health States
  const [selectedIoTMachine, setSelectedIoTMachine] = useState<string>('Extruder Press A1');
  const [tempVal, setTempVal] = useState(55); 
  const [vibVal, setVibVal] = useState(24);   
  const [pressVal, setPressVal] = useState(105); 
  const [healthScore, setHealthScore] = useState(98); 

  const [tempHistory, setTempHistory] = useState<number[]>(Array(30).fill(55));
  const [vibHistory, setVibHistory] = useState<number[]>(Array(30).fill(24));

  const [isOverheating, setIsOverheating] = useState(false);
  const [isVibratingKritis, setIsVibratingKritis] = useState(false);
  const [isPressureDrop, setIsPressureDrop] = useState(false);
  const [autoTicketCreatedMachines, setAutoTicketCreatedMachines] = useState<string[]>([]);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Trigger auto work order when health score < 70%
  const triggerPreEmptiveTicket = (temp: number, vib: number, press: number, score: number) => {
    setAutoTicketCreatedMachines(prev => [...prev, selectedIoTMachine]);

    const today = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substr(2, 5).toUpperCase();
    const ticketNo = `INC-PRED-${today}-${randomHex}`;

    let anomalyReason = '';
    if (temp > 80) anomalyReason += `Temperatur tinggi terdeteksi (${temp.toFixed(1)}°C). `;
    if (vib > 45) anomalyReason += `Vibrasi Hz melebihi batas (${vib.toFixed(1)}Hz). `;
    if (press < 60) anomalyReason += `Tekanan hidrolik drop kritis (${press.toFixed(1)} PSI). `;

    const desc = `[PREDICTIVE ALERT 🚨] Sensor mendeteksi penurunan drastis Kesehatan Mesin (${score}%). Detail: ${anomalyReason} Segera lakukan tindakan pencegahan sebelum terjadi breakdown!`;

    const parsedArea = selectedIoTMachine.includes('A1') || selectedIoTMachine.includes('Kantor') ? 'Area A' :
                       selectedIoTMachine.includes('B3') || selectedIoTMachine.includes('Gudang') ? 'Area B' : 'Area C';

    // Push into incident store
    const { addIncident } = useIncidentStore.getState();
    addIncident({
      id: 'pred-' + Math.random().toString(36).substr(2, 9),
      ticketNumber: ticketNo,
      machineId: 'm-pred-' + Math.random().toString(36).substr(2, 4),
      reportedById: 'SYSTEM_PREDICTIVE_AI',
      incidentType: temp > 80 ? 'Suhu Tinggi' : vib > 45 ? 'Mekanik' : 'Hidrolik',
      description: desc,
      urgency: 'HIGH',
      status: 'PENDING_DISPATCH',
      photoUrls: [],
      createdAt: new Date().toISOString(),
      area: parsedArea
    });

    addAuditLog(ticketNo, 'IoT Predictive Sensor Engine', `Memicu otomatis pre-emptive maintenance ticket karena health score ${score}%`);
    showToast(`🚨 IoT ALERT: Tiket pencegahan ${ticketNo} otomatis terbit untuk ${selectedIoTMachine}!`, 'error');
  };

  // IoT Telemetry Update Interval Loop
  React.useEffect(() => {
    const interval = setInterval(() => {
      let nextTemp = tempVal;
      let nextVib = vibVal;
      let nextPress = pressVal;

      if (isOverheating) {
        nextTemp = Math.min(115, tempVal + Math.floor(Math.random() * 8) + 4);
      } else {
        const base = 55;
        nextTemp = base + Math.floor(Math.sin(Date.now() / 5000) * 4) + (Math.random() > 0.5 ? 1 : -1);
      }

      if (isVibratingKritis) {
        nextVib = Math.min(85, vibVal + Math.floor(Math.random() * 6) + 3);
      } else {
        const base = 24;
        nextVib = base + Math.floor(Math.cos(Date.now() / 4000) * 2) + (Math.random() > 0.5 ? 1 : -1);
      }

      if (isPressureDrop) {
        nextPress = Math.max(30, pressVal - Math.floor(Math.random() * 10) - 5);
      } else {
        const base = 105;
        nextPress = base + Math.floor(Math.sin(Date.now() / 6000) * 3) + (Math.random() > 0.5 ? 1 : -1);
      }

      // Health Score computation
      let score = 98;
      if (nextTemp > 80) score -= (nextTemp - 80) * 0.9;
      if (nextVib > 45) score -= (nextVib - 45) * 1.3;
      if (nextPress < 60) score -= (60 - nextPress) * 1.1;

      const finalScore = Math.max(0, Math.min(100, Math.round(score)));

      setTempVal(nextTemp);
      setVibVal(nextVib);
      setPressVal(nextPress);
      setHealthScore(finalScore);

      setTempHistory(prev => [...prev.slice(1), nextTemp]);
      setVibHistory(prev => [...prev.slice(1), nextVib]);

      if (finalScore < 70 && !autoTicketCreatedMachines.includes(selectedIoTMachine)) {
        triggerPreEmptiveTicket(nextTemp, nextVib, nextPress, finalScore);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tempVal, vibVal, pressVal, isOverheating, isVibratingKritis, isPressureDrop, selectedIoTMachine, autoTicketCreatedMachines]);

  // Real-time Canvas drawing logic
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw dark grid background
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let j = 0; j < height; j += 25) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(width, j);
      ctx.stroke();
    }

    const step = width / (tempHistory.length - 1);

    // Draw Temp wave (Indigo neon)
    ctx.beginPath();
    ctx.strokeStyle = isOverheating ? 'rgba(244, 63, 94, 0.9)' : 'rgba(99, 102, 241, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 12;
    ctx.shadowColor = isOverheating ? 'rgba(244, 63, 94, 0.6)' : 'rgba(99, 102, 241, 0.4)';
    
    tempHistory.forEach((val, idx) => {
      const percentage = (val - 30) / (120 - 30);
      const y = height - 12 - percentage * (height - 24);
      const x = idx * step;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Vibration wave (Emerald neon)
    ctx.beginPath();
    ctx.strokeStyle = isVibratingKritis ? 'rgba(245, 158, 11, 0.9)' : 'rgba(16, 185, 129, 0.8)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = isVibratingKritis ? 'rgba(245, 158, 11, 0.5)' : 'rgba(16, 185, 129, 0.4)';
    
    vibHistory.forEach((val, idx) => {
      const percentage = (val - 5) / (90 - 5);
      const y = height - 12 - percentage * (height - 24);
      const x = idx * step;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [tempHistory, vibHistory, isOverheating, isVibratingKritis]);

  // New employee form states
  const [fullName, setFullName] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<'OPERATOR' | 'SUPERVISOR' | 'TECHNICIAN'>('OPERATOR');
  const [pinInput, setPinInput] = useState('');
  
  // Dynamic fields
  const [shiftInput, setShiftInput] = useState('Pagi (Shift A)');
  const [deptInput, setDeptInput] = useState('Molding & Pressing');
  const [areaInput, setAreaInput] = useState('Zona Perakitan A');
  const [specializations, setSpecializations] = useState<string[]>([]);

  // Hook live WebSocket simulator
  useWebSocketSimulation();

  // Selection states for blast dispatcher
  const [selectedIncidentIds, setSelectedIncidentIds] = useState<string[]>([]);
  const [isBlastModalOpen, setIsBlastModalOpen] = useState(false);
  const [blastProgress, setBlastProgress] = useState(0);
  const [isBlasting, setIsBlasting] = useState(false);
  const [blastTargetCount, setBlastTargetCount] = useState(8);

  // Filters state
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterArea, setFilterArea] = useState<string>('ALL');

  const filteredIncidents = incidents.filter(inc => {
    const matchUrgency = filterUrgency === 'ALL' || inc.urgency === filterUrgency;
    const matchStatus = filterStatus === 'ALL' || inc.status === filterStatus;
    const matchArea = filterArea === 'ALL' || inc.area === filterArea;
    return matchUrgency && matchStatus && matchArea;
  });

  const handleSelectTicket = (id: string) => {
    setSelectedIncidentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleTriggerBlast = () => {
    if (selectedIncidentIds.length === 0) return;
    setIsBlastModalOpen(true);
    setIsBlasting(true);
    setBlastProgress(0);

    // Play blast siren sound
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1004/1004-200.wav');
      audio.volume = 0.3;
      audio.play();
    } catch (e) {}

    // Progress Loop
    const timer = setInterval(() => {
      setBlastProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsBlasting(false);
          // Complete logic
          selectedIncidentIds.forEach(id => {
            updateIncidentStatus(id, 'DISPATCHED_MASSAL');
            const ticket = incidents.find(i => i.id === id);
            if (ticket) {
              addAuditLog(ticket.ticketNumber, 'Supervisor Rina Susanti', 'Mengirim Notifikasi Blast (DISPATCHED_MASSAL)');
            }
          });
          showToast(`📢 Blast notifikasi massal sukses ke ${blastTargetCount} teknisi!`, 'success');
          setSelectedIncidentIds([]);
          return 100;
        }
        return prev + 20;
      });
    }, 600);
  };

  // Add new employee handler
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !emailInput) return;

    // Generate unique employee codes
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const prefix = roleInput === 'OPERATOR' ? 'OPR' : roleInput === 'TECHNICIAN' ? 'TEC' : 'SUP';
    const employeeCode = `EMP-${prefix}-${randomSuffix}`;

    const newEmp: any = {
      fullName,
      email: emailInput,
      role: roleInput,
      employeeCode,
    };

    if (roleInput === 'OPERATOR') {
      newEmp.shift = shiftInput;
      newEmp.department = deptInput;
      newEmp.pin = pinInput || '123456';
    } else if (roleInput === 'TECHNICIAN') {
      newEmp.specialization = specializations.length > 0 ? specializations : ['Generalist'];
    } else if (roleInput === 'SUPERVISOR') {
      newEmp.area = areaInput;
    }

    addEmployee(newEmp);
    showToast(`👤 Karyawan ${fullName} (${roleInput}) berhasil ditambahkan ke database!`, 'success');

    // Reset Form
    setFullName('');
    setEmailInput('');
    setPinInput('');
    setSpecializations([]);
  };

  const handleSpecCheckbox = (spec: string) => {
    setSpecializations(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleAcceptTicket = (id: string, ticketNumber: string) => {
    const vNote = prompt(`Validasi Tiket ${ticketNumber}:\n\nTambahkan catatan verifikasi Anda (opsional):`);
    if (vNote === null) return;
    const note = vNote.trim() || "Penyelesaian mesin terverifikasi dan berfungsi normal.";

    useIncidentStore.setState((state) => {
      const updated = state.incidents.map(inc => {
        if (inc.id === id) {
          return {
            ...inc,
            isVerified: true,
            verificationNote: note,
            verifiedAt: new Date().toISOString()
          };
        }
        return inc;
      });
      return { incidents: updated };
    });

    addAuditLog(ticketNumber, 'Supervisor Rina Susanti', `Memvalidasi & menyetujui penyelesaian tiket: ${note}`);
    showToast(`✅ Tiket ${ticketNumber} berhasil diverifikasi!`, 'success');
  };

  const handleRejectTicket = (id: string, ticketNumber: string) => {
    const rReason = prompt(`Tolak Penyelesaian Tiket ${ticketNumber}:\n\nMasukkan alasan penolakan (wajib):`);
    if (rReason === null) return;
    if (rReason.trim().length < 5) {
      alert("⚠️ Gagal: Alasan penolakan wajib diisi minimal 5 karakter!");
      return;
    }

    useIncidentStore.setState((state) => {
      const updated = state.incidents.map(inc => {
        if (inc.id === id) {
          return {
            ...inc,
            status: 'UNDER_REPAIR' as const,
            resolvedNote: undefined,
            resolvedAt: undefined,
            isVerified: false,
            verificationNote: undefined
          };
        }
        return inc;
      });
      return { 
        incidents: updated,
        activeTicketCount: updated.filter(i => i.status !== 'RESOLVED').length
      };
    });

    addAuditLog(ticketNumber, 'Supervisor Rina Susanti', `Menolak perbaikan & membuka kembali tiket. Alasan: ${rReason}`);
    showToast(`✕ Tiket ${ticketNumber} ditolak dan dibuka kembali untuk perbaikan.`, 'info');
  };

  return (
    <DashboardLayout
      title={
        activeMenu === 'DASHBOARD' 
          ? "Supervisor Dispatch Dashboard" 
          : activeMenu === 'USERS' 
          ? "Manajemen Karyawan (Admin Panel)" 
          : "IoT Predictive Telemetry & Health Score"
      }
      subtitle={
        activeMenu === 'DASHBOARD' 
          ? "Monitoring insiden lantai pabrik dan dispatch teknisi asinkronous massal secara live"
          : activeMenu === 'USERS'
          ? "Kelola akun pengguna, supervisor, teknisi, dan tablet operator PIN pabrik"
          : "Simulasi parameter sensor IoT pabrik cerdas dan analisis kesehatan mesin prediktif"
      }
      activeMenu={activeMenu}
      onMenuChange={(menu) => setActiveMenu(menu as any)}
    >
      {/* ===================================================================== */}
      {/* 1. VIEW: INCIDENTS MONITORING DASHBOARD */}
      {/* ===================================================================== */}
      {activeMenu === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* KPI Row widgets */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Tiket Aktif</p>
                <h3 className="text-2xl font-black text-slate-100">{activeTicketCount} Tiket</h3>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Rata-rata MTTR</p>
                <h3 className="text-2xl font-black text-slate-100">{mttrAverage.toFixed(1)} Menit</h3>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Teknisi Standby</p>
                <h3 className="text-2xl font-black text-slate-100">{technicianStats.standby} / {technicianStats.online} Online</h3>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 animate-pulse">
                <span className="w-3 h-3 rounded-full bg-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Koneksi Stream</p>
                <h3 className="text-sm font-black text-slate-100 font-mono">CONNECTED (WS)</h3>
              </div>
            </div>
          </div>

          {/* Dashboard Work Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/60 p-4 border border-slate-900 rounded-2xl">
                <div className="flex items-center gap-3">
                  <h4 className="font-extrabold text-sm text-slate-200">Daftar Gangguan Mesin</h4>
                  <div className="flex gap-2">
                    <select
                      value={filterUrgency}
                      onChange={(e) => setFilterUrgency(e.target.value)}
                      className="bg-slate-900 text-xs px-2 py-1.5 border border-slate-800 rounded-lg text-slate-400"
                    >
                      <option value="ALL">Semua Urgensi</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-slate-900 text-xs px-2 py-1.5 border border-slate-800 rounded-lg text-slate-400"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="PENDING_DISPATCH">Pending</option>
                      <option value="DISPATCHED_MASSAL">Dispatched</option>
                      <option value="UNDER_REPAIR">Dalam Perbaikan</option>
                      <option value="RESOLVED">Selesai</option>
                    </select>
                    <select
                      value={filterArea}
                      onChange={(e) => setFilterArea(e.target.value)}
                      className="bg-slate-900 text-xs px-2 py-1.5 border border-slate-800 rounded-lg text-slate-400"
                    >
                      <option value="ALL">Semua Lini / Area</option>
                      <option value="Area A">Area A (Molding)</option>
                      <option value="Area B">Area B (CNC)</option>
                      <option value="Area C">Area C (Conveyor)</option>
                    </select>
                  </div>
                </div>

                {selectedIncidentIds.length > 0 && (
                  <button
                    onClick={handleTriggerBlast}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow shadow-indigo-500/10 active:scale-95"
                  >
                    <Megaphone className="w-4 h-4" />
                    BLAST WORK ORDER ({selectedIncidentIds.length})
                  </button>
                )}
              </div>

              {/* Incidents Card list */}
              <div className="space-y-3">
                {filteredIncidents.length === 0 ? (
                  <p className="text-slate-500 text-center py-20 bg-slate-950/20 rounded-2xl border border-slate-900 border-dashed">Tidak ada tiket insiden yang sesuai dengan filter.</p>
                ) : (
                  filteredIncidents.map(inc => {
                    const isPending = inc.status === 'PENDING_DISPATCH';
                    const isCritical = inc.urgency === 'CRITICAL';
                    const isSelected = selectedIncidentIds.includes(inc.id);

                    return (
                      <div
                        key={inc.id}
                        onClick={() => isPending && handleSelectTicket(inc.id)}
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 relative overflow-hidden select-none ${isPending ? 'cursor-pointer hover:border-slate-800' : ''} ${isSelected ? 'bg-indigo-500/5 border-indigo-500 shadow' : 'bg-slate-950/40 border-slate-900/60'} ${isCritical && isPending ? 'shadow-[inset_0_0_12px_rgba(244,63,94,0.15)] border-rose-950 animate-pulse-light' : ''}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                          <div className="flex items-start gap-4 truncate">
                            {isPending && (
                              <div className="pt-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="rounded border-slate-800 bg-slate-950 text-indigo-500 w-4.5 h-4.5 cursor-pointer"
                                />
                              </div>
                            )}
                            
                            <div className="space-y-1.5 truncate">
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs text-indigo-400 font-bold">{inc.ticketNumber}</span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black tracking-wide border ${inc.urgency === 'CRITICAL' ? 'bg-red-500/10 border-red-500/25 text-red-400' : inc.urgency === 'HIGH' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                  {inc.urgency}
                                </span>
                                {inc.area && (
                                  <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold font-mono">
                                    {inc.area}
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-sm font-bold text-slate-200">Kategori: <strong className="text-slate-400">{inc.incidentType}</strong></p>
                              <p className="text-xs text-slate-400 truncate max-w-[450px]">{inc.description}</p>
                              <p className="text-[10px] text-slate-500 font-medium">Dilaporkan: {new Date(inc.createdAt).toLocaleTimeString()}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border font-mono tracking-wide ${
                              inc.status === 'PENDING_DISPATCH' 
                                ? 'bg-slate-900 border-slate-800 text-slate-400' 
                                : inc.status === 'DISPATCHED_MASSAL' 
                                ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400 animate-pulse' 
                                : inc.status === 'UNDER_REPAIR' 
                                ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' 
                                : inc.isVerified 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            }`}>
                              {inc.status === 'PENDING_DISPATCH' 
                                ? 'PENDING DISPATCH' 
                                : inc.status === 'DISPATCHED_MASSAL' 
                                ? 'BLASTING (DISPATCHED)' 
                                : inc.status === 'UNDER_REPAIR' 
                                ? 'Dalam Perbaikan' 
                                : inc.isVerified 
                                ? 'VERIFIED ✓' 
                                : 'SELESAI (WAITING VERIFY)'}
                            </span>
                          </div>
                        </div>

                        {/* Verification Area for Supervisor */}
                        {inc.status === 'RESOLVED' && (
                          <div className="border-t border-slate-900/60 pt-3 flex flex-col space-y-3 w-full">
                            <div className="bg-slate-900/30 p-3.5 rounded-xl border border-slate-900 text-xs">
                              <p className="font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                Tindakan Korektif (Operator/Teknisi):
                              </p>
                              <p className="text-slate-300 italic font-mono bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">"{inc.resolvedNote || 'Tidak ada catatan.'}"</p>
                              {inc.resolvedAt && (
                                <p className="text-[10px] text-slate-500 mt-2 font-mono">Diselesaikan pada: {new Date(inc.resolvedAt).toLocaleString()}</p>
                              )}
                              {inc.isVerified && inc.verificationNote && (
                                <div className="mt-3 pt-3 border-t border-slate-900/60 text-xs text-slate-400">
                                  <p className="font-bold text-emerald-400 flex items-center gap-1">
                                    <span>✓ Verified by Supervisor:</span>
                                  </p>
                                  <p className="bg-slate-900/40 p-2 rounded-lg mt-1 font-mono text-emerald-350">"{inc.verificationNote}"</p>
                                </div>
                              )}
                            </div>

                            {!inc.isVerified && (
                              <div className="flex items-center gap-3 justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleRejectTicket(inc.id, inc.ticketNumber)}
                                  className="flex items-center gap-1 text-[10px] font-black text-rose-400 hover:text-rose-350 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/25 px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                                >
                                  ✕ REJECT (BUKA KEMBALI)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptTicket(inc.id, inc.ticketNumber)}
                                  className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/25 px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                                >
                                  ✓ APPROVE (VERIFIKASI SUKSES)
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Audit Logs */}
            <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 flex flex-col max-h-[550px]">
              <h4 className="font-extrabold text-sm text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-400" />
                Live Audit & Control Logs
              </h4>
              
              <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1">
                {auditLogs.map(log => (
                  <div key={log.id} className="text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{log.actor}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 font-semibold">{log.action}</p>
                    <p className="text-[10px] text-indigo-400 font-mono">{log.ticketNumber}</p>
                  </div>
                ))}
              </div>
              
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-850 flex items-center gap-3 text-xs text-slate-400 mt-2">
                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>Broadcast otomatis akan ter-trigger bila ada operator yang mensubmit insiden baru.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. VIEW: USER & EMPLOYEE REGISTRY PANEL */}
      {/* ===================================================================== */}
      {activeMenu === 'USERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: New User Registration Form */}
          <div className="bg-slate-950/60 border border-slate-900 p-5 rounded-2xl flex flex-col space-y-5 h-fit shadow-lg shadow-indigo-950/10">
            <h3 className="font-extrabold text-sm text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              Tambah Karyawan Baru
            </h3>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Rian Hidayat"
                  className="w-full bg-slate-900 border border-slate-800 placeholder:text-slate-650 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">Email Perusahaan</label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Contoh: rian@contohpabrik.com"
                  className="w-full bg-slate-900 border border-slate-800 placeholder:text-slate-650 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">Peran Sistem (Role)</label>
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="OPERATOR">OPERATOR (Shared Tablet PIN)</option>
                  <option value="TECHNICIAN">TECHNICIAN (PWA Worker)</option>
                  <option value="SUPERVISOR">SUPERVISOR (Control Dashboard)</option>
                </select>
              </div>

              {/* Dynamic Inputs: If OPERATOR */}
              {roleInput === 'OPERATOR' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Shift Kerja</label>
                      <select
                        value={shiftInput}
                        onChange={(e) => setShiftInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Pagi (Shift A)">Pagi (Shift A)</option>
                        <option value="Siang (Shift B)">Siang (Shift B)</option>
                        <option value="Malam (Shift C)">Malam (Shift C)</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">PIN Tablet (6-Digit)</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full bg-slate-900 border border-slate-800 placeholder:text-slate-650 rounded-xl px-3 py-2.5 text-[11px] text-center text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Departemen Produksi</label>
                    <input
                      type="text"
                      required
                      value={deptInput}
                      onChange={(e) => setDeptInput(e.target.value)}
                      placeholder="Contoh: Molding & Pressing"
                      className="w-full bg-slate-900 border border-slate-800 placeholder:text-slate-650 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              {/* Dynamic Inputs: If TECHNICIAN */}
              {roleInput === 'TECHNICIAN' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 block">Bidang Spesialisasi</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                    {['Mechanical', 'Electrical', 'Hydraulic', 'Automation'].map(spec => (
                      <label key={spec} className="flex items-center gap-2 text-[11px] text-slate-350 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={specializations.includes(spec)}
                          onChange={() => handleSpecCheckbox(spec)}
                          className="rounded border-slate-800 bg-slate-950 text-indigo-500 w-3.5 h-3.5"
                        />
                        {spec}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Inputs: If SUPERVISOR */}
              {roleInput === 'SUPERVISOR' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">Area Pengawasan</label>
                  <input
                    type="text"
                    required
                    value={areaInput}
                    onChange={(e) => setAreaInput(e.target.value)}
                    placeholder="Contoh: Zona Perakitan A"
                    className="w-full bg-slate-900 border border-slate-800 placeholder:text-slate-650 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all duration-200 shadow-md shadow-indigo-600/10 active:scale-[0.98] pt-3"
              >
                Simpan Karyawan
              </button>
            </form>
          </div>

          {/* Right panel: Registered Users Table List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-950/60 p-4 border border-slate-900 rounded-2xl flex justify-between items-center">
              <h4 className="font-extrabold text-sm text-slate-200">Daftar Karyawan Terdaftar</h4>
              <span className="text-[10px] bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg font-mono text-slate-400">{employees.length} Karyawan</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.map(emp => (
                <div 
                  key={emp.id}
                  className="bg-slate-950/40 border border-slate-900/60 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-slate-800 transition-all relative overflow-hidden group"
                >
                  {/* Absolute subtle glowing aura */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/10 to-indigo-500/0 opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none" />

                  {/* Top row: Role Icon, Name, and Badge */}
                  <div className="flex items-start justify-between gap-2 z-10">
                    <div className="flex items-center gap-3 truncate">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        emp.role === 'SUPERVISOR' 
                          ? 'bg-violet-500/10 border-violet-500/25 text-violet-400' 
                          : emp.role === 'TECHNICIAN'
                          ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                          : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                      }`}>
                        {emp.role === 'SUPERVISOR' && <Shield className="w-5 h-5" />}
                        {emp.role === 'TECHNICIAN' && <Hammer className="w-5 h-5" />}
                        {emp.role === 'OPERATOR' && <HardHat className="w-5 h-5" />}
                      </div>

                      <div className="truncate">
                        <h5 className="text-sm font-extrabold text-slate-100 truncate">{emp.fullName}</h5>
                        <p className="text-[10px] text-slate-500 font-mono tracking-wide mt-0.5">{emp.employeeCode}</p>
                      </div>
                    </div>

                    <span className={`text-[8px] font-black tracking-widest px-2 py-0.5 rounded-md border ${
                      emp.role === 'SUPERVISOR' 
                        ? 'bg-violet-500/10 border-violet-500/25 text-violet-400' 
                        : emp.role === 'TECHNICIAN'
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                        : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                    }`}>
                      {emp.role}
                    </span>
                  </div>

                  {/* Mid row: Role Specific Specs info */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900/60 text-[11px] text-slate-400 space-y-1.5 z-10">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Email:</span>
                      <span className="text-slate-300 font-mono">{emp.email}</span>
                    </div>

                    {emp.role === 'OPERATOR' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold">Shift Kerja:</span>
                          <span className="text-indigo-400 font-extrabold">{emp.shift}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold">PIN Tablet:</span>
                          <span className="text-emerald-400 font-black font-mono tracking-widest">{emp.pin}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold">Departemen:</span>
                          <span className="text-slate-350">{emp.department}</span>
                        </div>
                      </>
                    )}

                    {emp.role === 'TECHNICIAN' && (
                      <div className="flex justify-between items-start">
                        <span className="text-slate-500 font-bold flex-shrink-0">Keahlian:</span>
                        <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                          {emp.specialization?.map(spec => (
                            <span key={spec} className="text-[9px] font-bold bg-slate-900 border border-slate-800 text-amber-400 px-1.5 py-0.25 rounded-md">{spec}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {emp.role === 'SUPERVISOR' && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Area Pengawasan:</span>
                        <span className="text-violet-400 font-extrabold">{emp.area}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom row: Delete Action button */}
                  <div className="flex justify-end pt-1 z-10">
                    {emp.employeeCode !== 'EMP-SUP-001' && emp.employeeCode !== 'EMP-TEC-001' && emp.employeeCode !== 'EMP-OPR-001' ? (
                      <button
                        type="button"
                        onClick={() => {
                          removeEmployee(emp.id);
                          showToast(`🗑️ Akun ${emp.fullName} berhasil dihapus dari sistem.`, 'info');
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 px-2.5 py-1 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus Karyawan
                      </button>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-600 italic">Akun Sistem Utama</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. VIEW: IoT PREDICTIVE TELEMETRY & HEALTH SCREEN */}
      {/* ===================================================================== */}
      {activeMenu === 'IOT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Left panel: Selected Machine & Anomaly Controllers */}
          <div className="bg-slate-950/60 border border-slate-900 p-5 rounded-2xl flex flex-col space-y-5 h-fit shadow-lg shadow-indigo-950/10">
            <div>
              <h3 className="font-extrabold text-sm text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-2">
                <Cpu className="w-4.5 h-4.5 text-indigo-400" />
                Target IoT Node
              </h3>
            </div>

            {/* Dropdown pemilih mesin */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Pilih Node / Mesin Aktif:</label>
              <select
                value={selectedIoTMachine}
                onChange={(e) => {
                  setSelectedIoTMachine(e.target.value);
                  // Reset simulator flags on switch
                  setIsOverheating(false);
                  setIsVibratingKritis(false);
                  setIsPressureDrop(false);
                  // Normal values reset
                  setTempVal(55);
                  setVibVal(24);
                  setPressVal(105);
                  setHealthScore(98);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
              >
                <option value="Extruder Press A1">Extruder Press A1 [Area A]</option>
                <option value="CNC Milling B3">CNC Milling B3 [Area B]</option>
                <option value="Hydraulic Pump Motor C1">Hydraulic Pump Motor C1 [Area Utilitas]</option>
                <option value="Boiler Steam Generator D1">Boiler Steam Generator D1 [Area Boiler]</option>
                <option value="Fasilitas Pendukung Kantor (AC / Lampu / Kalibrasi)">Fasilitas Kantor & QC [Area A]</option>
                <option value="Fasilitas Pendukung Gudang (Forklift / Rak)">Fasilitas Gudang & Logistik [Area B]</option>
                <option value="Utilitas Umum (Plumbing / Air / Toilet / Sipil)">Utilitas & Sipil [Area C]</option>
              </select>
            </div>

            {/* Big Health Score Badge with glowing ring */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">Skor Kesehatan Mesin (Predictive AI):</label>
              <div className={`py-6 rounded-2xl border text-center transition-all duration-300 relative ${
                healthScore >= 90 
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                  : healthScore >= 70
                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'bg-rose-500/5 border-rose-500/30 text-rose-450 shadow-[0_0_22px_rgba(244,63,94,0.3)] animate-pulse'
              }`}>
                <p className="text-[10px] uppercase tracking-widest font-black opacity-80">Machine Health</p>
                <p className="text-4xl font-black mt-1.5 font-mono tracking-tight">{healthScore}%</p>
                <p className="text-[10px] font-semibold mt-1 opacity-70">
                  {healthScore >= 90 ? '✓ Sistem Stabil (Ideal)' : healthScore >= 70 ? '⚠ Degradasi Terdeteksi' : '🚨 ANOMALI KRITIS!'}
                </p>
              </div>
            </div>

            {/* Controls panel */}
            <div className="space-y-3.5 pt-2 border-t border-slate-900">
              <p className="text-[11px] font-bold text-slate-450 flex items-center gap-1">
                <span>🔧 DEMO ANOMALY SIMULATOR</span>
              </p>
              
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsOverheating(prev => !prev);
                    if (!isOverheating) showToast("🔥 Simulasi Panas Berlebih (Overheat) Aktif!", "info");
                  }}
                  className={`py-3 px-4 border text-[11px] font-extrabold rounded-xl transition-all flex justify-between items-center ${
                    isOverheating 
                      ? 'bg-rose-500/10 border-rose-500 text-rose-400' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Simulasikan Overheat (&gt;90°C)</span>
                  <span className={`w-2 h-2 rounded-full ${isOverheating ? 'bg-rose-400 animate-ping' : 'bg-slate-700'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsVibratingKritis(prev => !prev);
                    if (!isVibratingKritis) showToast("📳 Simulasi Getaran Kritis (Vibrasi) Aktif!", "info");
                  }}
                  className={`py-3 px-4 border text-[11px] font-extrabold rounded-xl transition-all flex justify-between items-center ${
                    isVibratingKritis 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Simulasikan Vibrasi Kritis (&gt;60Hz)</span>
                  <span className={`w-2 h-2 rounded-full ${isVibratingKritis ? 'bg-amber-400 animate-ping' : 'bg-slate-700'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPressureDrop(prev => !prev);
                    if (!isPressureDrop) showToast("📉 Simulasi Kebocoran Tekanan Kritis Aktif!", "info");
                  }}
                  className={`py-3 px-4 border text-[11px] font-extrabold rounded-xl transition-all flex justify-between items-center ${
                    isPressureDrop 
                      ? 'bg-red-500/10 border-red-500 text-red-400' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-205'
                  }`}
                >
                  <span>Simulasikan Drop Tekanan (&lt;50 PSI)</span>
                  <span className={`w-2 h-2 rounded-full ${isPressureDrop ? 'bg-red-400 animate-ping' : 'bg-slate-700'}`} />
                </button>

                {(isOverheating || isVibratingKritis || isPressureDrop) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOverheating(false);
                      setIsVibratingKritis(false);
                      setIsPressureDrop(false);
                      showToast("✓ Seluruh sensor dikembalikan ke kondisi normal.", "success");
                    }}
                    className="py-2.5 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    Reset Sensor ke Ideal
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right/Middle column: Canvas Chart & Digital Gauges */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Canvas Graph Visualizer */}
            <div className="bg-slate-950/60 border border-slate-900 p-5 rounded-2xl flex flex-col shadow-lg">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3.5 mb-4">
                <h4 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-indigo-400" />
                  Live Waveform Sensor Visualizer (60fps Canvas)
                </h4>
                <div className="flex items-center gap-4 text-[10px] font-bold font-mono">
                  <span className="flex items-center gap-1.5 text-indigo-450">
                    <span className="w-2.5 h-1 bg-indigo-500 rounded" />
                    Suhu Kerja (°C)
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-1 bg-emerald-500 rounded" />
                    Vibrasi (Hz)
                  </span>
                </div>
              </div>

              {/* HTML5 Canvas Waveform */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900 relative overflow-hidden flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={580}
                  height={220}
                  className="w-full max-w-[580px] h-[220px]"
                />
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-850 flex items-center gap-3 text-[10px] text-slate-400 mt-4">
                <Info className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                <span>Simulasi IoT ini mencerminkan fluktuasi riil secara langsung. Memicu anomali akan mengubah kurva dan memicu Pre-emptive Work Order jika Kesehatan di bawah 70%.</span>
              </div>
            </div>

            {/* Neon Sensor Digital Gauges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
              {/* Suhu Gauge */}
              <div className={`p-4 bg-slate-950/60 border rounded-2xl flex flex-col justify-between h-28.5 transition-all ${
                tempVal > 80 ? 'border-rose-500/35 shadow-[0_0_12px_rgba(244,63,94,0.1)]' : 'border-slate-900'
              }`}>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Temperatur Kerja</span>
                <div className="flex items-baseline justify-between mt-2.5">
                  <h5 className="text-2xl font-black font-mono text-slate-100">{tempVal.toFixed(1)}°C</h5>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-black ${
                    tempVal > 80 ? 'bg-rose-500/10 text-rose-400 animate-pulse' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {tempVal > 80 ? 'OVERHEAT' : 'STABIL'}
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-3">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${tempVal > 80 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                    style={{ width: `${(tempVal / 120) * 100}%` }}
                  />
                </div>
              </div>

              {/* Vibrasi Gauge */}
              <div className={`p-4 bg-slate-950/60 border rounded-2xl flex flex-col justify-between h-28.5 transition-all ${
                vibVal > 45 ? 'border-amber-500/35 shadow-[0_0_12px_rgba(245,158,11,0.1)]' : 'border-slate-900'
              }`}>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Getaran Mesin</span>
                <div className="flex items-baseline justify-between mt-2.5">
                  <h5 className="text-2xl font-black font-mono text-slate-100">{vibVal.toFixed(1)} Hz</h5>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-black ${
                    vibVal > 45 ? 'bg-amber-500/10 text-amber-400 animate-pulse' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {vibVal > 45 ? 'ABNORMAL' : 'STABIL'}
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-3">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${vibVal > 45 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${(vibVal / 90) * 100}%` }}
                  />
                </div>
              </div>

              {/* Tekanan Gauge */}
              <div className={`p-4 bg-slate-950/60 border rounded-2xl flex flex-col justify-between h-28.5 transition-all ${
                pressVal < 60 ? 'border-red-500/35 shadow-[0_0_12px_rgba(239,68,68,0.1)]' : 'border-slate-900'
              }`}>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tekanan Hidrolik</span>
                <div className="flex items-baseline justify-between mt-2.5">
                  <h5 className="text-2xl font-black font-mono text-slate-100">{pressVal.toFixed(0)} PSI</h5>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-black ${
                    pressVal < 60 ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {pressVal < 60 ? 'LOW PRESSURE' : 'NORMAL'}
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-3">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${pressVal < 60 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${(pressVal / 160) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Blast Progress Modal */}
      {isBlastModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-200 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-indigo-400 animate-bounce" />
                Mengeksekusi Blast Perintah Kerja
              </h3>
              {!isBlasting && (
                <button
                  onClick={() => setIsBlastModalOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-300 font-bold"
                >
                  TUTUP
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono font-semibold">
                <span className="text-slate-400">Target: {blastTargetCount} Teknisi Standby</span>
                <span className="text-indigo-400">{blastProgress}%</span>
              </div>
              
              <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-900 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-violet-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${blastProgress}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-xs text-slate-400 font-mono space-y-1 max-h-[120px] overflow-y-auto">
              <div>[SYSTEM] Menyiapkan payload arq queue...</div>
              {blastProgress >= 20 && <div>[QUEUE] Menghubungi Firebase Cloud Messaging (FCM)...</div>}
              {blastProgress >= 60 && <div>[FCM] Menghubungi VAPID fallback push system...</div>}
              {blastProgress >= 80 && <div>[FCM] 8 Perintah kerja terkirim.</div>}
              {blastProgress === 100 && <div className="text-emerald-400 font-bold">[COMPLETE] Blast Job selesai asinkron!</div>}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}