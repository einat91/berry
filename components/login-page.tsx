"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { getAuth, getDb, getProvider } from "@/lib/firebaseConfig"
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore"

export function LoginPage({ onLogin }: { onLogin: (user: any) => void }) {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [dogName, setDogName] = useState("")
  const [error, setError] = useState<string | null>(null)
  
  // DIAGNOSTICS STATE
  const [envStatus, setEnvStatus] = useState<any>(null)
  
  const { toast } = useToast()

  // 1. Check if keys exist (Diagnostics)
  useEffect(() => {
    const keys = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    };
    
    // Check if keys are present (we don't show the full key for security, just Yes/No)
    setEnvStatus({
        hasApiKey: !!keys.apiKey && keys.apiKey.length > 0,
        hasAuthDomain: !!keys.authDomain && keys.authDomain.length > 0,
        hasProjectId: !!keys.projectId && keys.projectId.length > 0,
        keyPreview: keys.apiKey ? `${keys.apiKey.substring(0, 4)}...` : "None"
    });

    const checkConnection = async () => {
        try {
            await getAuth();
        } catch (err: any) {
            console.error("Firebase Init Error:", err);
            setError(err.message || "Failed to connect to Database.");
        }
    }
    checkConnection();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const auth: any = await getAuth()
      const db: any = await getDb()
      
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        onLogin(userCredential.user)
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user
        
        await updateProfile(user, { displayName: name })
        
        await setDoc(doc(db, "users", user.uid), {
          name,
          email,
          dogName,
          familyMembers: [name],
          createdAt: new Date(),
          photoUrl: null
        })
        
        onLogin({ ...user, displayName: name })
      }
    } catch (err: any) {
      console.error("Auth error:", err)
      let message = "Authentication failed"
      if (err.code === 'auth/invalid-credential') message = "Invalid email or password"
      else if (err.code === 'auth/email-already-in-use') message = "Email already registered"
      else if (err.code === 'auth/weak-password') message = "Password should be at least 6 characters"
      
      setError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const auth: any = await getAuth()
      const provider: any = await getProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      const db: any = await getDb()

      const userDoc = await getDoc(doc(db, "users", user.uid))
      
      if (!userDoc.exists()) {
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("familyMembers", "array-contains", user.displayName))
        const querySnapshot = await getDocs(q)
        
        let existingData = null
        if (!querySnapshot.empty) {
          existingData = querySnapshot.docs[0].data()
        }

        await setDoc(doc(db, "users", user.uid), {
          name: user.displayName,
          email: user.email,
          dogName: existingData?.dogName || "My Dog",
          familyMembers: existingData?.familyMembers || [user.displayName],
          photoUrl: user.photoURL,
          createdAt: new Date()
        })
      }
      onLogin(user)
    } catch (err: any) {
      console.error("Google auth error:", err)
      setError(err.message || "Failed to sign in with Google")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-teal-100 p-3 rounded-full">
              <Image src="/images/berry-logo.png" alt="Berry" width={120} height={40} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Berry</h1>
          <p className="text-gray-600 mt-2">Track your dog's daily activities with your family</p>
        </div>

        {/* DIAGNOSTICS BOX */}
        {envStatus && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm space-y-2">
                <h3 className="font-semibold text-gray-700 border-b pb-1">System Check</h3>
                <div className="flex items-center justify-between">
                    <span>API Key Found:</span>
                    {envStatus.hasApiKey ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-red-500"/>}
                </div>
                <div className="flex items-center justify-between">
                    <span>Auth Domain Found:</span>
                    {envStatus.hasAuthDomain ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-red-500"/>}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Key Start: {envStatus.keyPreview}</span>
                </div>
                {!envStatus.hasApiKey && (
                    <div className="text-red-600 text-xs mt-2 font-medium">
                        CRITICAL: Vercel does not have the API Key. Go to Vercel Settings {'>'} Environment Variables and add it.
                    </div>
                )}
            </div>
        )}

        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="block sm:inline">{error}</span>
                </div>
            </div>
        )}

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <form onSubmit={handleEmailAuth} className="space-y-6">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input 
                    id="name" 
                    placeholder="John Doe" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dogName">Dog's Name</Label>
                  <Input 
                    id="dogName" 
                    placeholder="Buddy" 
                    value={dogName}
                    onChange={(e) => setDogName(e.target.value)}
                    required 
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>

            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isLogin ? "Sign In" : "Create Account")}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                Google
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              className="font-medium text-teal-600 hover:text-teal-500"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
