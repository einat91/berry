"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FamilySetupPageProps {
  onSetup: (dogName: string) => void
}

export function FamilySetupPage({ onSetup }: FamilySetupPageProps) {
  const [dogName, setDogName] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!dogName.trim()) {
      setError("Please enter your dog's name")
      return
    }

    onSetup(dogName)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src="/images/berry-logo.png" alt="Berry" className="h-12" />
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

            <div className="flex items-center justify-center">
              <img
                src="/placeholder.svg?height=120&width=120"
                alt="Dog illustration"
                className="rounded-full bg-amber-100 p-2"
              />
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
