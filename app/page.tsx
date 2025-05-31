"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarIcon, Clock, LogOut, User } from "lucide-react"
import { format, parseISO, addDays, subDays } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { LoginPage } from "@/components/login-page"
import { FamilySetupPage } from "@/components/family-setup-page"
import { cn } from "@/lib/utils"

interface Entry {
  id: string
  type: "pee" | "poop" | "food"
  timestamp: string
  notes?: string
  amount?: string
  foodType?: string
  addedBy: string
}

interface UserType {
  id: string
  name: string
  email: string
  avatar: string
  firstName: string
}

interface FamilyMember {
  id: string
  name: string
  email: string
  avatar: string
}

interface DogInfo {
  name: string
  familyCode: string
  members: FamilyMember[]
}

export default function BerryApp() {
  const [user, setUser] = useState<UserType | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dogInfo, setDogInfo] = useState<DogInfo | null>(null)
  const [showFamilySetup, setShowFamilySetup] = useState(false)
  const [activeTab, setActiveTab] = useState<"pee" | "poop" | "food">("pee")
  const [note, setNote] = useState("")
  const [selectedMember, setSelectedMember] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState(format(new Date(), "HH:mm"))

  // Load data from localStorage on initial render
  useEffect(() => {
    const savedUser = localStorage.getItem("berry-user")
    const savedEntries = localStorage.getItem("berry-entries")
    const savedDogInfo = localStorage.getItem("berry-dog-info")

    if (savedUser) {
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)

      // Set selected member to current user if not set
      if (parsedUser && !selectedMember) {
        setSelectedMember(parsedUser.id)
      }
    }

    if (savedEntries) {
      setEntries(JSON.parse(savedEntries))
    }

    if (savedDogInfo) {
      setDogInfo(JSON.parse(savedDogInfo))
    }
  }, [])

  // Update selected member when user changes
  useEffect(() => {
    if (user && !selectedMember) {
      setSelectedMember(user.id)
    }
  }, [user, selectedMember])

  const handleLogin = (userData: UserType) => {
    // If first time login, show family setup
    if (!localStorage.getItem("berry-dog-info")) {
      setUser(userData)
      setShowFamilySetup(true)
      localStorage.setItem("berry-user", JSON.stringify(userData))
    } else {
      setUser(userData)
      localStorage.setItem("berry-user", JSON.stringify(userData))
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("berry-user")
  }

  const handleFamilySetup = (dogName: string) => {
    // Generate a random 6-character family code
    const familyCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const newDogInfo: DogInfo = {
      name: dogName,
      familyCode: familyCode,
      members: user
        ? [
            {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
            },
          ]
        : [],
    }

    setDogInfo(newDogInfo)
    setShowFamilySetup(false)
    localStorage.setItem("berry-dog-info", JSON.stringify(newDogInfo))
  }

  const addEntry = () => {
    if (!user) return

    const newEntry: Entry = {
      id: Date.now().toString(),
      type: activeTab,
      timestamp: new Date().toISOString(),
      notes: note || undefined,
      addedBy: user.firstName || user.name,
    }

    const updatedEntries = [newEntry, ...entries]
    setEntries(updatedEntries)
    localStorage.setItem("berry-entries", JSON.stringify(updatedEntries))

    // Reset form
    setNote("")
  }

  const getFilteredEntries = () => {
    return entries
      .filter((entry) => {
        const entryDate = parseISO(entry.timestamp)
        return (
          entryDate.getDate() === selectedDate.getDate() &&
          entryDate.getMonth() === selectedDate.getMonth() &&
          entryDate.getFullYear() === selectedDate.getFullYear()
        )
      })
      .sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })
  }

  const handlePreviousDay = () => {
    setSelectedDate((prevDate) => subDays(prevDate, 1))
  }

  const handleNextDay = () => {
    setSelectedDate((prevDate) => addDays(prevDate, 1))
  }

  const getMemberName = (id: string) => {
    if (!dogInfo) return ""
    const member = dogInfo.members.find((m) => m.id === id)
    return member ? member.name : ""
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  if (showFamilySetup) {
    return <FamilySetupPage onSetup={handleFamilySetup} />
  }

  const filteredEntries = getFilteredEntries()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/images/berry-logo.png" alt="Berry" className="h-6" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img
                src={user.avatar || "/placeholder.svg?height=32&width=32"}
                alt={user.name}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm font-medium text-gray-700">{user.firstName || user.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Dog Name and Family */}
        {dogInfo && (
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900">🐶 {dogInfo.name}</h1>
            <p className="text-sm text-gray-600">{dogInfo.members.map((m) => m.name.split(" ")[0]).join(" & ")}</p>
          </div>
        )}

        {/* Date Selector */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="icon" onClick={handlePreviousDay}>
            <span className="sr-only">Previous day</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-center text-center font-normal",
                  !selectedDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={handleNextDay}>
            <span className="sr-only">Next day</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Log Activity Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-lg font-medium mb-4">Log Activity</h2>

            {/* Activity Type Tabs */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Button
                variant={activeTab === "pee" ? "default" : "outline"}
                className="h-16"
                onClick={() => setActiveTab("pee")}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">💧</div>
                  <div className="text-sm">Pee</div>
                </div>
              </Button>

              <Button
                variant={activeTab === "poop" ? "default" : "outline"}
                className="h-16"
                onClick={() => setActiveTab("poop")}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">💩</div>
                  <div className="text-sm">Poop</div>
                </div>
              </Button>

              <Button
                variant={activeTab === "food" ? "default" : "outline"}
                className="h-16"
                onClick={() => setActiveTab("food")}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">🍽️</div>
                  <div className="text-sm">Food</div>
                </div>
              </Button>
            </div>

            {/* Time Input */}
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium">Time</span>
              <div className="flex-1">
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="ml-2"
                />
              </div>
            </div>

            {/* Added By */}
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium">Added by</span>
              <div className="flex-1">
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="ml-2">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {dogInfo?.members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Note Input (only for food) */}
            {activeTab === "food" && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Note</span>
                </div>
                <Textarea placeholder="Quick note..." value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              </div>
            )}

            {/* Log Button */}
            <Button className="w-full" onClick={addEntry}>
              Log Activity
            </Button>
          </CardContent>
        </Card>

        {/* Activity List */}
        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 mx-auto mb-3 text-gray-300 flex items-center justify-center rounded-full bg-gray-100">
                <Clock className="w-8 h-8" />
              </div>
              <p className="font-medium">No activities logged yet</p>
              <p className="text-sm mt-1">Start tracking {dogInfo?.name}'s routine above!</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {entry.type === "pee" && "💧"}
                    {entry.type === "poop" && "💩"}
                    {entry.type === "food" && "🍽️"}
                  </div>
                  <div>
                    <div className="font-medium capitalize">{entry.type}</div>
                    {entry.notes && <div className="text-sm text-gray-600">{entry.notes}</div>}
                    <div className="text-xs text-gray-500">Added by {entry.addedBy}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{format(parseISO(entry.timestamp), "h:mm a")}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Family Code */}
        {dogInfo && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">Family Code</p>
            <p className="text-lg font-mono font-bold">{dogInfo.familyCode}</p>
            <p className="text-xs text-gray-500 mt-1">Share this code with family members to join</p>
          </div>
        )}
      </main>
    </div>
  )
}

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
