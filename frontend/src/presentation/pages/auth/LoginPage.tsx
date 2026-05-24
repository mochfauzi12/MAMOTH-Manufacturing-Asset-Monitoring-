import React, { useState, useEffect } from 'react';
import { AuthLayout } from '../../layouts/AuthLayout';
import { useAuthStore } from '../../../application/store/auth.store';
import { useUserStore } from '../../../application/store/user.store';
import { Shield, User, Keyboard, Eye, EyeOff, Wifi, Smartphone, Loader2, CheckCircle } from 'lucide-react';

export function LoginPage() {
  const { login, loginWithPin } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'PORTAL' | 'PIN'>('PORTAL');
  
  // Standard Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // PIN Tablet operator state
  const { employees } = useUserStore();
  const operators = employees.filter(e => e.role === 'OPERATOR');
  const [pin, setPin] = useState('');
  const [operatorName, setOperatorName] = useState('Budi Setiawan');

  // NFC Scanner States
  const [nfcState, setNfcState] = useState<'IDLE' | 'SCANNING' | 'SUCCESS'>('IDLE');
  const [nfcCardId, setNfcCardId] = useState('');

  // Handle Real Web NFC API
  useEffect(() => {
    let ndef: any = null;
    let controller = new AbortController();

    const startNfcScanning = async () => {
      if ('NDEFReader' in window) {
        try {
          // @ts-ignore
          ndef = new NDEFReader();
          await ndef.scan({ signal: controller.signal });
          
          ndef.onreading = (event: any) => {
            setNfcState('SCANNING');
            setNfcCardId(event.serialNumber || 'NFC-55AA99BB');
            
            setTimeout(() => {
              setNfcState('SUCCESS');
              setTimeout(() => {
                loginWithPin("123456", "Budi Setiawan");
              }, 800);
            }, 1000);
          };
        } catch (err) {
          console.warn("NFC scanning failed to initialize:", err);
        }
      }
    };

    if (activeTab === 'PIN') {
      startNfcScanning();
    }

    return () => {
      controller.abort();
    };
  }, [activeTab]);

  // Handle Simulated NFC Scan (Developer Sandbox tool)
  const handleSimulatedNfcTap = () => {
    setNfcState('SCANNING');
    setNfcCardId('NFC-MOCK-' + Math.random().toString(36).substring(2, 7).toUpperCase());

    // 1.2 seconds reading time
    setTimeout(() => {
      setNfcState('SUCCESS');
      
      // 0.8 seconds verified confirmation screen then auto logs in
      setTimeout(() => {
        loginWithPin("123456", "Budi Setiawan");
      }, 800);
    }, 1200);
  };

  const handlePortalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    const role = (email.toLowerCase().includes('tech') || email.toLowerCase().includes('teknisi')) 
      ? 'TECHNICIAN' 
      : 'SUPERVISOR';
      
    login(email, role);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return;
    loginWithPin(pin, operatorName);
  };

  const handleKeypadPress = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
    }
  };

  const handleKeypadBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <AuthLayout>
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center space-y-2 mb-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-1">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-3xl font-black text-slate-100 tracking-tight">MAMOTH-Ops</h2>
        <p className="text-xs text-slate-400 max-w-[340px] leading-relaxed">
          Masuk ke Machine Maintenance & Operations Technology Hub
        </p>
      </div>

      {/* Premium High-Contrast Switcher Tabs */}
      <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800/80 rounded-2xl shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('PORTAL')}
          className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            activeTab === 'PORTAL' 
              ? 'bg-indigo-600 text-white font-extrabold shadow-lg shadow-indigo-600/30' 
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/50'
          }`}
        >
          <User className="w-4 h-4 flex-shrink-0" />
          Supervisor / Teknisi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PIN')}
          className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            activeTab === 'PIN' 
              ? 'bg-indigo-600 text-white font-extrabold shadow-lg shadow-indigo-600/30' 
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/50'
          }`}
        >
          <Keyboard className="w-4 h-4 flex-shrink-0" />
          Tablet Operator (PIN)
        </button>
      </div>

      {/* Portal Login */}
      {activeTab === 'PORTAL' && (
        <form onSubmit={handlePortalSubmit} className="space-y-5">
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 tracking-wide">Email Akun</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@pabrik.com"
              className="w-full bg-slate-950/80 border border-slate-850 placeholder:text-slate-600 rounded-xl px-4 py-3.5 text-sm transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-200"
            />
          </div>

          {/* Password field with Eye Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 tracking-wide">Kata Sandi (Password)</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-850 placeholder:text-slate-600 rounded-xl pl-4 pr-12 py-3.5 text-sm transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3.5 top-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors duration-200"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Helper note */}
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900/60 text-[10px] text-slate-500 leading-relaxed">
            💡 <strong>Info Akses:</strong> Sistem mendeteksi otomatis peran Anda (Supervisor Dashboard atau Teknisi PWA) saat Anda masuk berdasarkan hak akses email Anda.
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 active:scale-[0.98] mt-2"
          >
            Masuk ke Sistem
          </button>
        </form>
      )}

      {/* Operator PIN Keypad & NFC Tap Login */}
      {activeTab === 'PIN' && (
        <div className="space-y-5">
          
          {/* ===================================================================== */}
          {/* HIGH-END NFC CARD SCANNER ELEMENT */}
          {/* ===================================================================== */}
          <div className="bg-slate-950/60 border border-indigo-500/30 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 relative overflow-hidden group shadow-lg shadow-indigo-950/20">
            {/* Glowing background aura */}
            <div className="absolute inset-0 bg-indigo-500/5 opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none" />
            
            {/* Multi-state scanner icon */}
            <div className="w-16 h-16 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center relative shadow-md shadow-indigo-500/5">
              {nfcState === 'IDLE' && (
                <>
                  <div className="absolute inset-0 rounded-full border border-indigo-500/30 animate-ping opacity-40" />
                  <Wifi className="w-8 h-8 text-indigo-400 rotate-90" />
                </>
              )}
              {nfcState === 'SCANNING' && (
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              )}
              {nfcState === 'SUCCESS' && (
                <CheckCircle className="w-8 h-8 text-emerald-400 scale-110 transition-transform duration-200" />
              )}
            </div>

            {/* Scanning text description */}
            <div className="text-center space-y-1 z-10">
              {nfcState === 'IDLE' && (
                <>
                  <h4 className="text-sm font-extrabold text-slate-100">Otentikasi Tempel Kartu NFC</h4>
                  <p className="text-[10px] text-slate-400 max-w-[240px]">
                    Dekatkan kartu ID karyawan NFC Anda ke sensor perangkat untuk masuk secara instan.
                  </p>
                </>
              )}
              {nfcState === 'SCANNING' && (
                <>
                  <h4 className="text-sm font-extrabold text-indigo-400 animate-pulse">Membaca Sensor NFC...</h4>
                  <p className="text-[10px] text-indigo-300/70 font-mono tracking-wide">{nfcCardId}</p>
                </>
              )}
              {nfcState === 'SUCCESS' && (
                <>
                  <h4 className="text-sm font-extrabold text-emerald-400">Verifikasi Kartu Berhasil!</h4>
                  <p className="text-[10px] text-emerald-300/80 font-bold">Menghubungkan sesi Budi Setiawan...</p>
                </>
              )}
            </div>

            {/* Sandbox Simulation Trigger */}
            <button
              type="button"
              disabled={nfcState !== 'IDLE'}
              onClick={handleSimulatedNfcTap}
              className="py-1.5 px-3 bg-slate-900 border border-slate-800 hover:border-indigo-500 disabled:opacity-30 disabled:pointer-events-none text-indigo-400 text-[10px] font-black rounded-lg transition-all active:scale-95 flex items-center gap-1.5 shadow-md z-10"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Simulasikan Tempel Kartu (NFC)
            </button>
          </div>

          {/* Fallback Divider */}
          <div className="flex items-center gap-3">
            <div className="h-[1px] bg-slate-900 flex-1" />
            <span className="text-[10px] font-black text-slate-650 tracking-wider">ATAU GUNAKAN PIN</span>
            <div className="h-[1px] bg-slate-900 flex-1" />
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 tracking-wide">Nama Operator</label>
                <select
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-200"
                >
                  {operators.map(op => (
                    <option key={op.id} value={op.fullName}>{op.fullName}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 tracking-wide">Shift Kerja</label>
                <div className="w-full bg-slate-950/40 border border-slate-900/60 text-indigo-400 rounded-xl px-4 py-3 text-sm font-black text-center shadow-inner">
                  {operators.find(o => o.fullName === operatorName)?.shift || 'Pagi (Shift A)'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block text-center tracking-wide">Masukkan 6-Digit PIN Tablet</label>
              <div className="flex justify-center gap-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-xl transition-all duration-150 ${
                      pin[i] 
                        ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 shadow-md shadow-indigo-500/10 scale-105' 
                        : 'bg-slate-950/80 border-slate-850 text-slate-600'
                    }`}
                  >
                    {pin[i] ? '•' : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Large Touch Keypad Overlay */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="h-12 bg-slate-950 border border-slate-850 hover:border-slate-700 text-slate-200 font-extrabold text-lg rounded-xl flex items-center justify-center transition-all duration-100 hover:bg-slate-900/50 active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                className="h-12 text-red-500 hover:text-red-400 text-xs font-black flex items-center justify-center active:scale-95"
              >
                RESET
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-12 bg-slate-950 border border-slate-850 text-slate-200 font-extrabold text-lg rounded-xl flex items-center justify-center hover:bg-slate-900/50 active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="h-12 text-slate-400 hover:text-slate-300 text-xs font-black flex items-center justify-center active:scale-95"
              >
                CLEAR
              </button>
            </div>

            <button
              type="submit"
              disabled={pin.length < 4}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
            >
              Masuk Ke Mode Operator
            </button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
}