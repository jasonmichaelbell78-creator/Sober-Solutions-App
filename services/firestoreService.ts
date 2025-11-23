import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { House, Client, CheckInLog, DrugTestLog, Chore, ChoreCompletion } from '../types';

// Collection names
const HOUSES_COLLECTION = 'houses';
const CLIENTS_COLLECTION = 'clients';
const CHORES_COLLECTION = 'chores';

// ============================================
// HOUSES CRUD OPERATIONS
// ============================================

/**
 * Initialize houses in Firestore (run once on first setup)
 */
export const initializeHouses = async (houses: House[]) => {
  const batch = writeBatch(db);

  houses.forEach(house => {
    const houseRef = doc(db, HOUSES_COLLECTION, house.id);
    batch.set(houseRef, house);
  });

  await batch.commit();
  console.log('Houses initialized in Firestore');
};

/**
 * Get all houses (one-time fetch)
 */
export const getHouses = async (): Promise<House[]> => {
  const housesSnapshot = await getDocs(collection(db, HOUSES_COLLECTION));
  return housesSnapshot.docs.map(doc => doc.data() as House);
};

/**
 * Listen to houses changes in real-time
 */
export const subscribeToHouses = (callback: (houses: House[]) => void) => {
  const housesQuery = query(collection(db, HOUSES_COLLECTION));

  return onSnapshot(housesQuery, (snapshot) => {
    const houses = snapshot.docs.map(doc => doc.data() as House);
    callback(houses);
  });
};

/**
 * Update a specific house
 */
export const updateHouse = async (houseId: string, updates: Partial<House>) => {
  const houseRef = doc(db, HOUSES_COLLECTION, houseId);
  await updateDoc(houseRef, updates);
};

/**
 * Update entire house (for room/bed changes)
 */
export const setHouse = async (house: House) => {
  const houseRef = doc(db, HOUSES_COLLECTION, house.id);
  await setDoc(houseRef, house);
};

// ============================================
// CLIENTS CRUD OPERATIONS
// ============================================

/**
 * Initialize clients in Firestore (run once on first setup)
 */
