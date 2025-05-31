"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"

// Dynamically import Firebase-dependent components to avoid SSR issues
const LoginPage = dynamic(() => import("../components/login-page").then((mod) => ({ default: mod.LoginPage })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Image src="/images/berry-logo.png" alt="Berry" width={60} height={60} className="mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  ),
})

const FamilySetupPage = dynamic(
  () => import("../components/family-setup-page").then((mod) => ({ default: mod.FamilySetupPage })),
  {
    ssr: false,
  },
)

const DashboardPage = dynamic(
  () => import("../components/dashboard-page").then((mod) => ({ default: mod.DashboardPage })),
  {
    ssr: false,
  },
)

const Toaster = dynamic(() => import("@/components/ui/toaster").then((mod) => ({ default: mod.Toaster })), {
  ssr: false,
})

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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const initializeAuth = async () => {
      try {
        const { auth } = await import("../lib/firebaseConfig")
        const { onAuthStateChanged } = await import("firebase/auth")
        const { doc, getDoc } = await import("firebase/firestore")
        const { db } = await import("../lib/firebaseConfig")

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
          setLoading(false)
        })

        return unsubscribe
      } catch (error) {
        console.error("Error initializing auth:", error)
        setLoading(false)
      }
    }

    const unsubscribePromise = initializeAuth()

    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) unsubscribe()
      })
    }
  }, [mounted])

  const handleLogin = (userData: User) => {
    setUser(userData)
  }

  const handleSetup = async (dogName: string, photoUrl: string | null) => {
    if (!user) return

    try {
      const { doc, setDoc } = await import("firebase/firestore")
      const { db } = await import("../lib/firebaseConfig")

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

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Image src="/images/berry-logo.png" alt="Berry" width={60} height={60} className="mx-auto mb-4" />
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
