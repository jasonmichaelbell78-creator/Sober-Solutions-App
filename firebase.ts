import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC_k3aLBZa868fKP79UJ5XRG1b48urwKKg",
  authDomain: "sober-solutions-app.firebaseapp.com",
  projectId: "sober-solutions-app",
  storageBucket: "sober-solutions-app.firebasestorage.app",
  messagingSenderId: "137126878762",
  appId: "1:137126878762:web:dccf0ab737b1e23c2ded53"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore Database
export const db = getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

export default app;
