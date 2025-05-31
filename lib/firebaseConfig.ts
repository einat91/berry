"use client"

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

// Initialize Firebase
let app, auth, db, storage, provider

let firebaseInitialized = false

// Only initialize on client side
if (typeof window !== "undefined") {
  try {
    // Initialize or get existing Firebase app
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig)
    } else {
      app = getApp()
    }

    // Initialize services with the app instance
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)
    provider = new GoogleAuthProvider()

    // Configure Google Auth Provider
    provider.setCustomParameters({
      prompt: "select_account",
    })

    firebaseInitialized = true
    console.log("Firebase initialized successfully")
  } catch (error) {
    console.error("Error initializing Firebase:", error)
    firebaseInitialized = false
  }
}

export const isFirebaseInitialized = () => firebaseInitialized

export { auth, db, storage, provider }
