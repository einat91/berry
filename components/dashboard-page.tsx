"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CalendarIcon,
  Clock,
  DropletIcon,
  CircleIcon,
  UtensilsIcon,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react"
import { format, addDays, subDays, isToday } from "date-fns"
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
  addedBy: string
}

interface DashboardPageProps {
  user: User
}

export function DashboardPage({ user }: DashboardPageProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [entries, setEntries] = useState<Entry[]>([])
  const [dogName, setDogName] = useState("")
  const [familyMembers, setFamilyMembers] = useState<string[]>([])
  const [familyCode, setFamilyCode] = useState("")
  const [selectedActivity, setSelectedActivity] = useState<"pee" | "poop" | "food" | null>(null)
  const [selectedTime, setSelectedTime] = useState(format(new Date(), "HH:mm"))
  const [selectedMember, setSelectedMember] = useState("")
  const [note, setNote] = useState("")
  const [copied, setCopied] = useState(false)
  const [firebaseReady, setFirebaseReady] = useState(false)
  const { toast } = useToast()

  // Initialize Firebase when component mounts
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const { initializeFirebase } = await import("@/lib/firebaseConfig")
        await initializeFirebase()
        setFirebaseReady(true)
      } catch (error) {
        console.error("Failed to initialize Firebase:", error)
      }
    }

    initFirebase()
  }, [])

  useEffect(() => {
    if (firebaseReady) {
      loadUserData()
      loadEntries()
    }
  }, [selectedDate, firebaseReady])

  useEffect(() => {
    if (familyMembers.length > 0 && !selectedMember) {
      setSelectedMember(familyMembers[0])
    }
  }, [familyMembers])

  const loadUserData = async () => {
    if (!firebaseReady) return

    try {
      const { getFirebaseServices } = await import("@/lib/firebaseConfig")
      const { db } = await getFirebaseServices()
      const { doc, getDoc } = await import("firebase/firestore")

      const docRef = doc(db, "users", user.id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        setDogName(data.dogName || "")
        setFamilyMembers(data.familyMembers || [user.firstName])
        setFamilyCode(data.familyCode || "")
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  const loadEntries = async () => {
    if (!firebaseReady) return

    try {
      const { getFirebaseServices } = await import("@/lib/firebaseConfig")
      const { db } = await getFirebaseServices()
      const { collection, query, where, getDocs, orderBy } = await import("firebase/firestore")

      const dateKey = format(selectedDate, "yyyy-MM-dd")
      const entriesRef = collection(db, "entries")
      const q = query(
        entriesRef,
        where("userId", "==", user.id),
        where("date", "==", dateKey),
        orderBy("timestamp", "desc"),
      )

      const querySnapshot = await getDocs(q)
      const loadedEntries = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      })) as Entry[]

      setEntries(loadedEntries)
    } catch (error) {
      console.error("Error loading entries:", error)
      // Fallback to localStorage if Firebase fails
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
  }

  const saveEntry = async (entry: Entry) => {
    if (!firebaseReady) return

    try {
      const { getFirebaseServices } = await import("@/lib/firebaseConfig")
      const { db } = await getFirebaseServices()
      const { collection, addDoc } = await import("firebase/firestore")

      const dateKey = format(selectedDate, "yyyy-MM-dd")
      const entryData = {
        ...entry,
        userId: user.id,
        date: dateKey,
        timestamp: entry.timestamp,
      }

      await addDoc(collection(db, "entries"), entryData)
    } catch (error) {
      console.error("Error saving entry to Firebase:", error)
      // Fallback to localStorage
      const dateKey = format(selectedDate, "yyyy-MM-dd")
      const stored = localStorage.getItem(`entries-${user.id}-${dateKey}`)
      const existingEntries = stored ? JSON.parse(stored) : []
      const updatedEntries = [...existingEntries, entry]
      localStorage.setItem(`entries-${user.id}-${dateKey}`, JSON.stringify(updatedEntries))
    }
  }

  const handleLogActivity = async () => {
    if (!firebaseReady) {
      toast({
        title: "App loading",
        description: "Please wait for the app to finish loading",
        variant: "destructive",
      })
      return
    }

    if (!selectedActivity) {
      toast({
        title: "Select an activity",
        description: "Please select an activity type (pee, poop, or food)",
        variant: "destructive",
      })
      return
    }

    if (!selectedMember) {
      toast({
        title: "Select a family member",
        description: "Please select who is logging this activity",
        variant: "destructive",
      })
      return
    }

    // Parse the time and combine with the selected date
    const timeArray = selectedTime.split(":")
    const hours = Number.parseInt(timeArray[0], 10)
    const minutes = Number.parseInt(timeArray[1], 10)

    const timestamp = new Date(selectedDate)
    timestamp.setHours(hours, minutes, 0, 0)

    const newEntry: Entry = {
      id: Date.now().toString(),
      type: selectedActivity,
      timestamp,
      addedBy: selectedMember,
      ...(note && selectedActivity === "food" && { notes: note }),
    }

    // Save to Firebase
    await saveEntry(newEntry)

    // Update local state
    const updatedEntries = [...entries, newEntry]
    setEntries(updatedEntries)

    // Reset form
    setSelectedActivity(null)
    if (selectedActivity === "food") {
      setNote("")
    }

    toast({
      title: "Activity logged",
      description: `${selectedActivity.charAt(0).toUpperCase() + selectedActivity.slice(1)} activity has been logged`,
    })
  }

  const getActivityIcon = (type: "pee" | "poop" | "food") => {
    switch (type) {
      case "pee":
        return <DropletIcon className="h-5 w-5" />
      case "poop":
        return <CircleIcon className="h-5 w-5" />
      case "food":
        return <UtensilsIcon className="h-5 w-5" />
    }
  }

  const handleSignOut = async () => {
    if (!firebaseReady) return

    try {
      const { getFirebaseServices } = await import("@/lib/firebaseConfig")
      const { auth } = await getFirebaseServices()
      const { signOut } = await import("firebase/auth")

      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
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

  const goToPreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1))
  }

  const goToNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1))
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 border-b border-gray-100">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/images/berry-logo.png" alt="Berry" width={120} height={40} />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Family Code: {familyCode}</span>
              <button
                onClick={copyFamilyCode}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Copy family code"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <Image
                src={user.avatar || "/placeholder.svg"}
                alt={user.name}
                width={24}
                height={24}
                className="rounded-full"
              />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-6 bg-white rounded-lg p-4 shadow-sm">
          <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <div className="flex items-center gap-2 text-blue-600">
              <CalendarIcon className="h-4 w-4" />
              <span className="font-medium">{format(selectedDate, "dd/MM/yyyy")}</span>
            </div>
            {isToday(selectedDate) && <span className="text-xs text-gray-500">Today</span>}
          </div>
          <Button variant="ghost" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {!isToday(selectedDate) && (
          <div className="text-center mb-4">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Go to Today
            </Button>
          </div>
        )}

        {/* Dog Info */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <span className="text-amber-700">🐶</span> {dogName}
          </h1>
          <p className="text-gray-600">{familyMembers.join(" & ")}</p>
        </div>

        {/* Log Activity Card */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="font-bold text-lg mb-4">Log Activity</h2>

          {/* Activity Type Buttons */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Button
              variant={selectedActivity === "pee" ? "default" : "outline"}
              className={`h-16 flex flex-col items-center justify-center ${
                selectedActivity === "pee" ? "bg-blue-400 hover:bg-blue-500" : "border-gray-200"
              }`}
              onClick={() => setSelectedActivity("pee")}
            >
              <DropletIcon className="h-5 w-5 mb-1" />
              <span>Pee</span>
            </Button>
            <Button
              variant={selectedActivity === "poop" ? "default" : "outline"}
              className={`h-16 flex flex-col items-center justify-center ${
                selectedActivity === "poop" ? "bg-amber-500 hover:bg-amber-600" : "border-gray-200"
              }`}
              onClick={() => setSelectedActivity("poop")}
            >
              <CircleIcon className="h-5 w-5 mb-1" />
              <span>Poop</span>
            </Button>
            <Button
              variant={selectedActivity === "food" ? "default" : "outline"}
              className={`h-16 flex flex-col items-center justify-center ${
                selectedActivity === "food" ? "bg-green-500 hover:bg-green-600" : "border-gray-200"
              }`}
              onClick={() => setSelectedActivity("food")}
            >
              <UtensilsIcon className="h-5 w-5 mb-1" />
              <span>Food</span>
            </Button>
          </div>

          {/* Time and Added By */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Time</span>
              </div>
              <Input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                <span>👤</span>
                <span>Added by</span>
              </div>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {familyMembers.map((member) => (
                    <SelectItem key={member} value={member}>
                      {member}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Note - Only for food */}
          {selectedActivity === "food" && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                <span>📝</span>
                <span>Note</span>
              </div>
              <Textarea placeholder="Quick note..." value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>
          )}

          {/* Log Button */}
          <Button
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800"
            onClick={handleLogActivity}
            disabled={!firebaseReady}
          >
            {firebaseReady ? "Log Activity" : "Loading..."}
          </Button>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-700 mb-1">No activities logged yet</h3>
              <p className="text-gray-500 text-sm">Start tracking {dogName}'s routine above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="font-bold text-lg mb-2">Recent Activities</h2>
              {entries
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-gray-100 rounded-full">{getActivityIcon(entry.type)}</div>
                    <div className="flex-1">
                      <div className="font-medium">{entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}</div>
                      <div className="text-sm text-gray-600">
                        {format(entry.timestamp, "h:mm a")} • Added by {entry.addedBy}
                      </div>
                      {entry.notes && <div className="text-sm text-gray-500 mt-1">{entry.notes}</div>}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
