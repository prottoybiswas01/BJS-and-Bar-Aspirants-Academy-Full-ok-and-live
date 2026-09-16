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

// Initialize Firebase safely (prevent re-initialization)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const signInWithGooglePopup = async () => {
  if (!firebaseConfig.apiKey) {
    throw new Error("VITE_FIREBASE_API_KEY পাওয়া যায়নি। দয়া করে Firebase Console থেকে API Key যোগ করুন।");
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export { app, auth, googleProvider };
