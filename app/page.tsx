"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { LoginPage } from "../components/login-page"
import { FamilySetupPage } from "../components/family-setup-page"
import { DashboardPage } from "../components/dashboard-page"
import { Toaster } from "@/components/ui/toaster"
import { auth, db, isFirebaseInitialized } from "@/lib/firebaseConfig"

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
  const [error, setError] = useState<string | null>(null)
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    // Set a timeout to show an error message if loading takes too long
    const timeoutId = setTimeout(() => {
      if (loading) {
        setError("Loading is taking longer than expected. You may need to refresh the page.")
      }
    }, 5000)

    // Only run this effect on the client
    if (typeof window === "undefined") {
      setLoading(false)
      return () => clearTimeout(timeoutId)
    }

    // Wait for Firebase to be ready
    const checkFirebase = () => {
      if (isFirebaseInitialized()) {
        setFirebaseReady(true)
        return true
      }
      return false
    }

    // If Firebase isn't ready yet, wait and check again
    if (!checkFirebase()) {
      const interval = setInterval(() => {
        if (checkFirebase()) {
          clearInterval(interval)
          initAuth()
        }
      }, 100)

      // Clear interval after 5 seconds if Firebase still isn't ready
      setTimeout(() => {
        clearInterval(interval)
        if (!firebaseReady) {
          setError("Failed to initialize app. Please refresh the page.")
          setLoading(false)
        }
      }, 5000)

      return () => {
        clearInterval(interval)
        clearTimeout(timeoutId)
      }
    } else {
      initAuth()
    }

    function initAuth() {
      // Import Firebase functions dynamically
      import("firebase/auth").then(({ onAuthStateChanged }) => {
        import("firebase/firestore").then(({ doc, getDoc }) => {
          if (!auth) {
            console.error("Firebase auth not initialized")
            setLoading(false)
            setError("App failed to initialize. Please refresh the page.")
            return
          }

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
                if (db) {
                  const docRef = doc(db, "users", firebaseUser.uid)
                  const docSnap = await getDoc(docRef)

                  if (!docSnap.exists() || !docSnap.data()?.dogName) {
                    setNeedsSetup(true)
                  } else {
                    setNeedsSetup(false)
                  }
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

          return () => {
            unsubscribe()
          }
        })
      })
    }

    return () => {
      clearTimeout(timeoutId)
    }
  }, [firebaseReady])

  const handleLogin = (userData: User) => {
    setUser(userData)
  }

  const handleSetup = async (dogName: string, photoUrl: string | null) => {
    if (!user || !db) return

    try {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Image src="/images/berry-logo.png" alt="Berry" width={150} height={50} className="mx-auto mb-4" />
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          {error && <p className="text-red-500 mt-4 max-w-xs mx-auto">{error}</p>}
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
