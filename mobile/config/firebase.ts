import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence, Auth, getAuth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "foodaid-9d265.firebaseapp.com",
  projectId: "foodaid-9d265",
  storageBucket: "foodaid-9d265.firebasestorage.app",
  messagingSenderId: "563755773205",
  appId: "1:563755773205:web:be8d1d32cc4d2ca3d58d1c",
  measurementId: "G-WKTXH4CKZL"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
let storage: FirebaseStorage;

try {
  // Initialize Auth with persistence
  if (Platform.OS !== 'web' && typeof getReactNativePersistence === 'function') {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
  } else {
    auth = getAuth(app);
  }
} catch (error) {
  console.warn("Firebase Auth persistence initialization failed, falling back to default:", error);
  auth = getAuth(app);
}

// Initialize Storage
storage = getStorage(app);

export { auth, storage };