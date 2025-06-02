"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { getAuth, getProvider, getDb } from "@/lib/firebaseConfig"

interface User {
  id: string
  name: string
  email: string
  avatar: string
}

interface LoginPageProps {
  onLogin: (user: User) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<string>("login")
  const [familyCode, setFamilyCode] = useState("")
  const [name, setName] = useState("")
  const [dogName, setDogName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    const checkFirebase = async () => {
      try {
        await getAuth()
        await getProvider()
        await getDb()
        setFirebaseReady(true)
      } catch (error) {
        console.error("Error checking Firebase:", error)
        setError("Failed to initialize app. Please refresh the page.")
      }
    }

    checkFirebase()
    setPersistence()
  }, [])

  const setPersistence = async () => {
    try {
      const auth: any = await getAuth()
      const { setPersistence, browserLocalPersistence } = await import("firebase/auth")
      await setPersistence(auth, browserLocalPersistence)
      console.log("Firebase persistence set to LOCAL")
    } catch (error) {
      console.error("Error setting persistence:", error)
    }
  }

  const findUserInFamily = async (userEmail: string, db: any) => {
    const { collection, query, where, getDocs } = await import("firebase/firestore")
    
    // Search for families where this user's email is in familyMembers
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("familyMembers", "array-contains-any", [
      { email: userEmail },
      userEmail // Also check for old string format
    ]))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0]
    }
    return null
  }

  const handleGoogleLogin = async (isJoining = false, isSignup = false) => {
    if (!firebaseReady) {
      setError("App is still initializing. Please wait a moment.")
      return
    }

    setError("")
    setLoading(true)

    if (isJoining && !familyCode) {
      setError("Please enter a family code")
      setLoading(false)
      return
    }

    if ((isJoining || isSignup) && !name.trim()) {
      setError("Please enter your name")
      setLoading(false)
      return
    }

    if (isSignup && !dogName.trim()) {
      setError("Please enter your dog's name")
      setLoading(false)
      return
    }

    try {
      const auth: any = await getAuth()
      const provider: any = await getProvider()
      const db: any = await getDb()

      const { signInWithPopup } = await import("firebase/auth")
      const { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs } = await import(
        "firebase/firestore"
      )

      const result = await signInWithPopup(auth, provider)
      const user = result.user

      const displayName = isSignup || isJoining ? name.trim() : (user.displayName || "Dog Parent")

      const loggedInUser: User = {
        id: user.uid,
        name: displayName,
        email: user.email || "",
        avatar: user.photoURL || "/placeholder.svg",
      }

      // Check if user already exists
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists() && userDoc.data()?.dogName && !isJoining) {
        // User exists and has completed setup - just log them in
        onLogin(loggedInUser)
      } else if (isJoining) {
        // User is joining an existing family using family code
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("familyCode", "==", familyCode.toUpperCase()))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          setError("Invalid family code. Please check and try again.")
          setLoading(false)
          return
        }

        const familyDoc = querySnapshot.docs[0]
        const familyData = familyDoc.data()

        // Update the family creator's document to include new member
        await updateDoc(doc(db, "users", familyDoc.id), {
          familyMembers: arrayUnion({ name: displayName, email: user.email })
        })

        // Create or update the joining user's document with family data
        await setDoc(userDocRef, {
          name: displayName,
          email: user.email,
          dogName: familyData.dogName, // Use existing family's dog name
          familyMembers: [...(familyData.familyMembers || []), { name: displayName, email: user.email }],
          familyCode: familyData.familyCode,
          photoUrl: familyData.photoUrl,
          createdAt: new Date(),
        })

        onLogin(loggedInUser)
      } else if (isSignup) {
        // New signup - create family with dog name
        const familyCodeGenerated = Math.random().toString(36).substring(2, 8).toUpperCase()

        const userData = {
          name: displayName,
          email: user.email,
          dogName: dogName.trim(),
          familyMembers: [{ name: displayName, email: user.email }],
          familyCode: familyCodeGenerated,
          createdAt: new Date(),
        }

        await setDoc(userDocRef, userData)
        onLogin(loggedInUser)
      } else {
        // Regular login - check if user is part of an existing family by email
        const familyDoc = await findUserInFamily(user.email, db)
        
        if (familyDoc) {
          // User is part of an existing family, join them automatically
          const familyData = familyDoc.data()
          
          await setDoc(userDocRef, {
            name: displayName,
            email: user.email,
            dogName: familyData.dogName,
            familyMembers: familyData.familyMembers,
            familyCode: familyData.familyCode,
            photoUrl: familyData.photoUrl,
            createdAt: new Date(),
          })
          
          onLogin(loggedInUser)
        } else {
          // Create basic user document (will need setup)
          await setDoc(userDocRef, {
            name: displayName,
            email: user.email,
            createdAt: new Date(),
          }, { merge: true })

          onLogin(loggedInUser)
        }
      }
    } catch (err: any) {
      console.error("Login error:", err)

      // Handle unauthorized domain error - try anonymous login as fallback
      if (err.code === "auth/unauthorized-domain") {
        console.log("Google login failed, trying anonymous login...")
        await handleAnonymousLogin(isJoining, isSignup)
      } else {
        setError(err.message || "Failed to log in. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAnonymousLogin = async (isJoining = false, isSignup = false) => {
    try {
      const auth: any = await getAuth()
      const db: any = await getDb()

      const { signInAnonymously } = await import("firebase/auth")
      const { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs } = await import(
        "firebase/firestore"
      )

      const result = await signInAnonymously(auth)
      const user = result.user

      const displayName = isSignup || isJoining ? name.trim() : "Dog Parent"

      const loggedInUser: User = {
        id: user.uid,
        name: displayName,
        email: "",
        avatar: "/placeholder.svg",
      }

      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists() && userDoc.data()?.dogName && !isJoining) {
        onLogin(loggedInUser)
      } else if (isJoining) {
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("familyCode", "==", familyCode.toUpperCase()))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          setError("Invalid family code. Please check and try again.")
          setLoading(false)
          return
        }

        const familyDoc = querySnapshot.docs[0]
        const familyData = familyDoc.data()

        await updateDoc(doc(db, "users", familyDoc.id), {
          familyMembers: arrayUnion({ name: displayName, email: "" })
        })

        await setDoc(userDocRef, {
          name: displayName,
          email: "",
          dogName: familyData.dogName, // Use existing family's dog name
          familyMembers: [...(familyData.familyMembers || []), { name: displayName, email: "" }],
          familyCode: familyData.familyCode,
          photoUrl: familyData.photoUrl,
          createdAt: new Date(),
        })

        onLogin(loggedInUser)
      } else if (isSignup) {
        const familyCodeGenerated = Math.random().toString(36).substring(2, 8).toUpperCase()

        const userData = {
          name: displayName,
          email: "",
          dogName: dogName.trim(),
          familyMembers: [{ name: displayName, email: "" }],
          familyCode: familyCodeGenerated,
          createdAt: new Date(),
        }

        await setDoc(userDocRef, userData)
        onLogin(loggedInUser)
      } else {
        await setDoc(userDocRef, {
          name: displayName,
          email: "",
          createdAt: new Date(),
        }, { merge: true })

        onLogin(loggedInUser)
      }
    } catch (err: any) {
      console.error("Anonymous login error:", err)
      setError("Failed to create account. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image src="/images/berry-logo.png" alt="Berry" width={200} height={60} />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Berry</CardTitle>
          <CardDescription>Track your dog's daily activities with your family</CardDescription>
        </CardHeader>
        <CardContent>
          {!firebaseReady ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300 mx-auto mb-4"></div>
              <p className="text-gray-600">Initializing app...</p>
              {error && <p className="text-red-500 mt-4">{error}</p>}
            </div>
          ) : (
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="join">Join Family</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <div className="space-y-4">
                  <Button onClick={() => handleGoogleLogin(false, false)} className="w-full h-12" disabled={loading}>
                    <GoogleIcon className="w-5 h-5 mr-3" />
                    {loading ? "Logging in..." : "Log in with Google"}
                  </Button>

                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                  <p className="text-xs text-center text-gray-600 mt-4">
                    Log into your existing family account
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="signup">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dogName">Your Dog's Name</Label>
                    <Input
                      id="dogName"
                      placeholder="Enter your dog's name"
                      value={dogName}
                      onChange={(e) => setDogName(e.target.value)}
                    />
                  </div>

                  <Button onClick={() => handleGoogleLogin(false, true)} className="w-full h-12" disabled={loading}>
                    <GoogleIcon className="w-5 h-5 mr-3" />
                    {loading ? "Signing up..." : "Sign up with Google"}
                  </Button>

                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                  <p className="text-xs text-center text-gray-600 mt-4">
                    You'll create a new family account for your dog
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="join">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="joinName">Your Name</Label>
                    <Input
                      id="joinName"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="familyCode">Family Code</Label>
                    <Input
                      id="familyCode"
                      placeholder="Enter the 6-digit family code"
                      value={familyCode}
                      onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                      className="font-mono"
                      maxLength={6}
                    />
                  </div>

                  <Button onClick={() => handleGoogleLogin(true, true)} className="w-full h-12" disabled={loading}>
                    <GoogleIcon className="w-5 h-5 mr-3" />
                    {loading ? "Joining..." : "Join Family with Google"}
                  </Button>

                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                  <p className="text-xs text-center text-gray-600 mt-4">Ask your family member for the 6-digit code</p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
