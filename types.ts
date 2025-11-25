
export enum Role {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT',
  GUEST = 'GUEST'
}

export enum CheckInType {
  HOUSE = 'HOUSE',
  MEETING = 'MEETING'
}

export interface Bed {
  id: string;
  number: string;
  occupantId: string | null;
}

export interface Room {
  id: string;
  name: string;
  beds: Bed[];
}

export interface House {
  id: string;
  name: string;
  address: string;
  rooms: Room[];
  image: string;
}

export interface MedicationItem {
  name: string;
  dose: string;
  doctor: string;
  contact: string;
  reason: string;
}

export interface DrugTestLog {
  id: string;
  date: string;
  result: 'Negative' | 'Positive';
  type: 'Instant' | 'Lab';
  notes: string;
  performedBy: string;
}

export interface DischargeRecord {
  date: string;
  type: 'Voluntary' | 'Involuntary' | 'Successful Completion' | 'Medical' | 'Transfer';
  reason: string;
  notes: string;
  forwardingAddress: string;
}

export interface IntakeForm {
  // Application Info
  targetHouseId: string;

  // Personal Info
  firstName: string;
  lastName: string;
  age: string;
  dob: string;
  phone: string;
  email: string;
  dlNumber: string;
  dlState: string;
  dlExpiration: string;

  // Emergency Contact
  emergencyName: string;
  emergencyPhone: string;
  emergencyAddress: string;

  // Medical
  doctorName: string;
  doctorPhone: string;
  doctorAddress: string;
  allergies: string;
  
  // History Checks
  hasOverdosed: boolean;
  overdoseCount: string;
  overdoseDates: string;
  
  hasAttemptedSuicide: boolean;
  suicideCount: string;
  suicideDates: string;

  // Legal
  hasFelony: boolean;
  felonyExplanation: string;
  isSexOffender: boolean;
  hasAssaultCharges: boolean;
  assaultExplanation: string;
  isSpecializedCourt: boolean; // DUI, Drug, Mental Health, Veteran
  specializedCourtName: string;
  onParoleProbation: boolean;
  paroleExplanation: string;
  paroleOfficerName: string;
  paroleOfficerPhone: string;
  hasPendingCharges: boolean;
  pendingChargesExplanation: string;

  // Additional
  comments: string;

  // Medication
  medications: MedicationItem[];

  // Signatures / Agreements
  signatureCommunity: string; // Signature for Rules (Page 2-3)
  agreementCommunity: boolean; 
  
  agreementLiability: boolean; // Page 7
  agreementCovid: boolean; // Page 8
  agreementProperty: boolean; // Page 9
  signatureFinal: string; // Signature for final docs

  soberDate: string;
  submissionDate: string;
}

export interface Client extends IntakeForm {
  id: string;
  status: 'pending' | 'active' | 'alumni' | 'discharged';
  assignedBedId: string | null;
  assignedHouseId: string | null;
  checkInLogs: CheckInLog[];
  drugTestLogs: DrugTestLog[];
  notes?: Note[];
  dischargeRecord?: DischargeRecord;
  password?: string;
  profilePhotoUrl?: string; // Base64 data URL or external URL
}

export interface Note {
  id: string;
  date: string;
  author: string; // Admin name or user ID
  content: string;
  category?: 'General' | 'Medical' | 'Behavioral' | 'Progress' | 'Incident';
}

export interface CheckInLog {
  id: string;
  clientId: string;
  type: CheckInType;
  timestamp: number;
  location: {
    lat: number;
    lng: number;
  };
  locationName: string; // User entered location name
  comment: string;      // User entered comment
  notes?: string;       // System notes
}

export interface ChoreCompletion {
  id: string;
  completedAt: string;
  completedBy: string; // Client ID
  photoUrl?: string; // Optional photo proof
  notes?: string;
}

export interface Chore {
  id: string;
  title: string;
  description: string;
  assignedTo: string[]; // Array of client IDs
  createdBy: string; // Admin name
  createdAt: string;
  dueDate?: string; // Optional due date
  recurring: boolean; // If true, chore repeats until reassigned
  recurrenceType?: number; // How often it recurs (1-7 days)
  reminderTime?: string; // Time of day for reminder (24h format, e.g., "18:00")
  completions: ChoreCompletion[]; // History of completions
  status: 'pending' | 'completed' | 'overdue';
  houseId?: string; // Optional: chore specific to a house
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: 'approved' | 'admitted' | 'discharged' | 'transferred' | 'deleted' | 'updated' | 'created';
  entityType: 'resident' | 'house' | 'chore' | 'settings';
  entityId: string;
  entityName: string; // Resident name, house name, etc.
  details?: string; // Additional context (e.g., "Transferred from House A to House B")
  performedBy: 'admin'; // Simple version - just track as 'admin'
}

export type ViewState = 'LANDING' | 'INTAKE' | 'ADMIN_DASHBOARD' | 'CLIENT_PORTAL';
export type AdminTab = 'HOUSES' | 'CLIENTS' | 'AI_REPORT' | 'CHORES' | 'SETTINGS' | 'BULK_OPERATIONS' | 'ANALYTICS' | 'EXPORT' | 'ACTIVITY_LOG' | 'CALENDAR';