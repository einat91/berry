"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import Image from "next/image"
import { getAuth, getProvider, getDb } from "@/lib/firebaseConfig"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"

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
  const [name, setName] = useState("")
  const [dogName, setDogName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [firebaseReady, setFirebaseReady] = useState(false)
  const [nameError, setNameError] = useState("")
  const [dogNameError, setDogNameError] = useState("")

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

  const clearValidationErrors = () => {
    setNameError("")
    setDogNameError("")
    setError("")
  }

  const validateSignupForm = () => {
    let hasErrors = false
    clearValidationErrors()

    if (!name.trim()) {
      setNameError("Name is required")
      hasErrors = true
    }

    if (!dogName.trim()) {
      setDogNameError("Dog's name is required")
      hasErrors = true
    }

    return !hasErrors
  }

  const findUserInFamily = async (userEmail: string, db: any) => {
    const { collection, getDocs } = await import("firebase/firestore")
    
    try {
      console.log("🔍 Searching for email:", userEmail)
      
      const usersRef = collection(db, "users")
      const querySnapshot = await getDocs(usersRef)
      
      console.log("📂 Found", querySnapshot.docs.length, "documents")
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data()
        
        // Skip if no family data
        if (!data.familyMembers) {
          continue
        }
        
        console.log("👨‍👩‍👧‍👦 Checking family with", data.familyMembers.length, "members")
        
        // Check each family member for email match
        for (let i = 0; i < data.familyMembers.length; i++) {
          const member = data.familyMembers[i]
          
          let memberEmail = null
          
          // Handle different member formats
          if (typeof member === 'string') {
            memberEmail = member
          } else if (member && typeof member === 'object') {
            memberEmail = member.email
          }
          
          if (memberEmail) {
            console.log(`📧 Comparing: "${memberEmail.toLowerCase()}" vs "${userEmail.toLowerCase()}"`)
            
            if (memberEmail.toLowerCase().trim() === userEmail.toLowerCase().trim()) {
              console.log("✅ PERFECT MATCH FOUND! Returning family data")
              return doc
            }
          }
        }
      }
      
      console.log("❌ No family found for email:", userEmail)
      return null
      
    } catch (error) {
      console.error("❌ Search error:", error)
      return null
    }
  }

  const handleGoogleLogin = async (isSignup = false) => {
    if (!firebaseReady) {
      setError("App is still initializing. Please wait a moment.")
      return
    }

    // Clear previous errors
    clearValidationErrors()

    // Validate forms based on action
    if (isSignup && !validateSignupForm()) {
      return
    }

    setLoading(true)

    try {
      const auth: any = await getAuth()
      const provider: any = await getProvider()
      const db: any = await getDb()

      const { signInWithPopup } = await import("firebase/auth")
      const { doc, getDoc, setDoc } = await import("firebase/firestore")

      const result = await signInWithPopup(auth, provider)
      const user = result.user

      console.log("🔐 User signed in:", user.email)

      const displayName = isSignup ? name.trim() : (user.displayName || "Dog Parent")

      const loggedInUser: User = {
        id: user.uid,
        name: displayName,
        email: user.email || "",
        avatar: user.photoURL || "/placeholder.svg",
      }

      // Check if user already exists with family data
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists() && userDoc.data()?.dogName) {
        console.log("✅ User already has family setup, logging in")
        onLogin(loggedInUser)
        return
      }

      if (isSignup) {
        console.log("🆕 Creating new family")

        const userData = {
          name: displayName,
          email: user.email,
          dogName: dogName.trim(),
          familyMembers: [{ name: displayName, email: user.email }],
          createdAt: new Date(),
        }

        await setDoc(userDocRef, userData)
        console.log("✅ New family created")
        onLogin(loggedInUser)
        return
      }

      // Regular login - search for existing family
      console.log("🔍 Regular login - searching for existing family")
      const familyDoc = await findUserInFamily(user.email, db)
      
      if (familyDoc) {
        const familyData = familyDoc.data()
        console.log("🎉 Found existing family! Joining automatically")
        console.log("Family details:", {
          dogName: familyData.dogName,
          members: familyData.familyMembers
        })
        
        // Create user document with existing family data
        await setDoc(userDocRef, {
          name: displayName,
          email: user.email,
          dogName: familyData.dogName,
          familyMembers: familyData.familyMembers,
          photoUrl: familyData.photoUrl,
          createdAt: new Date(),
        })
        
        onLogin(loggedInUser)
      } else {
        console.log("❓ No family found - user needs to sign up or be invited")
        setError("No family found for your email. Please sign up to create a new family or ask a family member to add you first.")
      }

    } catch (err: any) {
      console.error("❌ Login error:", err)
      if (err.code === "auth/unauthorized-domain") {
        setError("Please use a different browser or enable third-party cookies.")
      } else {
        setError(err.message || "Failed to log in. Please try again.")
      }
    } finally {
      setLoading(false)
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
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <div className="space-y-4">
                  <Button onClick={() => handleGoogleLogin(false)} className="w-full h-12" disabled={loading}>
                    <GoogleIcon className="w-5 h-5 mr-3" />
                    {loading ? "Logging in..." : "Log in with Google"}
                  </Button>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <p className="text-xs text-center text-gray-600 mt-4">
                    Will automatically find your family if you've been invited
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="signup">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (nameError) setNameError("")
                      }}
                      className={nameError ? "border-red-500" : ""}
                      required
                    />
                    {nameError && (
                      <div className="text-xs text-red-500 mt-1">
                        {nameError}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dogName">Your Dog's Name *</Label>
                    <Input
                      id="dogName"
                      placeholder="Enter your dog's name"
                      value={dogName}
                      onChange={(e) => {
                        setDogName(e.target.value)
                        if (dogNameError) setDogNameError("")
                      }}
                      className={dogNameError ? "border-red-500" : ""}
                      required
                    />
                    {dogNameError && (
                      <div className="text-xs text-red-500 mt-1">
                        {dogNameError}
                      </div>
                    )}
                  </div>

                  <Button onClick={() => handleGoogleLogin(true)} className="w-full h-12" disabled={loading}>
                    <GoogleIcon className="w-5 h-5 mr-3" />
                    {loading ? "Signing up..." : "Sign up with Google"}
                  </Button>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <p className="text-xs text-center text-gray-600 mt-4">
                    Creates a new family account for your dog
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
                    Will automatically find your family if you've been invited
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="signup">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (nameError) setNameError("")
                      }}
                      className={nameError ? "border-red-500" : ""}
                      required
                    />
                    {nameError && (
                      <div className="text-xs text-red-500 mt-1">
                        {nameError}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dogName">Your Dog's Name *</Label>
                    <Input
                      id="dogName"
                      placeholder="Enter your dog's name"
                      value={dogName}
                      onChange={(e) => {
                        setDogName(e.target.value)
                        if (dogNameError) setDogNameError("")
                      }}
                      className={dogNameError ? "border-red-500" : ""}
                      required
                    />
                    {dogNameError && (
                      <div className="text-xs text-red-500 mt-1">
                        {dogNameError}
                      </div>
                    )}
                  </div>

                  <Button onClick={() => handleGoogleLogin(true)} className="w-full h-12" disabled={loading}>
                    <GoogleIcon className="w-5 h-5 mr-3" />
                    {loading ? "Signing up..." : "Sign up with Google"}
                  </Button>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <p className="text-xs text-center text-gray-600 mt-4">
                    Creates a new family account for your dog
                  </p>
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
                    Will automatically find your family or guide you to join one
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="signup">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (nameError) setNameError("")
                      }}
                      className={nameError ? "border-red-500" : ""}
                      required
                    />
                    {nameError && (
                      <div className="text-xs text-red-500 mt-1">
                        {nameError}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dogName">Your Dog's Name *</Label>
                    <Input
                      id="dogName"
                      placeholder="Enter your dog's name"
                      value={dogName}
                      onChange={(e) => {
                        setDogName(e.target.value)
                        if (dogNameError) setDogNameError("")
                      }}
                      className={dogNameError ? "border-red-500" : ""}
                      required
                    />
                    {dogNameError && (
                      <div className="text-xs text-red-500 mt-1">
                        {dogNameError}
                      </div>
                    )}
                  </div>

                  <Button onClick={() => handleGoogleLogin(false, true)} className="w-full h-12" disabled={loading}>
                    <GoogleIcon className="w-5 h-5 mr-3" />
                    {loading ? "Signing up..." : "Sign up with Google"}
                  </Button>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <p className="text-xs text-center text-gray-600 mt-4">
                    Creates a new family account for your dog
                  </p>
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
