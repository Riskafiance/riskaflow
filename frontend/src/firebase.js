import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCcUNVoTyIrEXnNaCCGeylbjvBM3QQh9Wk",
  authDomain: "riskaflow-b38e6.firebaseapp.com",
  projectId: "riskaflow-b38e6",
  storageBucket: "riskaflow-b38e6.firebasestorage.app",
  messagingSenderId: "307083968066",
  appId: "1:307083968066:web:4eef76020abe360440b7db",
  measurementId: "G-54LTZVE6GC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Authentication tools for the Login Screen
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();