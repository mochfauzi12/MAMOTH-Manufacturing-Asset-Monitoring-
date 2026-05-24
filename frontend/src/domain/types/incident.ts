export type IncidentUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'PENDING_DISPATCH' | 'DISPATCHED_MASSAL' | 'UNDER_REPAIR' | 'RESOLVED' | 'CANCELLED';

export interface Incident {
  id: string;
  ticketNumber: string;
  machineId: string;
  reportedById: string;
  incidentType: string;
  description: string;
  urgency: IncidentUrgency;
  status: IncidentStatus;
  photoUrls: string[];
  resolvedNote?: string;
  cancelNote?: string;
  area?: string; // Production assembly line area
  localId?: string;
  clientTimestamp?: string;
  createdAt: string;
  dispatchedAt?: string;
  acceptedAt?: string;
  resolvedAt?: string;
  cancelledAt?: string;
  mttrMinutes?: number;
  responseTimeMin?: number;
  isVerified?: boolean;
  verificationNote?: string;
  verifiedAt?: string;
}
