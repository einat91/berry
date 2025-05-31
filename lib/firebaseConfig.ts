import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAspERiSvjnYH021jsvo04n4kyz3LlP_R4",
  authDomain: "berry-come-home.firebaseapp.com",
  projectId: "berry-come-home",
  storageBucket: "berry-come-home.firebasestorage.app",
  messagingSenderId: "1071901322951",
  appId: "1:1071901322951:web:c2b513babd415712b418e2",
  measurementId: "G-79MK22LMPH",
}

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Initialize Firebase services
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)
export const storage = getStorage(app)

// Configure Google Auth Provider
provider.setCustomParameters({
  prompt: "select_account",
})
