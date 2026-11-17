export type LeadStatus =
  | 'Interested'
  | 'Follow-up Needed'
  | 'Policy Done'
  | 'Not Interested';

export type LicPlan =
  | ''
  | 'Jeevan Labh'
  | 'Jeevan Umang'
  | 'Children Plan'
  | 'Term Insurance'
  | 'Pension / Other';

export type FilterTab = 'all' | 'today' | 'high' | 'done';

export interface VisitHistoryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO timestamp
  note: string;
  conversionChance: number;
  status: LeadStatus;
}

export interface LeadLocation {
  lat: number;
  lng: number;
  capturedAt?: string;
}

export interface Lead {
  id: string;
  name: string;
  mobile: string;
  village: string;
  ageOccupation: string;
  visitDate: string; // YYYY-MM-DD
  notes: string;
  conversionChance: number; // 0 - 100
  status: LeadStatus;
  plan: LicPlan;
  nextFollowUp: string; // YYYY-MM-DD or ''
  location?: LeadLocation | null;
  lastContactedAt?: string | null;
  lastContactMethod?: 'Call' | 'WhatsApp' | null;
  history: VisitHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface BackupPayload {
  app: string;
  agency: string;
  exportedAt: string;
  version: number;
  leads: Lead[];
}
