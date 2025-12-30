import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBv5a-ttiM69ivcCgCN8WKdz5MMp2_U2Iw",
  authDomain: "foodaid-9d265.firebaseapp.com",
  projectId: "foodaid-9d265",
  storageBucket: "foodaid-9d265.firebasestorage.app",
  messagingSenderId: "563755773205",
  appId: "1:563755773205:web:be8d1d32cc4d2ca3d58d1c",
  measurementId: "G-WKTXH4CKZL"
};

// Initialize App (prevent duplicate initialization on hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;

try {
  // Attempt to initialize Auth with React Native persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (error) {
  // If Auth is already initialized (e.g., during hot reloads), use the existing instance
  auth = getAuth(app);
}

// Named export to match 'import { auth }' in your hooks
export { auth };