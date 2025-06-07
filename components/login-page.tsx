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

  // Simple, reliable email-based family search
  const findFamilyByEmail = async (userEmail: string, db: any) => {
    try {
      const { collection, getDocs } = await import("firebase/firestore")
      
      console.log("🔍 Searching for email in families:", userEmail)
      
      if (!userEmail) return null

      const searchEmail = userEmail.toLowerCase().trim()
      console.log("📧 Normalized search email:", searchEmail)
      
      // Get all family documents
      const usersRef = collection(db, "users")
      const snapshot = await getDocs(usersRef)
      
      console.log("📂 Total families to check:", snapshot.docs.length)
      
      // Check each family document
      for (const familyDoc of snapshot.docs) {
        const familyData = familyDoc.data()
        
        // Skip if not a family document
        if (!familyData.dogName || !familyData.familyMembers) {
          continue
        }
        
        console.log(`\n🏠 Checking family: ${familyData.dogName}`)
        console.log("👥 Family members:", familyData.familyMembers)
        
        // Check each family member
        for (const member of familyData.familyMembers) {
          let memberEmail = null
          
          // Handle different formats
          if (typeof member === 'string') {
            memberEmail = member
          } else if (member && member.email) {
            memberEmail = member.email
          }
          
          if (memberEmail) {
            const cleanMemberEmail = memberEmail.toLowerCase().trim()
            console.log(`   🔍 Comparing: "${searchEmail}" === "${cleanMemberEmail}"`)
            
            if (searchEmail === cleanMemberEmail) {
              console.log("✅ FAMILY FOUND!")
              console.log("🎯 Family:", familyData.dogName)
              console.log("👤 Matched member:", member)
              return familyDoc
            }
          }
        }
      }
      
      console.log("❌ No family found for email:", searchEmail)
      return null
      
    } catch (error) {
      console.error("❌ Error searching families:", error)
      return null
    }
  }

  const joinExistingFamily = async (familyDoc: any, user: any, displayName: string, db: any) => {
    try {
      const { doc, setDoc, updateDoc, arrayUnion } = await import("firebase/firestore")
      
      const familyData = familyDoc.data()
      const originalFamilyId = familyDoc.id
      console.log("🤝 Joining family:", familyData.dogName)
      console.log("🏠 Original family ID:", originalFamilyId)
      
      // Add this user to the original family's member list if not already there
      const newMember = { name: displayName, email: user.email }
      const isAlreadyMember = familyData.familyMembers.some((member: any) => {
        if (typeof member === 'string') return member.toLowerCase() === user.email.toLowerCase()
        return member.email && member.email.toLowerCase() === user.email.toLowerCase()
      })
      
      if (!isAlreadyMember) {
        await updateDoc(familyDoc.ref, {
          familyMembers: arrayUnion(newMember)
        })
        console.log("👥 Added to family members list")
      }
      
      // Create user's document that points to the original family
      const userDocRef = doc(db, "users", user.uid)
      await setDoc(userDocRef, {
        name: displayName,
        email: user.email,
        dogName: familyData.dogName,
        familyMembers: [...familyData.familyMembers, newMember],
        originalFamilyId: originalFamilyId, // Reference to the main family
        createdAt: new Date(),
      })
      
      console.log("✅ Successfully joined family with shared activity log!")
      return { ...familyData, originalFamilyId }
      
    } catch (error) {
      console.error("❌ Error joining family:", error)
      throw error
    }
  }

  const createNewFamily = async (user: any, displayName: string, dogName: string, db: any) => {
    try {
      const { doc, setDoc } = await import("firebase/firestore")
      
      console.log("🆕 Creating new family for:", dogName)
      
      const userData = {
        name: displayName,
        email: user.email,
        dogName: dogName.trim(),
        familyMembers: [{ name: displayName, email: user.email }],
        createdAt: new Date(),
      }

      const userDocRef = doc(db, "users", user.uid)
      await setDoc(userDocRef, userData)
      
      console.log("✅ New family created!")
      return userData
      
    } catch (error) {
      console.error("❌ Error creating family:", error)
      throw error
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

      console.log("🚀 Starting Google authentication...")
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      if (!user || !user.email) {
        throw new Error("No email from Google authentication")
      }

      console.log("✅ Google authentication successful")
      console.log("📧 User email:", user.email)
      console.log("👤 Display name:", user.displayName)

      const displayName = isSignup || isJoining ? name.trim() : (user.displayName || "Dog Parent")

      const loggedInUser: User = {
        id: user.uid,
        name: displayName,
        email: user.email,
        avatar: user.photoURL || "/placeholder.svg",
      }

      // STEP 1: Always search for existing family membership first
      console.log("\n🔍 STEP 1: Searching for existing family...")
      const familyDoc = await findFamilyByEmail(user.email, db)
      
      if (familyDoc) {
        // Found existing family - join it
        const familyData = await joinExistingFamily(familyDoc, user, displayName, db)
        
        toast({
          title: "Welcome to the Family!",
          description: `Joined ${familyData.dogName}'s family successfully!`,
        })
        
        onLogin(loggedInUser)
        return
      }

      // STEP 2: No existing family found
      console.log("\n❌ No existing family found")

      if (isSignup) {
        // Create new family
        console.log("🆕 User wants to create new family")
        const familyData = await createNewFamily(user, displayName, dogName, db)
        
        toast({
          title: "Welcome to Berry!",
          description: `Family created for ${familyData.dogName}!`,
        })
        
        onLogin(loggedInUser)
        return
      }

      if (isJoining) {
        // Tried to join but no family found
        toast({
          title: "No Family Found",
          description: "Could not find a family with your email address.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Regular login with no family found - show options
      console.log("❓ Regular login but no family found - showing options")
      setShowJoinForm(true)
      setLoading(false)

    } catch (err: any) {
      console.error("❌ Login error:", err)
      
      if (err.code === "auth/popup-closed-by-user") {
        toast({
          title: "Login Cancelled",
          description: "Please try logging in again.",
        })
      } else {
        toast({
          title: "Login Error",
          description: err.message || "Something went wrong. Please try again.",
          variant: "destructive",
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
            <CardDescription>We didn't find an existing family for your email.</CardDescription>
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

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-700 text-center">
                  💡 If you can't join, the family admin may need to add your email address to the family first.
                </p>
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
                    Will automatically find your family based on your email address
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
