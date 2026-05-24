import { create } from 'zustand';
import { Incident } from '../../domain/types/incident';

interface IncidentState {
  incidents: Incident[];
  activeTicketCount: number;
  mttrAverage: number;
  technicianStats: { online: number; standby: number; onDuty: number };
  auditLogs: { id: string; ticketNumber: string; actor: string; action: string; timestamp: string }[];
  
  setIncidents: (incidents: Incident[]) => void;
  addIncident: (incident: Incident) => void;
  updateIncidentStatus: (id: string, status: Incident['status'], assignedTech?: string, note?: string) => void;
  addAuditLog: (ticketNumber: string, actor: string, action: string) => void;
}

export const useIncidentStore = create<IncidentState>((set, get) => ({
  incidents: [
    {
      id: 'inc-1',
      ticketNumber: 'INC-20260524-A8F23',
      machineId: 'm-1',
      reportedById: 'usr-op-1',
      incidentType: 'Mekanik',
      description: 'Bearing conveyor utama mengeluarkan bunyi gesekan keras dan bergetar.',
      urgency: 'HIGH',
      status: 'PENDING_DISPATCH',
      photoUrls: [],
      area: 'Area A',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 'inc-2',
      ticketNumber: 'INC-20260524-K2D91',
      machineId: 'm-2',
      reportedById: 'usr-op-2',
      incidentType: 'Kelistrikan',
      description: 'Panel kontrol Extruder A3 sering mendadak mati dan restart otomatis.',
      urgency: 'CRITICAL',
      status: 'DISPATCHED_MASSAL',
      photoUrls: [],
      area: 'Area B',
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'inc-3',
      ticketNumber: 'INC-20260524-L8W10',
      machineId: 'm-3',
      reportedById: 'usr-op-3',
      incidentType: 'Hidrolik',
      description: 'Kebocoran seal oli pada tuas hidrolik mesin Press B1.',
      urgency: 'MEDIUM',
      status: 'UNDER_REPAIR',
      photoUrls: [],
      area: 'Area C',
      createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      acceptedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    }
  ],
  activeTicketCount: 3,
  mttrAverage: 42.5,
  technicianStats: { online: 12, standby: 8, onDuty: 4 },
  auditLogs: [
    { id: '1', ticketNumber: 'INC-20260524-L8W10', actor: 'Supervisor Rina', action: 'Melakukan Blast Tiket', timestamp: new Date(Date.now() - 115 * 60 * 1000).toISOString() },
    { id: '2', ticketNumber: 'INC-20260524-L8W10', actor: 'Teknisi Agus', action: 'Menerima & Mengerjakan Tiket', timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString() },
  ],

  setIncidents: (incidents) => set({ incidents, activeTicketCount: incidents.filter(i => i.status !== 'RESOLVED').length }),
  
  addIncident: (incident) => set((state) => {
    const updated = [incident, ...state.incidents];
    return {
      incidents: updated,
      activeTicketCount: updated.filter(i => i.status !== 'RESOLVED').length
    };
  }),

  updateIncidentStatus: (id, status, assignedTech, note) => set((state) => {
    const updated = state.incidents.map(inc => {
      if (inc.id === id) {
        const changes: Partial<Incident> = { status };
        if (status === 'UNDER_REPAIR') {
          changes.acceptedAt = new Date().toISOString();
        } else if (status === 'RESOLVED') {
          changes.resolvedAt = new Date().toISOString();
          changes.resolvedNote = note;
          // Calculate MTTR dynamically
          const start = new Date(inc.createdAt).getTime();
          const end = Date.now();
          changes.mttrMinutes = (end - start) / (60 * 1000);
        }
        return { ...inc, ...changes };
      }
      return inc;
    });

    return {
      incidents: updated,
      activeTicketCount: updated.filter(i => i.status !== 'RESOLVED').length
    };
  }),

  addAuditLog: (ticketNumber, actor, action) => set((state) => ({
    auditLogs: [{
      id: Math.random().toString(),
      ticketNumber,
      actor,
      action,
      timestamp: new Date().toISOString()
    }, ...state.auditLogs]
  }))
}));