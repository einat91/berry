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
  const [debugInfo, setDebugInfo] = useState<string>("")
  const { toast } = useToast()

  useEffect(() => {
    const checkFirebase = async () => {
      try {
        await getAuth()
        await getProvider()
        await getDb()
        setFirebaseReady(true)
        console.log("✅ Firebase initialized successfully")
      } catch (error) {
        console.error("❌ Error checking Firebase:", error)
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
      console.log("✅ Firebase persistence set to LOCAL")
    } catch (error) {
      console.error("❌ Error setting persistence:", error)
    }
  }

  const findUserInFamily = async (userEmail: string, db: any) => {
    try {
      const { collection, getDocs } = await import("firebase/firestore")
      
      console.log("🔍 ===== STARTING FAMILY SEARCH =====")
      console.log("🔍 Original email from Google:", userEmail)
      
      if (!userEmail || typeof userEmail !== 'string') {
        console.log("❌ Invalid email provided:", userEmail)
        setDebugInfo(`❌ Invalid email: ${userEmail}`)
        return null
      }

      // Normalize email for comparison (lowercase and trim)
      const normalizedSearchEmail = userEmail.toLowerCase().trim()
      console.log("🔍 Normalized search email:", normalizedSearchEmail)
      setDebugInfo(`🔍 Looking for: ${normalizedSearchEmail}`)
      
      const usersRef = collection(db, "users")
      const querySnapshot = await getDocs(usersRef)
      
      console.log("📂 Total documents in database:", querySnapshot.docs.length)
      
      let debugLog = `📂 Found ${querySnapshot.docs.length} families in database\n\n`
      
      for (const doc of querySnapshot.docs) {
        try {
          const data = doc.data()
          
          console.log("📄 Checking document:", doc.id)
          debugLog += `📄 Document: ${doc.id}\n`
          
          // Skip documents without required family data
          if (!data.dogName || !data.familyMembers || !Array.isArray(data.familyMembers)) {
            console.log("⏭️ Skipping - no family data")
            debugLog += "  ⏭️ Skipped - no family data\n\n"
            continue
          }
          
          console.log("👨‍👩‍👧‍👦 Family found:", {
            dogName: data.dogName,
            memberCount: data.familyMembers.length,
            members: data.familyMembers
          })
          
          debugLog += `  🐕 Dog: ${data.dogName}\n`
          debugLog += `  👥 Members (${data.familyMembers.length}):\n`
          
          // Check each family member
          for (let i = 0; i < data.familyMembers.length; i++) {
            const member = data.familyMembers[i]
            
            console.log(`   Member ${i}:`, member)
            
            let memberEmail = null
            let memberName = "Unknown"
            
            // Handle different member formats
            if (typeof member === 'string') {
              memberEmail = member
              memberName = member
            } else if (member && typeof member === 'object') {
              memberEmail = member.email
              memberName = member.name || "No name"
            }
            
            debugLog += `    ${i + 1}. ${memberName}`
            
            if (memberEmail && typeof memberEmail === 'string') {
              // Normalize member email for comparison
              const normalizedMemberEmail = memberEmail.toLowerCase().trim()
              
              debugLog += ` (${memberEmail})\n`
              
              console.log(`📧 EMAIL COMPARISON ${i}:`)
              console.log(`   🔍 Searching for: "${normalizedSearchEmail}"`)
              console.log(`   📝 Found in DB:   "${normalizedMemberEmail}"`)
              console.log(`   ✅ Match?        ${normalizedSearchEmail === normalizedMemberEmail}`)
              
              if (normalizedSearchEmail === normalizedMemberEmail) {
                console.log("🎉 ===== FAMILY MATCH FOUND! =====")
                console.log("Family details:", {
                  dogName: data.dogName,
                  memberCount: data.familyMembers.length,
                  docId: doc.id,
                  matchedMember: member
                })
                
                setDebugInfo(`🎉 MATCH FOUND!\n🐕 Dog: ${data.dogName}\n👤 Matched: ${memberName}\n📧 Email: ${memberEmail}`)
                
                return doc
              }
            } else {
              debugLog += ` (no email)\n`
            }
          }
          
          debugLog += "\n"
          
        } catch (memberError) {
          console.error("❌ Error processing family document:", doc.id, memberError)
          debugLog += `  ❌ Error processing this family\n\n`
          continue
        }
      }
      
      console.log("❌ ===== NO FAMILY FOUND =====")
      console.log("Search email:", normalizedSearchEmail)
      
      setDebugInfo(debugLog + `\n❌ NO MATCH for: ${normalizedSearchEmail}`)
      
      return null
      
    } catch (error) {
      console.error("❌ Critical error in family search:", error)
      setDebugInfo(`❌ Search error: ${error.message}`)
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

    // Validation for signup
    if (isSignup && !validateSignupForm()) {
      return
    }

    // Validation for joining
    if (isJoining && !name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setDebugInfo("🚀 Starting login...")

    try {
      console.log("🚀 Starting Google login process...")
      
      const auth: any = await getAuth()
      const provider: any = await getProvider()
      const db: any = await getDb()

      const { signInWithPopup } = await import("firebase/auth")
      const { doc, getDoc, setDoc, updateDoc, arrayUnion } = await import("firebase/firestore")

      console.log("🔐 Attempting Google sign-in...")
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      if (!user || !user.email) {
        throw new Error("No user or email returned from Google login")
      }

      console.log("✅ Google sign-in successful:")
      console.log("   User ID:", user.uid)
      console.log("   Email:", user.email)
      console.log("   Display Name:", user.displayName)
      
      setDebugInfo(`✅ Google Login Success!\n📧 Email: ${user.email}\n👤 Name: ${user.displayName}`)

      const displayName = isSignup || isJoining ? name.trim() : (user.displayName || "Dog Parent")

      const loggedInUser: User = {
        id: user.uid,
        name: displayName,
        email: user.email,
        avatar: user.photoURL || "/placeholder.svg",
      }

      // Check if user already exists with family data
      console.log("🔍 Checking if user already has family setup...")
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists() && userDoc.data()?.dogName && !isJoining) {
        console.log("✅ User already has family setup, logging in")
        toast({
          title: "Welcome Back!",
          description: "Logged in successfully.",
        })
        onLogin(loggedInUser)
        return
      }

      if (isJoining) {
        console.log("👥 User attempting to join existing family")
        setDebugInfo(prev => prev + "\n\n👥 Attempting to join family...")
        
        // Find any existing family by searching for families
        const familyDoc = await findUserInFamily(user.email, db)

        if (!familyDoc) {
          console.log("❌ No family found for joining attempt")
          toast({
            title: "No Family Found",
            description: "No family found for your email address. Check the debug info below or create a new family.",
            variant: "destructive",
          })
          setLoading(false)
          return
        }

        try {
          const familyData = familyDoc.data()
          console.log("📋 Found family for joining:", familyData.dogName)

          // Add user to family members list
          const newMember = { name: displayName, email: user.email }
          await updateDoc(doc(db, "users", familyDoc.id), {
            familyMembers: arrayUnion(newMember)
          })

          // Create user's own document with family data
          await setDoc(userDocRef, {
            name: displayName,
            email: user.email,
            dogName: familyData.dogName,
            familyMembers: [...(familyData.familyMembers || []), newMember],
            photoUrl: familyData.photoUrl,
            createdAt: new Date(),
          })

          console.log("✅ Successfully joined family!")
          toast({
            title: "Welcome to the Family!",
            description: `Successfully joined ${familyData.dogName}'s family.`,
          })
          onLogin(loggedInUser)
          return
        } catch (joinError) {
          console.error("❌ Error joining family:", joinError)
          toast({
            title: "Join Failed",
            description: "Failed to join family. Please try again.",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
      }

      if (isSignup) {
        console.log("🆕 Creating new family for signup")

        try {
          const userData = {
            name: displayName,
            email: user.email,
            dogName: dogName.trim(),
            familyMembers: [{ name: displayName, email: user.email }],
            createdAt: new Date(),
          }

          await setDoc(userDocRef, userData)
          console.log("✅ New family created successfully")
          
          toast({
            title: "Welcome to Berry!",
            description: `Family created for ${dogName}. Start tracking activities!`,
          })
          
          onLogin(loggedInUser)
          return
        } catch (signupError) {
          console.error("❌ Error creating new family:", signupError)
          toast({
            title: "Signup Failed",
            description: "Failed to create family. Please try again.",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
      }

      // Regular login - search for existing family
      console.log("🔍 Regular login - searching for existing family...")
      setDebugInfo(prev => prev + "\n\n🔍 Searching families...")
      
      try {
        const familyDoc = await findUserInFamily(user.email, db)
        
        if (familyDoc) {
          const familyData = familyDoc.data()
          console.log("🎉 Found existing family! Joining automatically")
          
          // Create user document with existing family data
          await setDoc(userDocRef, {
            name: displayName,
            email: user.email,
            dogName: familyData.dogName,
            familyMembers: familyData.familyMembers,
            photoUrl: familyData.photoUrl,
            createdAt: new Date(),
          })
          
          toast({
            title: "Welcome Back!",
            description: `Joined ${familyData.dogName}'s family successfully.`,
          })
          
          onLogin(loggedInUser)
        } else {
          console.log("❓ No family found - showing join form")
          
          // Show the join form with debug info
          setShowJoinForm(true)
          setLoading(false)
          
          toast({
            title: "Family Not Found",
            description: "Check the debug info below to see what happened.",
          })
        }
      } catch (searchError) {
        console.error("❌ Error searching for family:", searchError)
        
        setDebugInfo(prev => prev + `\n\n❌ Search Error: ${searchError.message}`)
        setShowJoinForm(true)
        setLoading(false)
        
        toast({
          title: "Search Error",
          description: "Error searching for families. Check debug info below.",
          variant: "destructive",
        })
      }

    } catch (err: any) {
      console.error("❌ Critical login error:", err)
      
      setDebugInfo(prev => prev + `\n\n❌ Login Error: ${err.message}`)
      
      if (err.code === "auth/unauthorized-domain") {
        toast({
          title: "Browser Issue",
          description: "Please use a different browser or enable third-party cookies.",
          variant: "destructive",
        })
      } else if (err.code === "auth/popup-closed-by-user") {
        toast({
          title: "Login Cancelled",
          description: "Please try logging in again.",
          variant: "destructive",
        })
      } else {
        setShowJoinForm(true)
        toast({
          title: "Login Error",
          description: "Check debug info below for details.",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    console.log("🔙 Going back to login page")
    setShowJoinForm(false)
    setName("")
    setDebugInfo("")
  }

  const handleCreateNewFamily = () => {
    console.log("🔄 Switching to create new family")
    setShowJoinForm(false)
    setActiveTab("signup")
  }

  // Show join form if user needs to join a family
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
            <CardDescription>We didn't find an existing family for your email. Check the debug info below.</CardDescription>
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

              {/* Debug Info Display */}
              {debugInfo && (
                <div className="bg-gray-100 p-3 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">🔍 Debug Info:</h4>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                    {debugInfo}
                  </pre>
                </div>
              )}

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-700 text-center">
                  💡 If the debug info shows your email wasn't found, ask the family admin to double-check the email address they added for you.
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
