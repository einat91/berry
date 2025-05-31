"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Droplets,
  Circle,
  Utensils,
  User,
  FileText,
  Dog,
} from "lucide-react"
import { format, addDays, subDays, isToday } from "date-fns"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { getAuth, getDb } from "@/lib/firebaseConfig"

interface UserType {
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
  amount?: string
}

interface DashboardPageProps {
  user: UserType
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
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [amount, setAmount] = useState("")

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    loadEntries()
  }, [selectedDate])

  useEffect(() => {
    if (familyMembers.length > 0 && !selectedMember) {
      setSelectedMember(familyMembers[0])
    }
  }, [familyMembers])

  const loadUserData = async () => {
    try {
      const db: any = await getDb()
      const { doc, getDoc } = await import("firebase/firestore")

      const docRef = doc(db, "users", user.id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        setDogName(data.dogName || "")
        setFamilyMembers(data.familyMembers || [user.firstName])
        setFamilyCode(data.familyCode || "")
      }
      setLoading(false)
    } catch (error) {
      console.error("Error loading user data:", error)
      setLoading(false)
    }
  }

  const loadEntries = async () => {
    try {
      const db: any = await getDb()
      const { collection, query, where, getDocs, orderBy } = await import("firebase/firestore")

      const dateKey = format(selectedDate, "yyyy-MM-dd")
      const entriesRef = collection(db, "entries")

      const q = query(
        entriesRef,
        where("familyCode", "==", familyCode),
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
      const dateKey = format(selectedDate, "yyyy-MM-dd")
      const stored = localStorage.getItem(`entries-${familyCode}-${dateKey}`)
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
    try {
      const db: any = await getDb()
      const { collection, addDoc } = await import("firebase/firestore")

      const dateKey = format(selectedDate, "yyyy-MM-dd")
      const entryData = {
        ...entry,
        userId: user.id,
        familyCode: familyCode,
        date: dateKey,
        timestamp: entry.timestamp,
      }

      await addDoc(collection(db, "entries"), entryData)

      const stored = localStorage.getItem(`entries-${familyCode}-${dateKey}`)
      const existingEntries = stored ? JSON.parse(stored) : []
      const updatedEntries = [...existingEntries, entry]
      localStorage.setItem(`entries-${familyCode}-${dateKey}`, JSON.stringify(updatedEntries))

      console.log("Entry saved successfully")
    } catch (error) {
      console.error("Error saving entry:", error)
      const dateKey = format(selectedDate, "yyyy-MM-dd")
      const stored = localStorage.getItem(`entries-${familyCode}-${dateKey}`)
      const existingEntries = stored ? JSON.parse(stored) : []
      const updatedEntries = [...existingEntries, entry]
      localStorage.setItem(`entries-${familyCode}-${dateKey}`, JSON.stringify(updatedEntries))

      toast({
        title: "Saved locally",
        description: "Entry saved to device. Will sync when connection is restored.",
      })
    }
  }

  const handleLogActivity = async () => {
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

    if (selectedActivity === "food" && !amount.trim()) {
      toast({
        title: "Amount required",
        description: "Please enter the amount of food",
        variant: "destructive",
      })
      return
    }

    if (selectedDate > new Date()) {
      toast({
        title: "Cannot log future activities",
        description: "You can only log activities for today or past dates",
        variant: "destructive",
      })
      return
    }

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
      ...(note && { notes: note }),
      ...(selectedActivity === "food" && amount && { amount: amount }),
    }

    await saveEntry(newEntry)

    const updatedEntries = [...entries, newEntry]
    setEntries(updatedEntries)

    setSelectedActivity(null)
    setAmount("")
    setNote("")

    toast({
      title: "Activity logged",
      description: `${selectedActivity.charAt(0).toUpperCase() + selectedActivity.slice(1)} activity has been logged`,
    })
  }

  const getActivityIcon = (type: "pee" | "poop" | "food") => {
    switch (type) {
      case "pee":
        return <Droplets className="h-6 w-6" />
      case "poop":
        return <Circle className="h-6 w-6" />
      case "food":
        return <Utensils className="h-6 w-6" />
    }
  }

  const getActivityColor = (type: "pee" | "poop" | "food") => {
    switch (type) {
      case "pee":
        return "bg-yellow-100 text-yellow-700"
      case "poop":
        return "bg-amber-100 text-amber-800"
      case "food":
        return "bg-blue-100 text-blue-700"
    }
  }

  const handleSignOut = async () => {
    try {
      const auth: any = await getAuth()
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Image src="/images/berry-logo.png" alt="Berry" width={120} height={40} className="mx-auto mb-4" />
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 border-b border-gray-100">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={goToToday} className="hover:opacity-80 transition-opacity">
              <Image src="/images/berry-logo.png" alt="Berry" width={150} height={50} />
            </button>
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
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6 border border-gray-100 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousDay}
            className="h-8 w-8 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 text-gray-600">
            <CalendarIcon className="h-4 w-4" />
            <div className="text-sm">{format(selectedDate, "dd/MM/yyyy")}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextDay}
            disabled={isToday(selectedDate) || selectedDate > new Date()}
            className="h-8 w-8 rounded-full hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Dog Info */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Dog className="h-5 w-5 text-gray-600" />
          <h1 className="text-lg text-gray-600">{dogName}</h1>
        </div>

        {/* Log Activity Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-base text-gray-600 mb-6">Log Activity</h2>

          {/* Activity Type Buttons */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              className={`h-20 flex flex-col items-center justify-center gap-2 rounded-lg border ${
                selectedActivity === "pee"
                  ? "bg-yellow-500 text-white border-yellow-500"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setSelectedActivity("pee")}
            >
              <Droplets className="h-6 w-6" />
              <span className="font-medium">Pee</span>
            </button>
            <button
              className={`h-20 flex flex-col items-center justify-center gap-2 rounded-lg border ${
                selectedActivity === "poop"
                  ? "bg-amber-700 text-white border-amber-700"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setSelectedActivity("poop")}
            >
              <Circle className="h-6 w-6" />
              <span className="font-medium">Poop</span>
            </button>
            <button
              className={`h-20 flex flex-col items-center justify-center gap-2 rounded-lg border ${
                selectedActivity === "food"
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setSelectedActivity("food")}
            >
              <Utensils className="h-6 w-6" />
              <span className="font-medium">Food</span>
            </button>
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
                <User className="h-4 w-4" />
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

          {/* Amount - Only for food */}
          {selectedActivity === "food" && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                <Utensils className="h-4 w-4" />
                <span>Amount *</span>
              </div>
              <Input
                placeholder="e.g., 1 cup, 100g"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          )}

          {/* Note */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span>Note</span>
            </div>
            <Textarea
              placeholder="Quick note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Log Button */}
          <Button
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3"
            onClick={handleLogActivity}
            disabled={selectedDate > new Date()}
          >
            {selectedDate > new Date() ? "Cannot log future activities" : "Log Activity"}
          </Button>
        </div>

        {/* Activities */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-base text-gray-600 mb-4">Activities</h2>
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
              {entries
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className={`p-3 rounded-full ${getActivityColor(entry.type)}`}>
                      {getActivityIcon(entry.type)}
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-600">{entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}</div>
                      <div className="text-sm text-gray-600">{entry.addedBy}</div>
                      {entry.amount && <div className="text-sm text-blue-600 font-medium">{entry.amount}</div>}
                      {entry.notes && <div className="text-sm text-gray-500 mt-1">{entry.notes}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-gray-600">{format(entry.timestamp, "h:mm a")}</div>
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
