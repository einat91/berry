"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera } from "lucide-react"
import Image from "next/image"

interface FamilySetupPageProps {
  onSetup: (dogName: string, photoUrl: string | null) => void
}

export function FamilySetupPage({ onSetup }: FamilySetupPageProps) {
  const [dogName, setDogName] = useState("")
  const [error, setError] = useState("")
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [firebaseReady, setFirebaseReady] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize Firebase when component mounts
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const { initializeFirebase } = await import("@/lib/firebaseConfig")
        await initializeFirebase()
        setFirebaseReady(true)
      } catch (error) {
        console.error("Failed to initialize Firebase:", error)
        setError("Failed to initialize app. Please refresh the page.")
      }
    }

    initFirebase()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!dogName.trim()) {
      setError("Please enter your dog's name")
      return
    }

    onSetup(dogName, photoUrl)
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!firebaseReady) {
      setError("App is still loading. Please wait a moment.")
      return
    }

    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)

      const { getFirebaseServices } = await import("@/lib/firebaseConfig")
      const { storage } = await getFirebaseServices()
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage")

      const storageRef = ref(storage, `dog-photos/${Date.now()}-${file.name}`)
      await uploadBytes(storageRef, file)
      const downloadUrl = await getDownloadURL(storageRef)
      setPhotoUrl(downloadUrl)
    } catch (error) {
      console.error("Error uploading photo:", error)
      setError("Failed to upload photo. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image src="/images/berry-logo.png" alt="Berry" width={200} height={60} />
          </div>
          <CardTitle className="text-2xl font-bold">Set Up Your Family</CardTitle>
          <CardDescription>Tell us about your dog to get started</CardDescription>
        </CardHeader>
        <CardContent>
          {!firebaseReady ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300 mx-auto mb-4"></div>
              <p className="text-gray-600">Initializing app...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dogName">Our dog's name is:</Label>
                <Input
                  id="dogName"
                  placeholder="Enter your dog's name"
                  value={dogName}
                  onChange={(e) => setDogName(e.target.value)}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>

              <div className="flex flex-col items-center justify-center">
                <div
                  onClick={handlePhotoClick}
                  className="relative cursor-pointer w-32 h-32 rounded-full border-2 border-gray-300 overflow-hidden flex items-center justify-center bg-gray-50"
                >
                  {photoUrl ? (
                    <Image src={photoUrl || "/placeholder.svg"} alt="Dog" fill className="object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <Camera className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-500 mt-1">Add photo</span>
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <p className="text-sm text-gray-500 mt-2">Click to add a photo of your dog</p>
              </div>

              <Button type="submit" className="w-full" disabled={!firebaseReady}>
                Create Family
              </Button>

              <p className="text-xs text-center text-gray-600">
                You'll get a family code to share with other family members
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
