"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { LoginPage } from "../components/login-page"
import { DashboardPage } from "../components/dashboard-page"
import { Toaster } from "@/components/ui/toaster"
import { getAuth, getDb } from "@/lib/firebaseConfig"

interface User {
  id: string
  name: string
  email: string
  avatar: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const initializeApp = async () => {
      try {
        // Set Firebase persistence to LOCAL
        const auth: any = await getAuth()
        const { setPersistence, browserLocalPersistence } = await import("firebase/auth")
        await setPersistence(auth, browserLocalPersistence)
        console.log("Firebase persistence set to LOCAL")

        // Wait for Firebase to be ready
        const db: any = await getDb()

        if (!mounted) return

        // Import Firebase functions
        const { onAuthStateChanged } = await import("firebase/auth")

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
          try {
            if (!mounted) return

            if (firebaseUser) {
              const userData: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || "Dog Parent",
                email: firebaseUser.email || "",
                avatar: firebaseUser.photoURL || "/placeholder.svg",
              }
              setUser(userData)
            } else {
              setUser(null)
            }
          } catch (error) {
            console.error("Error in auth state change:", error)
          } finally {
            if (mounted) {
              setLoading(false)
            }
          }
        })

        return () => {
          unsubscribe()
        }
      } catch (error) {
        console.error("Error initializing app:", error)
        if (mounted) {
          setError("Failed to initialize app. Please refresh the page.")
          setLoading(false)
        }
      }
    }

    initializeApp()

    return () => {
      mounted = false
    }
  }, [])

  const handleLogin = (userData: User) => {
    setUser(userData)
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

  return (
    <>
      <DashboardPage user={user} />
      <Toaster />
    </>
  )
}
