export type IncidentSeverity = 'High' | 'Medium' | 'Low';
export type IncidentStatus = 'Pending' | 'Verified' | 'Rejected' | 'Resolved';
export type ResponseStatus = 'Dispatched' | 'Acknowledged' | 'On Scene' | 'Completed' | 'Cancelled';
export type AlertSeverity = 'info' | 'warning' | 'emergency';

export type Incident = {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: IncidentSeverity;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm: number;
  createdAt: string;
  updatedAt?: string;
  status: IncidentStatus;
  reporterId?: string;
  confidenceLevel?: 'High' | 'Medium' | 'Low';
  confidenceReason?: string;
};

export type AuditLog = {
  id: string;
  incidentId: string;
  eventType: string;
  previousStatus?: string;
  newStatus?: string;
  actorId?: string;
  note?: string;
  createdAt: string;
};

export type ResponseRecord = {
  id: string;
  incidentId: string;
  assignedTo: string | null;
  status: ResponseStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IncidentEvidence = {
  id: string;
  incidentId: string;
  uploadedBy?: string;
  filePath: string;
  fileType: string;
  createdAt: string;
};

export type AlertItem = {
  id: string;
  title: string;
  body: string;
  severity: AlertSeverity;
  createdAt: string;
};

export type Profile = {
  name: string;
  email: string;
  role?: 'citizen' | 'operator' | 'admin';
  notificationRadiusKm: number;
  alertsEnabled: boolean;
  smsBackupEnabled: boolean;
};
