"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"

interface User {
  id: string
  name: string
  email: string
  avatar: string
  firstName: string
}

interface LoginPageProps {
  onLogin: (user: User) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<string>("signup")
  const [firstName, setFirstName] = useState("")
  const [familyCode, setFamilyCode] = useState("")
  const [error, setError] = useState("")

  const handleGoogleLogin = (isJoining = false) => {
    if (activeTab === "join" && !familyCode) {
      setError("Please enter a family code")
      return
    }

    if ((activeTab === "signup" || activeTab === "login") && !firstName) {
      setError("Please enter your first name")
      return
    }

    // Mock Google login - in real app, this would use NextAuth with Google provider
    const mockUser: User = {
      id: Date.now().toString(),
      name: "Dog Parent",
      email: "parent@example.com",
      avatar: "/placeholder.svg?height=32&width=32",
      firstName: firstName,
    }

    // If joining a family, we'd validate the family code here
    if (isJoining) {
      // In a real app, we would check if the family code exists
      const savedDogInfo = localStorage.getItem("berry-dog-info")
      if (savedDogInfo) {
        const dogInfo = JSON.parse(savedDogInfo)
        if (dogInfo.familyCode === familyCode) {
          // Add the new member to the family
          dogInfo.members.push({
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            avatar: mockUser.avatar,
          })
          localStorage.setItem("berry-dog-info", JSON.stringify(dogInfo))
          onLogin(mockUser)
          return
        }
      }
      setError("Invalid family code")
      return
    }

    onLogin(mockUser)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src="/images/berry-logo.png" alt="Berry" className="h-12" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Berry</CardTitle>
          <CardDescription>Track your dog's daily activities with your family</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signup" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="join">Join Family</TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Your First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>

                <Button onClick={() => handleGoogleLogin(false)} className="w-full h-12">
                  <GoogleIcon className="w-5 h-5 mr-3" />
                  Sign up with Google
                </Button>

                {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                <p className="text-xs text-center text-gray-600 mt-4">
                  You'll create a new family account for your dog
                </p>
              </div>
            </TabsContent>

            <TabsContent value="login">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginFirstName">Your First Name</Label>
                  <Input
                    id="loginFirstName"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>

                <Button onClick={() => handleGoogleLogin(false)} className="w-full h-12">
                  <GoogleIcon className="w-5 h-5 mr-3" />
                  Log in with Google
                </Button>

                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              </div>
            </TabsContent>

            <TabsContent value="join">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="joinFirstName">Your First Name</Label>
                  <Input
                    id="joinFirstName"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
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

                <Button onClick={() => handleGoogleLogin(true)} className="w-full h-12">
                  <GoogleIcon className="w-5 h-5 mr-3" />
                  Join with Google
                </Button>

                {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                <p className="text-xs text-center text-gray-600 mt-4">Ask your family member for the 6-digit code</p>
              </div>
            </TabsContent>
          </Tabs>
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
