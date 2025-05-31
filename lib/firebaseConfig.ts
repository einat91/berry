"use client"

import { initializeApp, getApps } from "firebase/app"
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

// Initialize Firebase only on client side
let app, auth, db, storage, provider

// Check if we're in the browser environment
if (typeof window !== "undefined") {
  try {
    // Initialize Firebase app first
    if (!getApps().length) {
      app = initializeApp(firebaseConfig)
    } else {
      app = getApps()[0]
    }

    // Then initialize services
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)
    provider = new GoogleAuthProvider()

    // Configure Google Auth Provider
    provider.setCustomParameters({
      prompt: "select_account",
    })
  } catch (error) {
    console.error("Error initializing Firebase:", error)
  }
}

// Export a function to check if Firebase is initialized
export const isFirebaseInitialized = () => {
  return !!auth && !!db && !!storage && !!provider
}

export { auth, db, storage, provider }
