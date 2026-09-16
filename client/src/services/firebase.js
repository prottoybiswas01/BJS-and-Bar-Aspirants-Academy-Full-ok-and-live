import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDnJ18_PfXBE-ZTZIjRucG4KNlhKYVsRPI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bjs-2d034.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bjs-2d034",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bjs-2d034.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "511578355330",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:511578355330:web:cb59dfa548161c2cf5e69b",
  measurementId: "G-ZV5H7B046M"
};

let app = null;
let auth = null;
let googleProvider = null;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });
} catch (err) {
  console.warn("Firebase Auth initialization notice:", err);
}

export const signInWithGooglePopup = async () => {
  if (!auth || !googleProvider) {
    try {
      if (!app) app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      auth = getAuth(app);
      googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({ prompt: "select_account" });
    } catch (e) {
      throw new Error("Firebase Auth শুরু করা সম্ভব হয়নি। অনুগ্রহ করে ব্রাউজার রিফ্রেশ করে আবার চেষ্টা করুন।");
    }
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export { app, auth, googleProvider };

