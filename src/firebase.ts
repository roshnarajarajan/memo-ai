import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    
  apiKey: "AIzaSyBuM6nuDoMaSbFsJKdJW1ZrFNmCJJ1X7wg",
  authDomain: "memory-assistant-86564.firebaseapp.com",
  projectId: "memory-assistant-86564",
  storageBucket: "memory-assistant-86564.firebasestorage.app",
  messagingSenderId: "41895890993",
  appId: "1:41895890993:web:2874ae33a5a4f11e6e8510",
  measurementId: "G-GCM07VZ11W"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);