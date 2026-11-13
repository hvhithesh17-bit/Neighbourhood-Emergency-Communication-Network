import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Read Firebase configuration from environment variables with fallback
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBGdUoDSCkZffUpf0W-x7VbFG4t-K5940E",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "necn-emergency-network.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "necn-emergency-network",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "necn-emergency-network.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "427069580424",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:427069580424:web:a713f38efede2777c56b3d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-4HMV2Y23C6",
};

// Check whether configuration values are available
const missingValues = Object.entries(firebaseConfig)
  .filter(([k, value]) => !value && k !== "measurementId")
  .map(([key]) => key);

if (missingValues.length > 0) {
  console.error(
    `Missing Firebase configuration: ${missingValues.join(", ")}. Check your .env file.`
  );
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore for Real-Time Cross-Device Communication
export const db = getFirestore(app);

export default app;
