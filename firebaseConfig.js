// Replace with your Firebase project config
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD_WlKue7OKOjsPDI_OQVQT6T4_aGRzrMY",
  authDomain: "unwind-5bc5c.firebaseapp.com",
  projectId: "unwind-5bc5c",
  storageBucket: "unwind-5bc5c.firebasestorage.app",
  messagingSenderId: "942115205438",
  appId: "1:942115205438:web:924de43f2a7ecc60fafc6f",
  measurementId: "G-QZNWB8F8RE",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let auth;
if (!getApps().length) {
  // This block will run only on first init
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  auth = getAuth(app);
}
const db = getFirestore(app);
export { app, auth, db };
