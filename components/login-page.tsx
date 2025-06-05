"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"
import { getAuth, getProvider, getDb } from "@/lib/firebaseConfig"
import { useToast } from "@/hooks/use-toast"

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
  const [loading, setLoading] = useState(false)
  const [firebaseReady, setFirebaseReady] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const checkFirebase = async () => {
      try {
        await getAuth()
        await getProvider()
        await getDb()
        setFirebaseReady(true)
      } catch (error) {
        console.error("Error checking Firebase:", error)
        toast({
          title: "Initialization Error",
          description: "Failed to initialize app. Please refresh the page.",
          variant: "destructive",
        })
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
    } catch (error) {
      console.error("Error setting persistence:", error)
    }
  }

  const findUserInFamily = async (userEmail: string, db: any) => {
    try {
      const { collection, query, where, getDocs } = await import("firebase/firestore")
      
      console.log("Searching for user email:", userEmail)
      
      if (!userEmail) return null

      const searchEmail = userEmail.toLowerCase().trim()
      
      // Use array-contains query to find families where this email exists in familyMembers
      const usersRef = collection(db, "users")
      
      // First try: search by familyMembers array containing email directly
      const emailQuery = query(
        usersRef, 
        where("familyMembers", "array-contains", { name: "Or", email: searchEmail })
      )
      
      let querySnapshot = await getDocs(emailQuery)
      
      if (!querySnapshot.empty) {
        console.log("Found family with exact member match")
        return querySnapshot.docs[0]
      }
      
      // Second try: search by familyMembers array containing email string
      const emailStringQuery = query(
        usersRef, 
        where("familyMembers", "array-contains", searchEmail)
      )
      
      querySnapshot = await getDocs(emailStringQuery)
      
      if (!querySnapshot.empty) {
        console.log("Found family with email string match")
        return querySnapshot.docs[0]
      }
      
      // Third try: manual search through all documents (fallback)
      console.log("Trying manual search...")
      const allDocsSnapshot = await getDocs(usersRef)
      
      for (const docSnap of allDocsSnapshot.docs) {
        const data = docSnap.data()
        
        if (!data.familyMembers || !Array.isArray(data.familyMembers)) continue
        
        // Check each member
        for (const member of data.familyMembers) {
          let memberEmail = null
          
          if (typeof member === 'string') {
            memberEmail = member
          } else if (member && member.email) {
            memberEmail = member.email
          }
          
          if (memberEmail && memberEmail.toLowerCase().trim() === searchEmail) {
            console.log("Found family with manual search")
            return docSnap
          }
        }
      }
      
      console.log("No family found for email:", searchEmail)
      return null
      
    } catch (error) {
      console.error("Family search error:", error)
      return null
    }
  }

  const validateSignupForm = () => {
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      })
      return false
    }
    
    if (!dogName.trim()) {
      toast({
        title: "Dog's Name Required", 
        description: "Please enter your dog's name",
        variant: "destructive",
      })
      return false
    }
    
    return true
  }

  const handleGoogleLogin = async (isJoining = false, isSignup = false) => {
    if (!firebaseReady) {
      toast({
        title: "Please Wait",
        description: "App is still initializing. Please wait a moment.",
        variant: "destructive",
      })
      return
    }

    if (isSignup && !validateSignupForm()) {
      return
    }

    if (isJoining && !name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const auth: any = await getAuth()
      const provider: any = await getProvider()
      const db: any = await getDb()

      const { signInWithPopup } = await import("firebase/auth")
      const { doc, getDoc, setDoc, updateDoc, arrayUnion } = await import("firebase/firestore")

      const result = await signInWithPopup(auth, provider)
      const user = result.user

      if (!user || !user.email) {
        throw new Error("No user email from Google")
      }

      console.log("Google login success - Email:", user.email)

      const displayName = isSignup || isJoining ? name.trim() : (user.displayName || "Dog Parent")

      const loggedInUser: User = {
        id: user.uid,
        name: displayName,
        email: user.email,
        avatar: user.photoURL || "/placeholder.svg",
      }

      // Check if user already has their own family setup
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists() && userDoc.data()?.dogName && !isJoining) {
        console.log("User already has family")
        onLogin(loggedInUser)
        return
      }

      if (isSignup) {
        console.log("Creating new family")
        
        const userData = {
          name: displayName,
          email: user.email,
          dogName: dogName.trim(),
          familyMembers: [{ name: displayName, email: user.email }],
          createdAt: new Date(),
        }

        await setDoc(userDocRef, userData)
        
        toast({
          title: "Welcome to Berry!",
          description: `Family created for ${dogName}!`,
        })
        
        onLogin(loggedInUser)
        return
      }

      if (isJoining) {
        console.log("Trying to join existing family")
        
        const familyDoc = await findUserInFamily(user.email, db)

        if (!familyDoc) {
          toast({
            title: "No Family Found",
            description: "Could not find a family with your email address.",
            variant: "destructive",
          })
          setLoading(false)
          return
        }

        const familyData = familyDoc.data()
        console.log("Found family:", familyData.dogName)
        
        // Add to family members if not already there
        const newMember = { name: displayName, email: user.email }
        await updateDoc(doc(db, "users", familyDoc.id), {
          familyMembers: arrayUnion(newMember)
        })

        // Create user's own document
        await setDoc(userDocRef, {
          name: displayName,
          email: user.email,
          dogName: familyData.dogName,
          familyMembers: [...(familyData.familyMembers || []), newMember],
          createdAt: new Date(),
        })

        toast({
          title: "Welcome to the Family!",
          description: `Joined ${familyData.dogName}'s family!`,
        })
        
        onLogin(loggedInUser)
        return
      }

      // Regular login - search for existing family
      console.log("Regular login - searching for family")
      
      const familyDoc = await findUserInFamily(user.email, db)
      
      if (familyDoc) {
        console.log("Found existing family - auto joining")
        const familyData = familyDoc.data()
        
        await setDoc(userDocRef, {
          name: displayName,
          email: user.email,
          dogName: familyData.dogName,
          familyMembers: familyData.familyMembers,
          createdAt: new Date(),
        })
        
        toast({
          title: "Welcome Back!",
          description: `Joined ${familyData.dogName}'s family!`,
        })
        
        onLogin(loggedInUser)
      } else {
        console.log("No family found - showing options")
        setShowJoinForm(true)
        setLoading(false)
      }

    } catch (err: any) {
      console.error("Login error:", err)
      
      if (err.code === "auth/popup-closed-by-user") {
        toast({
          title: "Login Cancelled",
          description: "Please try logging in again.",
        })
      } else {
        setShowJoinForm(true)
        toast({
          title: "Login Issue",
          description: "Let's help you get set up.",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setShowJoinForm(false)
    setName("")
  }

  const handleCreateNewFamily = () => {
    setShowJoinForm(false)
    setActiveTab("signup")
  }

  if (showJoinForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Image src="/images/berry-logo.png" alt="Berry" width={200} height={60} />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={handleBackToLogin}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </div>
            <CardTitle className="text-2xl font-bold">Join or Create Family</CardTitle>
            <CardDescription>We'll help you join the family or create a new one.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinName">Your Name *</Label>
                <Input
                  id="joinName"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => handleGoogleLogin(true, false)} 
                  className="w-full h-12" 
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? "Searching..." : "Try to Join Existing Family"}
                </Button>
                
                <Button 
                  onClick={handleCreateNewFamily} 
                  className="w-full h-12" 
                  disabled={loading}
                >
                  Create New Family
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
            </div>
          ) : (
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <div className="space-y-4">
                  <Button onClick={() => handleGoogleLogin(false, false)} className="w-full h-12" disabled={loading}>
                    <GoogleIcon className="w-5 h-5 mr-3" />
                    {loading ? "Logging in..." : "Log in with Google"}
                  </Button>

                  <p className="text-xs text-center text-gray-600 mt-4">
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
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dogName">Your Dog's Name *</Label>
                    <Input
                      id="dogName"
                      placeholder="Enter your dog's name"
                      value={dogName}
                      onChange={(e) => setDogName(e.target.value)}
                    />
                  </div>

                  <Button onClick={() => handleGoogleLogin(false, true)} className="w-full h-12" disabled={loading}>
                    <GoogleIcon className="w-5 h-5 mr-3" />
                    {loading ? "Creating family..." : "Sign up with Google"}
                  </Button>

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
