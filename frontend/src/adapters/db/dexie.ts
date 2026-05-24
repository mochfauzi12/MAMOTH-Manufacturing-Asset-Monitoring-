import Dexie, { Table } from 'dexie';

export interface LocalIncident {
  id?: number;
  localId: string;
  serverUuid?: string;
  ticketNumber?: string;
  machineId: string;
  machineName: string;
  location: string;
  incidentType: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  reportedBy: string;
  photos?: string[];
  syncStatus: 'pending_sync' | 'syncing' | 'synced' | 'sync_failed';
  createdAt: Date;
  syncedAt?: Date;
  retryCount: number;
  lastError?: string;
}

export interface LocalDraft {
  id?: number;
  draftId: string;
  formData: Partial<LocalIncident>;
  savedAt: Date;
}

class MamothDB extends Dexie {
  incidents!: Table<LocalIncident>;
  drafts!: Table<LocalDraft>;

  constructor() {
    super('MamothOpsDB');
    this.version(1).stores({
      incidents: '++id, localId, ticketNumber, syncStatus, urgency, createdAt',
      drafts:    '++id, draftId, savedAt'
    });
  }
}

export const db = new MamothDB();
