"use client"

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth as getFirebaseAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage as getFirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Store Firebase instances
let app: any = null
let firebaseAuth: any = null
let firebaseDb: any = null
let firebaseStorage: any = null
let googleProvider: any = null
let isInitialized = false
let initError: any = null

// Initialize Firebase on client side
if (typeof window !== "undefined") {
  try {
    // Debug: Log if keys are missing (without showing the secret values)
    console.log("Checking Firebase Config Keys:", {
      apiKey: !!firebaseConfig.apiKey,
      authDomain: !!firebaseConfig.authDomain,
      projectId: !!firebaseConfig.projectId,
    });

    if (!firebaseConfig.apiKey) {
      throw new Error("Missing Firebase API Key in environment variables");
    }

    app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

    firebaseAuth = getFirebaseAuth(app)
    firebaseDb = getFirestore(app)
    firebaseStorage = getFirebaseStorage(app)
    googleProvider = new GoogleAuthProvider()

    googleProvider.setCustomParameters({
      prompt: "select_account",
    })

    isInitialized = true
    console.log("Firebase initialized successfully")
  } catch (error) {
    console.error("CRITICAL: Error initializing Firebase:", error)
    initError = error
  }
}

// Helper to wait for init or fail
const waitForInit = (resolve: any, reject: any, service: any) => {
  if (isInitialized && service) {
    resolve(service)
  } else if (initError) {
    reject(initError) // Stop loading and throw error
  } else {
    setTimeout(() => waitForInit(resolve, reject, service), 100)
  }
}

export const getAuth = () => new Promise((resolve, reject) => waitForInit(resolve, reject, firebaseAuth))
export const getDb = () => new Promise((resolve, reject) => waitForInit(resolve, reject, firebaseDb))
export const getStorage = () => new Promise((resolve, reject) => waitForInit(resolve, reject, firebaseStorage))
export const getProvider = () => new Promise((resolve, reject) => waitForInit(resolve, reject, googleProvider))

// Legacy exports
export const auth = firebaseAuth
export const db = firebaseDb
export const storage = firebaseStorage
export const provider = googleProvider
export { app }
