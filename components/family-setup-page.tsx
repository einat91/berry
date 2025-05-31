"use client"

import type React from "react"

import { useState, useRef } from "react"
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const { storage } = await import("@/lib/firebaseConfig")
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
            <Image src="/images/berry-logo.png" alt="Berry" width={100} height={100} />
          </div>
          <CardTitle className="text-2xl font-bold">Set Up Your Family</CardTitle>
          <CardDescription>Tell us about your dog to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="dogName">Your Dog's Name</Label>
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
                className="relative cursor-pointer w-32 h-32 rounded-full border-2 border-black overflow-hidden flex items-center justify-center bg-amber-50"
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

            <Button type="submit" className="w-full">
              Create Family
            </Button>

            <p className="text-xs text-center text-gray-600">
              You'll get a family code to share with other family members
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
