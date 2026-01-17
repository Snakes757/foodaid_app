// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence, Auth, getAuth } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from "react-native";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBNn5LIoDMD8dqujqy_fgLC1hqXPh0JYFI",
  authDomain: "foodaid-9d265.firebaseapp.com",
  projectId: "foodaid-9d265",
  storageBucket: "foodaid-9d265.firebasestorage.app",
  messagingSenderId: "563755773205",
  appId: "1:563755773205:web:be8d1d32cc4d2ca3d58d1c",
  measurementId: "G-WKTXH4CKZL"
};

// 1. Initialize App (Check if already initialized to prevent hot-reload crashes)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;

// 2. Initialize Auth with Safe Persistence Check
try {
  // Check if we are in a proper React Native environment where the persistence helper exists
  if (Platform.OS !== 'web' && typeof getReactNativePersistence === 'function') {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
  } else {
    // Fallback for Web or Build environments (Node.js) where RN persistence fails
    auth = getAuth(app);
  }
} catch (error) {
  // If anything fails (e.g., specific version mismatch), fallback to default auth
  console.warn("Firebase Auth persistence initialization failed, falling back to default:", error);
  auth = getAuth(app);
}

export { auth };