"use client"

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth as getFirebaseAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage as getFirebaseStorage } from "firebase/storage"

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase app
const app = typeof window !== "undefined" ? (!getApps().length ? initializeApp(firebaseConfig) : getApp()) : null

// Store Firebase instances
let firebaseAuth: any = null
let firebaseDb: any = null
let firebaseStorage: any = null
let googleProvider: any = null
let isInitialized = false

// Initialize Firebase on client side
if (typeof window !== "undefined" && app) {
  try {
    // Initialize services
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
    console.error("Error initializing Firebase:", error)
  }
}

// Getter functions that wait for initialization
export const getAuth = () => {
  return new Promise((resolve) => {
    const checkAuth = () => {
      if (isInitialized && firebaseAuth) {
        resolve(firebaseAuth)
      } else {
        setTimeout(checkAuth, 100)
      }
    }
    checkAuth()
  })
}

export const getDb = () => {
  return new Promise((resolve) => {
    const checkDb = () => {
      if (isInitialized && firebaseDb) {
        resolve(firebaseDb)
      } else {
        setTimeout(checkDb, 100)
      }
    }
    checkDb()
  })
}

export const getStorage = () => {
  return new Promise((resolve) => {
    const checkStorage = () => {
      if (isInitialized && firebaseStorage) {
        resolve(firebaseStorage)
      } else {
        setTimeout(checkStorage, 100)
      }
    }
    checkStorage()
  })
}

export const getProvider = () => {
  return new Promise((resolve) => {
    const checkProvider = () => {
      if (isInitialized && googleProvider) {
        resolve(googleProvider)
      } else {
        setTimeout(checkProvider, 100)
      }
    }
    checkProvider()
  })
}

// Legacy exports
export const auth = firebaseAuth
export const db = firebaseDb
export const storage = firebaseStorage
export const provider = googleProvider
export { app }
