"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Users, Camera, Copy, Check } from "lucide-react"
import { format, isToday } from "date-fns"
import { AddEntryDialog } from "./add-entry-dialog"
import { auth, db, storage } from "@/lib/firebaseConfig"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { signOut } from "firebase/auth"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  name: string
  email: string
  avatar: string
  firstName: string
}

interface Entry {
  id: string
  type: "pee" | "poop" | "food"
  timestamp: Date
  notes?: string
  amount?: string
  foodType?: string
  addedBy: string
}

interface DashboardPageProps {
  user: User
}

export function DashboardPage({ user }: DashboardPageProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [entries, setEntries] = useState<Entry[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<"pee" | "poop" | "food">("pee")
  const [dogName, setDogName] = useState("")
  const [familyMembers, setFamilyMembers] = useState<string[]>([])
  const [familyCode, setFamilyCode] = useState("")
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadUserData()
    loadEntries()
  }, [selectedDate])

  const loadUserData = async () => {
    try {
      const docRef = doc(db, "users", user.id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        setDogName(data.dogName || "")
        setFamilyMembers(data.familyMembers || [])
        setFamilyCode(data.familyCode || "")
        setPhotoUrl(data.photoUrl || null)
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  const loadEntries = () => {
    // Load from localStorage for now
    const dateKey = format(selectedDate, "yyyy-MM-dd")
    const stored = localStorage.getItem(`entries-${user.id}-${dateKey}`)
    if (stored) {
      const parsedEntries = JSON.parse(stored).map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }))
      setEntries(parsedEntries)
    } else {
      setEntries([])
    }
  }

  const saveEntries = (newEntries: Entry[]) => {
    const dateKey = format(selectedDate, "yyyy-MM-dd")
    localStorage.setItem(`entries-${user.id}-${dateKey}`, JSON.stringify(newEntries))
  }

  const handleAddEntry = (entryData: Omit<Entry, "id" | "timestamp" | "addedBy">) => {
    const newEntry: Entry = {
      ...entryData,
      id: Date.now().toString(),
      timestamp: new Date(),
      addedBy: user.firstName,
    }

    const updatedEntries = [...entries, newEntry]
    setEntries(updatedEntries)
    saveEntries(updatedEntries)
  }

  const openDialog = (type: "pee" | "poop" | "food") => {
    setDialogType(type)
    setDialogOpen(true)
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const getEntriesByType = (type: "pee" | "poop" | "food") => {
    return entries.filter((entry) => entry.type === type)
  }

  const getTypeEmoji = (type: "pee" | "poop" | "food") => {
    switch (type) {
      case "pee":
        return "💧"
      case "poop":
        return "💩"
      case "food":
        return "🍽️"
    }
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const storageRef = ref(storage, `dog-photos/${user.id}/${Date.now()}-${file.name}`)
      await uploadBytes(storageRef, file)
      const downloadUrl = await getDownloadURL(storageRef)

      // Update user document with new photo URL
      const userRef = doc(db, "users", user.id)
      await updateDoc(userRef, {
        photoUrl: downloadUrl,
      })

      setPhotoUrl(downloadUrl)
      toast({
        title: "Photo updated",
        description: "Your dog's photo has been updated successfully.",
      })
    } catch (error) {
      console.error("Error uploading photo:", error)
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const copyFamilyCode = () => {
    navigator.clipboard.writeText(familyCode)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Family code copied to clipboard",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Image src="/images/berry-logo.png" alt="Berry" width={60} height={60} />
            <div>
              <h1 className="text-2xl font-bold">{dogName} 🐶</h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600">Family Code: {familyCode}</p>
                <button
                  onClick={copyFamilyCode}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Copy family code"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
            <img src={user.avatar || "/placeholder.svg"} alt={user.name} className="w-8 h-8 rounded-full" />
          </div>
        </div>

        {/* Dog Photo */}
        <div className="flex justify-center mb-6">
          <div
            onClick={handlePhotoClick}
            className="relative cursor-pointer w-32 h-32 rounded-full border-2 border-black overflow-hidden flex items-center justify-center bg-amber-50"
          >
            {photoUrl ? (
              <Image src={photoUrl || "/placeholder.svg"} alt={dogName} fill className="object-cover" />
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
        </div>

        {/* Date Selector */}
        <div className="flex justify-center mb-6">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
                {isToday(selectedDate) && " (Today)"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Quick Add Buttons */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Button onClick={() => openDialog("pee")} className="h-20 flex flex-col gap-2 bg-blue-500 hover:bg-blue-600">
            <span className="text-2xl">💧</span>
            <span>Pee</span>
          </Button>
          <Button
            onClick={() => openDialog("poop")}
            className="h-20 flex flex-col gap-2 bg-amber-600 hover:bg-amber-700"
          >
            <span className="text-2xl">💩</span>
            <span>Poop</span>
          </Button>
          <Button
            onClick={() => openDialog("food")}
            className="h-20 flex flex-col gap-2 bg-green-600 hover:bg-green-700"
          >
            <span className="text-2xl">🍽️</span>
            <span>Food</span>
          </Button>
        </div>

        {/* Activity Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {["pee", "poop", "food"].map((type) => {
            const typeEntries = getEntriesByType(type as "pee" | "poop" | "food")
            return (
              <Card key={type}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span>{getTypeEmoji(type as "pee" | "poop" | "food")}</span>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{typeEntries.length}</div>
                  <p className="text-xs text-gray-600">{isToday(selectedDate) ? "today" : "this day"}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Entries</CardTitle>
            <CardDescription>
              {isToday(selectedDate) ? "Today's activities" : `Activities for ${format(selectedDate, "MMM d, yyyy")}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No entries for this day</p>
            ) : (
              <div className="space-y-3">
                {entries
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getTypeEmoji(entry.type)}</span>
                        <div>
                          <div className="font-medium">
                            {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                            {entry.foodType && ` - ${entry.foodType}`}
                            {entry.amount && ` (${entry.amount})`}
                          </div>
                          <div className="text-sm text-gray-600">
                            {format(entry.timestamp, "h:mm a")} • Added by {entry.addedBy}
                          </div>
                          {entry.notes && <div className="text-sm text-gray-500 mt-1">{entry.notes}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Family Members */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Family Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {familyMembers.map((member, index) => (
                <div key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {member}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <AddEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={dialogType}
        onAdd={handleAddEntry}
        selectedDate={selectedDate}
      />
    </div>
  )
}
