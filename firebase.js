import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCnHcjfO3vS2R3w1d2uzcuNy1g1N-OD4Rg",
  authDomain: "mobiltestfire.firebaseapp.com",
  projectId: "mobiltestfire",
  storageBucket: "mobiltestfire.firebasestorage.app",
  messagingSenderId: "504565640604",
  appId: "1:504565640604:web:0f4f9963144df71f426c59"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);