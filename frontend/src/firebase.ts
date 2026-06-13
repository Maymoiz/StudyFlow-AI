import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAznlmSJ1qQiZYHziQphS2zQ379WDtMpv8",
  authDomain: "moisha-studyflow-ai.firebaseapp.com",
  projectId: "moisha-studyflow-ai",
  storageBucket: "moisha-studyflow-ai.firebasestorage.app",
  messagingSenderId: "610961243036",
  appId: "1:610961243036:web:0600efcc439b546d89e659"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);