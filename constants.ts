
import { House, Client, CheckInType } from './types';

export const ADMIN_PASSWORD = 'admin';

// Helper to create beds
const createBeds = (count: number, startNum: number = 1) => 
  Array.from({ length: count }, (_, i) => ({
    id: `b-${Math.random().toString(36).substr(2, 9)}`,
    number: `${startNum + i}`,
    occupantId: null
  }));

export const MOCK_HOUSES: House[] = [
  {
    id: 'h_elberta',
    name: 'Elberta House',
    address: '319 Elberta St. Nashville, TN 37210',
    image: 'https://picsum.photos/800/600?random=1',
    rooms: Array.from({ length: 7 }, (_, i) => ({
      id: `r-elberta-${i+1}`,
      name: `Room ${i+1}`,
      beds: createBeds(2, 1) // 2 beds per room
    }))
  },
  {
    id: 'h_thunderbird',
    name: 'Thunderbird House',
    address: '6536 Thunderbird Dr. Nashville, TN 37209',
    image: 'https://picsum.photos/800/600?random=2',
    rooms: [
      { id: 'r-tb-1', name: 'Room 1', beds: createBeds(1, 1) },
      { id: 'r-tb-2', name: 'Room 2', beds: createBeds(1, 1) },
      { id: 'r-tb-3', name: 'Room 3', beds: createBeds(4, 1) },
      { id: 'r-tb-4', name: 'Room 4', beds: createBeds(2, 1) },
      { id: 'r-tb-5', name: 'Room 5', beds: createBeds(2, 1) },
      { id: 'r-tb-6', name: 'Room 6', beds: createBeds(3, 1) }
    ]
  }
];

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    targetHouseId: 'h_elberta',
    firstName: 'John',
    lastName: 'Doe',
    age: '33',
    dob: '1990-05-15',
    phone: '555-0100',
    email: 'john@example.com',
    dlNumber: 'D1234567',
    dlState: 'CA',
    dlExpiration: '2025-01-01',
    
    emergencyName: 'Jane Doe',
    emergencyPhone: '555-0123',
    emergencyAddress: '789 Pine St',
    
    doctorName: 'Dr. Smith',
    doctorPhone: '555-9999',
    doctorAddress: 'Medical Center',
    allergies: 'Peanuts',
    
    hasOverdosed: true,
    overdoseCount: '2',
    overdoseDates: '2020, 2021',
    hasAttemptedSuicide: false,
    suicideCount: '',
    suicideDates: '',
    
    hasFelony: false,
    felonyExplanation: '',
    isSexOffender: false,
    hasAssaultCharges: false,
    assaultExplanation: '',
    isSpecializedCourt: true,
    specializedCourtName: 'Drug Court',
    onParoleProbation: true,
    paroleExplanation: 'Probation for DUI',
    paroleOfficerName: 'Officer Jones',
    paroleOfficerPhone: '555-5555',
    hasPendingCharges: false,
    pendingChargesExplanation: '',
    
    comments: 'Motivated to recover.',
    medications: [],
    
    agreementCommunity: true,
    signatureCommunity: 'John Doe',
    agreementLiability: true,
    agreementCovid: true,
    agreementProperty: true,
    signatureFinal: 'John Doe',
    
    soberDate: '2023-10-01',
    submissionDate: '2023-10-05',
    
    status: 'active',
    assignedHouseId: 'h_elberta',
    assignedBedId: null, // Needs to be linked to a real bed ID in init
    checkInLogs: [
      {
        id: 'l1',
        clientId: 'c1',
        type: CheckInType.HOUSE,
        timestamp: Date.now() - 86400000, // Yesterday
        location: { lat: 36.1627, lng: -86.7816 },
        locationName: 'Home',
        comment: 'Back from work'
      }
    ],
    drugTestLogs: [],
    password: 'password' // Default password
  }
];