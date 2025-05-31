import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAspERiSvjnYH021jsvo04n4kyz3LlP_R4",
  authDomain: "berry-come-home.firebaseapp.com",
  projectId: "berry-come-home",
  storageBucket: "berry-come-home.firebasestorage.app",
  messagingSenderId: "1071901322951",
  appId: "1:1071901322951:web:c2b513babd415712b418e2",
  measurementId: "G-79MK22LMPH"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
