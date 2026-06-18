import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getDatabase, Database } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

let app: FirebaseApp;
let auth: Auth;
let database: Database;
let isConfigured = false;

// Check if critical configurations exist
const hasFirebaseKeys = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_DATABASE_URL
);

try {
  if (hasFirebaseKeys) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    database = getDatabase(app);
    isConfigured = true;
    console.log("Firebase initialized successfully with Realtime Database.");
  } else {
    console.warn("Firebase environment variables are missing. Using fallback/in-memory authentication.");
    // Initialize anyway with dummy strings to prevent build-time crashes
    const dummyConfig = {
      apiKey: "dummy-key-saveetha-simats-portal-security",
      authDomain: "dummy-domain.firebaseapp.com",
      databaseURL: "https://dummy-db.firebaseio.com",
      projectId: "dummy-project",
      storageBucket: "dummy-bucket.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:abcdef"
    };
    app = getApps().length === 0 ? initializeApp(dummyConfig) : getApp();
    auth = getAuth(app);
    database = getDatabase(app);
  }
} catch (error) {
  console.error("Firebase critical initialization failed:", error);
  // Ensure non-null exports to prevent runtime import references from crashing
  app = {} as any;
  auth = {} as any;
  database = {} as any;
}

export { app, auth, database, isConfigured };
