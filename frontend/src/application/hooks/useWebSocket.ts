import { useEffect } from 'react';
import { useIncidentStore } from '../store/incident.store';
import { useUIStore } from '../store/ui.store';

export function useWebSocketSimulation() {
  const addIncident = useIncidentStore(state => state.addIncident);
  const addAuditLog = useIncidentStore(state => state.addAuditLog);
  const showToast = useUIStore(state => state.showToast);

  useEffect(() => {
    // Simulate WebSocket incoming ticket from other operator every 3 minutes
    const interval = setInterval(() => {
      const machines = ['Press Machine B1', 'Hydraulic Pump C', 'Extruder A2'];
      const details = ['Terjadi penurunan tekanan kompresi tiba-tiba.', 'Suhu motor penggerak melonjak melebihi batas aman.', 'Keretakan kecil di dekat katup pembuangan gas.'];
      const urgencies: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[] = ['MEDIUM', 'HIGH', 'CRITICAL'];
      const types = ['Hidrolik', 'Suhu Tinggi', 'Mekanik'];
      
      const randIndex = Math.floor(Math.random() * machines.length);
      const ticketNumber = 'INC-LIVE-' + Math.random().toString(36).substr(2, 5).toUpperCase();
      
      const liveIncident = {
        id: 'live-' + Math.random().toString(36).substr(2, 9),
        ticketNumber: ticketNumber,
        machineId: 'm-' + (randIndex + 1),
        reportedById: 'usr-op-live',
        incidentType: types[randIndex],
        description: `[WS Broadcast] ${machines[randIndex]}: ${details[randIndex]}`,
        urgency: urgencies[randIndex],
        status: 'PENDING_DISPATCH' as const,
        photoUrls: [],
        createdAt: new Date().toISOString()
      };

      addIncident(liveIncident);
      addAuditLog(ticketNumber, 'WebSocket Live Stream', 'Tiket Baru Masuk dari Operator Lantai Pabrik');
      
      // Play system alert sound for high/critical tickets
      if (urgencies[randIndex] === 'CRITICAL' || urgencies[randIndex] === 'HIGH') {
        showToast(`⚠️ [WS TIKET BARU] ${machines[randIndex]} berstatus ${urgencies[randIndex]}!`, 'error');
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');
          audio.volume = 0.4;
          audio.play();
        } catch (e) {
          console.log('Audio alert blocked by user interaction restrictions');
        }
      } else {
        showToast(`🆕 [WS TIKET BARU] Tiket masuk dari ${machines[randIndex]}`, 'info');
      }

    }, 180000); // 3 Minutes

    return () => clearInterval(interval);
  }, []);
}