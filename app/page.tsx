"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { LoginPage } from "../components/login-page"
import { FamilySetupPage } from "../components/family-setup-page"
import { DashboardPage } from "../components/dashboard-page"
import { Toaster } from "@/components/ui/toaster"

interface User {
  id: string
  name: string
  email: string
  avatar: string
  firstName: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Initialize Firebase first
        const { initializeFirebase, getFirebaseServices } = await import("../lib/firebaseConfig")
        await initializeFirebase()
        setFirebaseReady(true)

        // Get Firebase services
        const { auth, db } = await getFirebaseServices()

        // Import Firebase functions
        const { onAuthStateChanged } = await import("firebase/auth")
        const { doc, getDoc } = await import("firebase/firestore")

        // Set up auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (firebaseUser) {
              const userData: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || "Dog Parent",
                email: firebaseUser.email || "",
                avatar: firebaseUser.photoURL || "/placeholder.svg",
                firstName: firebaseUser.displayName?.split(" ")[0] || "Dog Parent",
              }
              setUser(userData)

              // Check if user has completed setup
              const docRef = doc(db, "users", firebaseUser.uid)
              const docSnap = await getDoc(docRef)

              if (!docSnap.exists() || !docSnap.data()?.dogName) {
                setNeedsSetup(true)
              } else {
                setNeedsSetup(false)
              }
            } else {
              setUser(null)
              setNeedsSetup(false)
            }
          } catch (error) {
            console.error("Error in auth state change:", error)
          } finally {
            setLoading(false)
          }
        })

        return unsubscribe
      } catch (error) {
        console.error("Error initializing auth:", error)
        setLoading(false)
        return null
      }
    }

    const unsubscribePromise = initializeAuth()

    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) unsubscribe()
      })
    }
  }, [])

  const handleLogin = (userData: User) => {
    setUser(userData)
  }

  const handleSetup = async (dogName: string, photoUrl: string | null) => {
    if (!user) return

    try {
      const { getFirebaseServices } = await import("../lib/firebaseConfig")
      const { db } = await getFirebaseServices()
      const { doc, setDoc } = await import("firebase/firestore")

      const familyCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const userData = {
        dogName,
        familyMembers: [user.firstName],
        familyCode,
        createdAt: new Date(),
        photoUrl,
      }

      await setDoc(doc(db, "users", user.id), userData)
      setNeedsSetup(false)
    } catch (error) {
      console.error("Error setting up family:", error)
    }
  }

  if (!firebaseReady || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Image src="/images/berry-logo.png" alt="Berry" width={120} height={40} className="mx-auto mb-4" />
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  if (needsSetup) {
    return <FamilySetupPage onSetup={handleSetup} />
  }

  return (
    <>
      <DashboardPage user={user} />
      <Toaster />
    </>
  )
}
