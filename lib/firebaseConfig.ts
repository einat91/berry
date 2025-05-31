"use client"

import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

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

// Global variables to store Firebase instances
let firebaseApp: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null
let provider: GoogleAuthProvider | null = null
let isInitialized = false
let initializationPromise: Promise<void> | null = null

// Initialize Firebase function
const initializeFirebase = async (): Promise<void> => {
  if (isInitialized) return
  if (initializationPromise) return initializationPromise

  initializationPromise = new Promise((resolve, reject) => {
    try {
      // Only initialize on client side
      if (typeof window === "undefined") {
        reject(new Error("Firebase can only be initialized on client side"))
        return
      }

      // Check if Firebase is already initialized
      if (!getApps().length) {
        firebaseApp = initializeApp(firebaseConfig)
      } else {
        firebaseApp = getApps()[0]
      }

      // Initialize Firebase services
      auth = getAuth(firebaseApp)
      db = getFirestore(firebaseApp)
      storage = getStorage(firebaseApp)
      provider = new GoogleAuthProvider()

      // Configure Google Auth Provider
      provider.setCustomParameters({
        prompt: "select_account",
      })

      isInitialized = true
      resolve()
    } catch (error) {
      console.error("Error initializing Firebase:", error)
      reject(error)
    }
  })

  return initializationPromise
}

// Helper function to get Firebase services with initialization check
export const getFirebaseServices = async () => {
  await initializeFirebase()

  if (!auth || !db || !storage || !provider) {
    throw new Error("Firebase services not properly initialized")
  }

  return { auth, db, storage, provider }
}

// Export individual services (will be null until initialized)
export { auth, db, storage, provider }

// Export initialization function
export { initializeFirebase }