export const initializeClients = async (clients: Client[]) => {
  const batch = writeBatch(db);

  clients.forEach(client => {
    const clientRef = doc(db, CLIENTS_COLLECTION, client.id);
    batch.set(clientRef, {
      ...client,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  });

  await batch.commit();
  console.log('Clients initialized in Firestore');
};

/**
 * Create a new client (from intake form)
 */
export const createClient = async (client: Client): Promise<string> => {
  const clientRef = doc(db, CLIENTS_COLLECTION, client.id);
  await setDoc(clientRef, {
    ...client,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return client.id;
};

/**
 * Get all clients (one-time fetch)
 */
export const getClients = async (): Promise<Client[]> => {
  const clientsSnapshot = await getDocs(collection(db, CLIENTS_COLLECTION));
  return clientsSnapshot.docs.map(doc => {
    const data = doc.data();
    // Remove Firestore timestamps before returning
    const { createdAt, updatedAt, ...clientData } = data;
    return clientData as Client;
  });
};

/**
 * Listen to clients changes in real-time
 */
export const subscribeToClients = (callback: (clients: Client[]) => void) => {
  const clientsQuery = query(
    collection(db, CLIENTS_COLLECTION),
    orderBy('submissionDate', 'desc')
  );

  return onSnapshot(clientsQuery, (snapshot) => {
    const clients = snapshot.docs.map(doc => {
      const data = doc.data();
      const { createdAt, updatedAt, ...clientData } = data;
      return clientData as Client;
    });
    callback(clients);
  });
};

/**
 * Get a single client by ID
 */
export const getClient = async (clientId: string): Promise<Client | null> => {
  const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
  const clientSnap = await getDoc(clientRef);

  if (clientSnap.exists()) {
    const data = clientSnap.data();
    const { createdAt, updatedAt, ...clientData } = data;
    return clientData as Client;
  }
  return null;
};

/**
 * Update a client
 */
export const updateClient = async (clientId: string, updates: Partial<Client>) => {
  const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
  await updateDoc(clientRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
};

/**
 * Set entire client (for complex updates)
 */
export const setClient = async (client: Client) => {
  const clientRef = doc(db, CLIENTS_COLLECTION, client.id);
  await setDoc(clientRef, {
    ...client,
    updatedAt: Timestamp.now()
  }, { merge: true });
};

/**
 * Delete a client (use carefully - prefer to mark as discharged instead)
 */
export const deleteClient = async (clientId: string) => {
  const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
  await deleteDoc(clientRef);
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Add check-in log to a client
 */
export const addCheckInLog = async (clientId: string, log: CheckInLog) => {
  const client = await getClient(clientId);
  if (!client) throw new Error('Client not found');

  const updatedLogs = [...(client.checkInLogs || []), log];
  await updateClient(clientId, { checkInLogs: updatedLogs });
};

/**
 * Add drug test log to a client
 */
export const addDrugTestLog = async (clientId: string, log: DrugTestLog) => {
  const client = await getClient(clientId);
  if (!client) throw new Error('Client not found');

  const updatedLogs = [...(client.drugTestLogs || []), log];
  await updateClient(clientId, { drugTestLogs: updatedLogs });
};

/**
 * Get client by email (for resident login)
 */
export const getClientByEmail = async (email: string): Promise<Client | null> => {
  const clients = await getClients();
  return clients.find(c => c.email.toLowerCase() === email.toLowerCase()) || null;
};

/**
 * Check if houses collection is empty (for first-time setup)
 */
export const isHousesCollectionEmpty = async (): Promise<boolean> => {
  const housesSnapshot = await getDocs(collection(db, HOUSES_COLLECTION));
  return housesSnapshot.empty;
};

/**
 * Check if clients collection is empty
 */
export const isClientsCollectionEmpty = async (): Promise<boolean> => {
  const clientsSnapshot = await getDocs(collection(db, CLIENTS_COLLECTION));
  return clientsSnapshot.empty;
};

// ============================================
// CHORES CRUD OPERATIONS
// ============================================

/**
 * Create a new chore
 */
export const createChore = async (chore: Chore): Promise<string> => {
  const choreRef = doc(db, CHORES_COLLECTION, chore.id);
  await setDoc(choreRef, {
    ...chore,
    createdAt: chore.createdAt || new Date().toISOString(),
    updatedAt: Timestamp.now()
  });
  return chore.id;
};

/**
 * Get all chores (one-time fetch)
 */
export const getChores = async (): Promise<Chore[]> => {
  const choresSnapshot = await getDocs(collection(db, CHORES_COLLECTION));
  return choresSnapshot.docs.map(doc => {
    const data = doc.data();
    const { updatedAt, ...choreData } = data;
    return choreData as Chore;
  });
};

/**
 * Listen to chores changes in real-time
 */
export const subscribeToChores = (callback: (chores: Chore[]) => void) => {
  const choresQuery = query(
    collection(db, CHORES_COLLECTION),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(choresQuery, (snapshot) => {
    const chores = snapshot.docs.map(doc => {
      const data = doc.data();
      const { updatedAt, ...choreData } = data;
      return choreData as Chore;
    });
    callback(chores);
  });
};

/**
 * Get a single chore by ID
 */
export const getChore = async (choreId: string): Promise<Chore | null> => {
  const choreRef = doc(db, CHORES_COLLECTION, choreId);
  const choreSnap = await getDoc(choreRef);

  if (choreSnap.exists()) {
    const data = choreSnap.data();
    const { updatedAt, ...choreData } = data;
    return choreData as Chore;
  }
  return null;
};

/**
 * Update a chore
 */
export const updateChore = async (choreId: string, updates: Partial<Chore>) => {
  const choreRef = doc(db, CHORES_COLLECTION, choreId);
  await updateDoc(choreRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
};

/**
 * Set entire chore (for complex updates)
 */
export const setChore = async (chore: Chore) => {
  const choreRef = doc(db, CHORES_COLLECTION, chore.id);
  await setDoc(choreRef, {
    ...chore,
    updatedAt: Timestamp.now()
  }, { merge: true });
};

/**
 * Delete a chore
 */
export const deleteChore = async (choreId: string) => {
  const choreRef = doc(db, CHORES_COLLECTION, choreId);
  await deleteDoc(choreRef);
};

/**
 * Add completion to a chore
 */
export const addChoreCompletion = async (choreId: string, completion: ChoreCompletion) => {
  const chore = await getChore(choreId);
  if (!chore) throw new Error('Chore not found');

  const updatedCompletions = [...(chore.completions || []), completion];
  await updateChore(choreId, {
    completions: updatedCompletions,
    status: 'completed'
  });
};

// ============================================
// SETTINGS CRUD OPERATIONS
// ============================================

const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOC_ID = 'app-settings';

export interface AppSettings {
  adminPassword?: string;
}

/**
 * Get app settings
 */
export const getSettings = async (): Promise<AppSettings> => {
  const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
  const settingsSnap = await getDoc(settingsRef);

  if (settingsSnap.exists()) {
    return settingsSnap.data() as AppSettings;
  }
  return {};
};

/**
 * Update app settings
 */
export const updateSettings = async (settings: Partial<AppSettings>) => {
  const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
  await setDoc(settingsRef, settings, { merge: true });
};
