"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { LoginPage } from "../components/login-page"
import { DashboardPage } from "../components/dashboard-page"
import { Toaster } from "@/components/ui/toaster"
import { getAuth, getDb } from "@/lib/firebaseConfig"
import { useToast } from "@/hooks/use-toast"

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
  const { toast } = useToast()

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
              // Check if user has completed setup
              const { doc, getDoc } = await import("firebase/firestore")
              const userDocRef = doc(db, "users", firebaseUser.uid)
              const userDoc = await getDoc(userDocRef)
              
              if (userDoc.exists() && userDoc.data()?.dogName) {
                // User has completed setup
                const userData: User = {
                  id: firebaseUser.uid,
                  name: firebaseUser.displayName || userDoc.data()?.name || "Dog Parent",
                  email: firebaseUser.email || "",
                  avatar: firebaseUser.photoURL || "/placeholder.svg",
                }
                setUser(userData)
              } else {
                // User exists but hasn't completed setup - redirect to login
                setUser(null)
              }
            } else {
              setUser(null)
            }
          } catch (error) {
            console.error("Error in auth state change:", error)
            toast({
              title: "Authentication Error",
              description: "There was an issue with authentication. Please try refreshing the page.",
              variant: "destructive",
            })
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
          toast({
            title: "Initialization Error",
            description: "Failed to initialize the app. Please refresh the page and try again.",
            variant: "destructive",
          })
          setLoading(false)
        }
      }
    }

    initializeApp()

    return () => {
      mounted = false
    }
  }, [toast])

  const handleLogin = (userData: User) => {
    setUser(userData)
    setError(null)
  }

  const handleLogout = () => {
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Image 
            src="/images/berry-logo.png" 
            alt="Berry" 
            width={150} 
            height={50} 
            className="mx-auto mb-4" 
            priority
          />
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Berry...</p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg max-w-xs mx-auto">
              <p className="text-red-600 text-sm">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </>
    )
  }

  return (
    <>
      <DashboardPage user={user} />
      <Toaster />
    </>
  )
}
