
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
  status: 'active' | 'alumni' | 'discharged';
  assignedBedId: string | null;
  assignedHouseId: string | null;
  checkInLogs: CheckInLog[];
  drugTestLogs: DrugTestLog[];
  dischargeRecord?: DischargeRecord;
  password?: string;
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

export type ViewState = 'LANDING' | 'INTAKE' | 'ADMIN_DASHBOARD' | 'CLIENT_PORTAL';
export type AdminTab = 'HOUSES' | 'CLIENTS' | 'AI_REPORT';