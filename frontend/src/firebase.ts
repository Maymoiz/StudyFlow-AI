import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAznlmSJ1qQiZYHziQphS2zQ379WDtMpv8",
  authDomain: "moisha-studyflow-ai.firebaseapp.com",
  projectId: "moisha-studyflow-ai",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
