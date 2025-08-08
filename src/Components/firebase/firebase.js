// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Correct Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHecXhmRVUu7CkcS6lr4n8X3BoUCVP3b8",
  authDomain: "tasksage.firebaseapp.com",
  projectId: "tasksage",
  storageBucket: "tasksage.appspot.com", // ✅ FIXED HERE
  messagingSenderId: "541422774540",
  appId: "1:541422774540:web:3358e26a94604a6567c129",
  measurementId: "G-TDBBSD2PK5"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
