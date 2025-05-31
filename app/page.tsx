"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarIcon, Clock, LogOut, User } from "lucide-react"
import { format, parseISO, addDays, subDays, setHours, setMinutes } from "date-fns"
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

  useEffect(() => {
    const savedUser = localStorage.getItem("berry-user")
    const savedEntries = localStorage.getItem("berry-entries")
    const savedDogInfo = localStorage.getItem("berry-dog-info")

    if (savedUser) {
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)
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

  useEffect(() => {
    if (user && !selectedMember) {
      setSelectedMember(user.id)
    }
  }, [user, selectedMember])

  const handleLogin = (userData: UserType) => {
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
    const familyCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const newDogInfo: DogInfo = {
      name: dogName,
      familyCode,
      members: user
        ? [{ id: user.id, name: user.name, email: user.email, avatar: user.avatar }]
        : [],
    }
    setDogInfo(newDogInfo)
    setShowFamilySetup(false)
    localStorage.setItem("berry-dog-info", JSON.stringify(newDogInfo))
  }

  const addEntry = () => {
    if (!user) return

    const [hours, minutes] = selectedTime.split(":".map(Number))
    const entryDate = setHours(setMinutes(selectedDate, minutes), hours)

    const newEntry: Entry = {
      id: Date.now().toString(),
      type: activeTab,
      timestamp: entryDate.toISOString(),
      notes: note || undefined,
      addedBy: user.firstName || user.name,
    }

    const updatedEntries = [newEntry, ...entries]
    setEntries(updatedEntries)
    localStorage.setItem("berry-entries", JSON.stringify(updatedEntries))
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
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const handlePreviousDay = () => setSelectedDate((prev) => subDays(prev, 1))
  const handleNextDay = () => setSelectedDate((prev) => addDays(prev, 1))

  const getMemberName = (id: string) => dogInfo?.members.find((m) => m.id === id)?.name || ""

  if (!user) return <LoginPage onLogin={handleLogin} />
  if (showFamilySetup) return <FamilySetupPage onSetup={handleFamilySetup} />

  const filteredEntries = getFilteredEntries()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* The rest of your component remains unchanged */}
    </div>
  )
}

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
