// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBv5a-ttiM69ivcCgCN8WKdz5MMp2_U2Iw",
  authDomain: "foodaid-9d265.firebaseapp.com",
  projectId: "foodaid-9d265",
  storageBucket: "foodaid-9d265.firebasestorage.app",
  messagingSenderId: "563755773205",
  appId: "1:563755773205:web:be8d1d32cc4d2ca3d58d1c",
  measurementId: "G-WKTXH4CKZL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);