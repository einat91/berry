"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle } from "lucide-react"
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
  const { toast } = useToast()

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
      <div className="w-full max-w-md space-y-8 flex-1 flex flex-col justify-center">
        <div className="text-center">
          {/* LOGO: Fixed - Removed the green background circle */}
          <div className="flex justify-center mb-4">
              <Image src="/images/berry-logo.png" alt="Berry" width={150} height={50} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Berry</h1>
          <p className="text-gray-600 mt-2">Track your dog's daily activities with your family</p>
        </div>

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
      
      {/* FOOTER with Privacy Policy - Kept small and subtle */}
      <div className="w-full text-center py-4 text-[10px] text-gray-400 space-x-2">
         <a href="https://www.iubenda.com/privacy-policy/65370946" className="iubenda-white iubenda-noiframe iubenda-embed iubenda-noiframe hover:underline" title="Privacy Policy">Privacy Policy</a>
         <span>•</span>
         <a href="https://www.iubenda.com/privacy-policy/65370946/cookie-policy" className="iubenda-white iubenda-noiframe iubenda-embed iubenda-noiframe hover:underline" title="Cookie Policy">Cookie Policy</a>
      </div>
    </div>
  )
}
