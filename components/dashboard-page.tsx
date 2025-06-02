"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  PawPrint,
  UserPlus,
  X,
  AlertCircle,
} from "lucide-react"
import { format, addDays, subDays, isToday } from "date-fns"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { getAuth, getDb } from "@/lib/firebaseConfig"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface UserType {
  id: string
  name: string
  email: string
  avatar: string
}

interface Entry {
  id: string
  type: "pee" | "poop" | "food"
  timestamp: Date
  notes?: string
  addedBy: string
  amount?: string
  userId: string
  familyCode: string
}

interface FamilyMember {
  name: string
  email?: string
  userId?: string
}

interface DashboardPageProps {
  user: UserType
}

export function DashboardPage({ user }: DashboardPageProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [entries, setEntries] = useState<Entry[]>([])
  const [dogName, setDogName] = useState("")
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [familyCode, setFamilyCode] = useState("")
  const [selectedActivity, setSelectedActivity] = useState<"pee" | "poop" | "food" | null>(null)
  const [selectedTime, setSelectedTime] = useState(format(new Date(), "HH:mm"))
  const [selectedMember, setSelectedMember] = useState("")
  const [note, setNote] = useState("")
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [addingMember, setAddingMember] = useState(false)
  const { toast } = useToast()
  const [amount, setAmount] = useState("")
  const [showFamilyDialog, setShowFamilyDialog] = useState(false)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (familyCode) {
      loadEntries()
    }
  }, [selectedDate, familyCode])

  useEffect(() => {
    if (familyMembers.length > 0 && !selectedMember) {
      setSelectedMember(familyMembers[0]?.name || "")
    }
  }, [familyMembers])

  const loadUserData = async () => {
    try {
      const db: any = await getDb()
      const { doc, getDoc, collection, query, where, getDocs } = await import("firebase/firestore")

      // First try to get user's own document
      const userDocRef = doc(db, "users", user.id)
      const userDocSnap = await getDoc(userDocRef)

      let userData = null
      
      if (userDocSnap.exists()) {
        userData = userDocSnap.data()
      } else {
        // If user doesn't have a document, they might be part of someone else's family
        // Search for families where this user is a member
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("familyMembers", "array-contains", user.name))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          // Found a family that includes this user
          const familyDoc = querySnapshot.docs[0]
          userData = familyDoc.data()
          
          // Create user document with family data
          const { setDoc } = await import("firebase/firestore")
          await setDoc(userDocRef, {
            name: user.name,
            email: user.email,
            dogName: userData.dogName,
            familyMembers: userData.familyMembers,
            familyCode: userData.familyCode,
            photoUrl: userData.photoUrl,
            createdAt: new Date(),
          })
        }
      }

      if (userData) {
        setDogName(userData.dogName || "")
        
        // Convert familyMembers to proper format
        const members = userData.familyMembers || [user.name]
        const formattedMembers = members.map((member: any) => {
          if (typeof member === 'string') {
            return { name: member }
          }
          return member
        })
        
        setFamilyMembers(formattedMembers)
        setFamilyCode(userData.familyCode || "")
      } else {
        toast({
          title: "Setup Required",
          description: "Please complete your family setup first.",
          variant: "destructive",
        })
      }
      setLoading(false)
    } catch (error) {
      console.error("Error loading user data:", error)
      toast({
        title: "Database Error",
        description: "Failed to load your family data. Please check your connection and try again.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const loadEntries = async () => {
    if (!familyCode) return

    try {
      setLoadingEntries(true)
      const db: any = await getDb()
      const { collection, query, where, getDocs } = await import("firebase/firestore")

      const dateKey = format(selectedDate, "yyyy-MM-dd")
      const entriesRef = collection(db, "entries")

      // Fixed query - removed the problematic orderBy that was causing issues
      const q = query(
        entriesRef,
        where("familyCode", "==", familyCode),
        where("date", "==", dateKey)
      )

      const querySnapshot = await getDocs(q)
      const loadedEntries = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      })) as Entry[]

      // Sort in memory instead of using Firebase orderBy
      loadedEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      setEntries(loadedEntries)
      console.log(`Loaded ${loadedEntries.length} entries for ${dateKey}`)
    } catch (error) {
      console.error("Error loading entries:", error)
      toast({
        title: "Failed to Load Activities",
        description: "Could not load activities from database. Please check your connection.",
        variant: "destructive",
      })
      setEntries([])
    } finally {
      setLoadingEntries(false)
    }
  }

  const saveEntry = async (entry: Entry) => {
    if (!familyCode) {
      toast({
        title: "Family Setup Required",
        description: "Please complete your family setup before logging activities.",
        variant: "destructive",
      })
      return false
    }

    try {
      setSaving(true)
      const db: any = await getDb()
      const { collection, addDoc, Timestamp } = await import("firebase/firestore")

      const dateKey = format(selectedDate, "yyyy-MM-dd")
      const entryData = {
        type: entry.type,
        timestamp: Timestamp.fromDate(entry.timestamp),
        addedBy: entry.addedBy,
        userId: user.id,
        familyCode: familyCode,
        date: dateKey,
        createdAt: Timestamp.fromDate(new Date()),
        ...(entry.notes && { notes: entry.notes }),
        ...(entry.amount && { amount: entry.amount }),
      }

      const docRef = await addDoc(collection(db, "entries"), entryData)
      console.log("Entry saved successfully with ID:", docRef.id)

      const newEntryWithId = {
        ...entry,
        id: docRef.id,
      }

      setEntries((prevEntries) => [newEntryWithId, ...prevEntries])

      toast({
        title: "Activity Saved",
        description: `${entry.type.charAt(0).toUpperCase() + entry.type.slice(1)} activity saved to family account.`,
      })

      return true
    } catch (error) {
      console.error("Error saving entry:", error)
      toast({
        title: "Save Failed",
        description: "Failed to save activity to database. Please check your connection and try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setSaving(false)
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

    if (selectedActivity === "food" && (!amount.trim() || parseInt(amount) < 1 || parseInt(amount) > 200)) {
      toast({
        title: "Valid amount required",
        description: "Please enter a valid amount between 1-200 grams",
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
      id: "",
      type: selectedActivity,
      timestamp,
      addedBy: selectedMember,
      userId: user.id,
      familyCode: familyCode,
      ...(note && { notes: note }),
      ...(selectedActivity === "food" && amount && { amount: `${amount}g` }),
    }

    const success = await saveEntry(newEntry)

    if (success) {
      setSelectedActivity(null)
      setAmount("")
      setNote("")
    }
  }

  const getActivityIcon = (type: "pee" | "poop" | "food") => {
    switch (type) {
      case "pee":
        return <Droplets className="h-5 w-5" />
      case "poop":
        return <Circle className="h-5 w-5" />
      case "food":
        return <Utensils className="h-5 w-5" />
    }
  }

  const getActivityColor = (type: "pee" | "poop" | "food") => {
    switch (type) {
      case "pee":
        return "bg-yellow-500 text-white"
      case "poop":
        return "bg-amber-700 text-white"
      case "food":
        return "bg-blue-500 text-white"
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

  const addFamilyMember = async () => {
    if (!newMemberName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the family member",
        variant: "destructive",
      })
      return
    }

    try {
      setAddingMember(true)
      const db: any = await getDb()
      const { doc, updateDoc, arrayUnion } = await import("firebase/firestore")

      const userDocRef = doc(db, "users", user.id)
      const newMember = {
        name: newMemberName.trim(),
        ...(newMemberEmail.trim() && { email: newMemberEmail.trim() })
      }

      await updateDoc(userDocRef, {
        familyMembers: arrayUnion(newMember),
      })

      setFamilyMembers((prev) => [...prev, newMember])
      setNewMemberName("")
      setNewMemberEmail("")

      toast({
        title: "Family Member Added",
        description: `${newMemberName.trim()} has been added to your family.`,
      })
    } catch (error) {
      console.error("Error adding family member:", error)
      toast({
        title: "Failed to Add Member",
        description: "Could not add family member. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAddingMember(false)
    }
  }

  const removeFamilyMember = async (memberToRemove: FamilyMember) => {
    if (familyMembers.length <= 1) {
      toast({
        title: "Cannot Remove",
        description: "You need at least one family member.",
        variant: "destructive",
      })
      return
    }

    try {
      const db: any = await getDb()
      const { doc, updateDoc } = await import("firebase/firestore")

      const userDocRef = doc(db, "users", user.id)
      const updatedMembers = familyMembers.filter((m) => 
        m.name !== memberToRemove.name || m.email !== memberToRemove.email
      )

      await updateDoc(userDocRef, {
        familyMembers: updatedMembers,
      })

      setFamilyMembers(updatedMembers)

      toast({
        title: "Family Member Removed",
        description: `${memberToRemove.name} has been removed from your family.`,
      })
    } catch (error) {
      console.error("Error removing family member:", error)
      toast({
        title: "Failed to Remove Member",
        description: "Could not remove family member. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Image src="/images/berry-logo.png" alt="Berry" width={120} height={40} className="mx-auto mb-4" />
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your family account...</p>
        </div>
      </div>
    )
  }

  if (!familyCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Family Setup Required</h2>
          <p className="text-gray-600 mb-4">
            Your family account is not properly set up. Please complete the setup process to start tracking activities.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
    // UPDATE: Replace the header section in your dashboard-page.tsx (around line 400-450)
// Find this section and replace it:

      {/* Header */}
      <header className="bg-white p-4 border-b border-gray-100">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={goToToday} className="hover:opacity-80 transition-opacity">
              <Image src="/images/berry-logo.png" alt="Berry" width={150} height={50} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <Dialog open={showFamilyDialog} onOpenChange={setShowFamilyDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <UserPlus className="h-5 w-5 text-gray-600" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Family Members</DialogTitle>
                  <DialogDescription>Add or remove family members who can log activities.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Current Family Members</h3>
                    <div className="space-y-2">
                      {familyMembers.map((member, index) => (
                        <div key={`${member.name}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <div>
                              <span className="font-medium">{member.name}</span>
                              {member.email && (
                                <div className="text-xs text-gray-500">{member.email}</div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFamilyMember(member)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4 text-gray-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Add New Member</h3>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="memberName">Name *</Label>
                        <Input
                          id="memberName"
                          placeholder="Enter name"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="memberEmail">Email (optional)</Label>
                        <Input
                          id="memberEmail"
                          type="email"
                          placeholder="Enter email"
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={addFamilyMember}
                        disabled={addingMember || !newMemberName.trim()}
                        className="w-full"
                      >
                        {addingMember ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        ) : (
                          <span>Add Member</span>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Family Code</h3>
                    <p className="text-sm text-gray-500">
                      Share this code with others so they can join your family:
                    </p>
                    <div className="flex items-center gap-2">
                      <Input value={familyCode} readOnly className="font-mono" />
                      <Button onClick={copyFamilyCode} className="shrink-0">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowFamilyDialog(false)}>Done</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <Image
                src={user.avatar || "/placeholder.svg"}
                alt={user.name}
                width={32}
                height={32}
                className="rounded-full"
              />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* Date Navigation */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4 border border-gray-100 flex items-center justify-between">
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
        <div className="flex items-center justify-center gap-2 mb-4">
          <PawPrint className="h-5 w-5 text-gray-600" />
          <h1 className="text-lg font-bold text-gray-700">{dogName}</h1>
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
              <span className="text-sm">Pee</span>
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
              <span className="text-sm">Poop</span>
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
              <span className="text-sm">Food</span>
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
                  {familyMembers.map((member, index) => (
                    <SelectItem key={`${member.name}-${index}`} value={member.name}>
                      {member.name}
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
                <span>Amount (grams) *</span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  max="200"
                  placeholder="Enter grams (1-200)"
                  value={amount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 1 && value <= 200) {
                      setAmount(e.target.value);
                    } else if (e.target.value === "") {
                      setAmount("");
                    }
                  }}
                  className="pr-12"
                  required
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  grams
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Enter amount between 1-200 grams
              </div>
            </div>
          )}

          {/* Note */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span>Note</span>
            </div>
            <Input
              placeholder="Quick note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Log Button */}
          <Button
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3"
            onClick={handleLogActivity}
            disabled={selectedDate > new Date() || saving}
          >
            {saving ? "Saving..." : selectedDate > new Date() ? "Cannot log future activities" : "Log Activity"}
          </Button>
        </div>

        {/* Activities */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base text-gray-600">Activities</h2>
            {loadingEntries && (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-300"></div>
            )}
          </div>
          {entries.length === 0 && !loadingEntries ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-700 mb-1">No activities logged yet</h3>
              <p className="text-gray-500 text-sm">Start tracking {dogName}'s routine above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-full ${getActivityColor(entry.type)}`}>
                    {getActivityIcon(entry.type)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600">
                      {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                    </div>
                    <div className="text-xs text-gray-600">By {entry.addedBy}</div>
                    {entry.amount && <div className="text-xs text-blue-600 font-medium">{entry.amount}</div>}
                    {entry.notes && <div className="text-xs text-gray-500 mt-1">{entry.notes}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{format(entry.timestamp, "h:mm a")}</div>
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
