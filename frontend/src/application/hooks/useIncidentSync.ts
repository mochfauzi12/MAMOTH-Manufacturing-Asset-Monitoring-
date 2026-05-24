import { useEffect, useState } from 'react';
import { db } from '../../adapters/db/dexie';
import { useIncidentStore } from '../store/incident.store';
import { useUIStore } from '../store/ui.store';

export function useIncidentSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const addIncidentToGlobalStore = useIncidentStore(state => state.addIncident);
  const addAuditLog = useIncidentStore(state => state.addAuditLog);
  const showToast = useUIStore(state => state.showToast);

  const syncOfflineIncidents = async () => {
    const pendingIncidents = await db.incidents.where('syncStatus').equals('pending_sync').toArray();
    if (pendingIncidents.length === 0) return;

    setIsSyncing(true);
    showToast(`Menyinkronkan ${pendingIncidents.length} laporan offline...`, 'info');

    // Simulate Network latency
    setTimeout(async () => {
      for (const localInc of pendingIncidents) {
        // Generate Server UUID and ticket details
        const serverUuid = 'srv-' + Math.random().toString(36).substr(2, 9);
        const ticketNumber = 'INC-SYNC-' + new Date().toISOString().substring(0,10).replace(/-/g,'') + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        
        // Update Dexie to synced
        await db.incidents.update(localInc.id!, {
          syncStatus: 'synced',
          serverUuid: serverUuid,
          ticketNumber: ticketNumber,
          syncedAt: new Date(),
        });

        // Add to Zustand store for supervisor real-time updates
        addIncidentToGlobalStore({
          id: serverUuid,
          ticketNumber: ticketNumber,
          machineId: localInc.machineId,
          reportedById: localInc.reportedBy,
          incidentType: localInc.incidentType,
          description: localInc.description,
          urgency: localInc.urgency,
          status: 'PENDING_DISPATCH',
          photoUrls: [],
          createdAt: localInc.createdAt.toISOString(),
        });

        addAuditLog(ticketNumber, 'System Background Reconciliation', 'Offline Incident Synchronized successfully');
      }

      setIsSyncing(false);
      showToast('Sinkronisasi data offline selesai!', 'success');
    }, 2500);
  };

  useEffect(() => {
    const handleOnline = () => {
      syncOfflineIncidents();
    };

    window.addEventListener('online', handleOnline);
    // Trigger immediately in case we start online
    if (navigator.onLine) {
      syncOfflineIncidents();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { isSyncing, syncOfflineIncidents };
}