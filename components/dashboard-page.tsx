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
  Droplets,
  Waves,
  Utensils,
  User,
  FileText,
  PawPrint,
  UserPlus,
  X,
  AlertCircle,
  Trash2,
  RefreshCw,
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
  const [selectedActivity, setSelectedActivity] = useState<"pee" | "poop" | "food" | null>(null)
  const [selectedTime, setSelectedTime] = useState(format(new Date(), "HH:mm"))
  const [selectedMember, setSelectedMember] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [addingMember, setAddingMember] = useState(false)
  const [deletingEntry, setDeletingEntry] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [swipedEntry, setSwipedEntry] = useState<string | null>(null)
  const [startX, setStartX] = useState<number>(0)
  const [currentX, setCurrentX] = useState<number>(0)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const { toast } = useToast()
  const [amount, setAmount] = useState("")
  const [showFamilyDialog, setShowFamilyDialog] = useState(false)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (familyMembers.length > 0) {
      loadEntries()
    }
  }, [selectedDate, familyMembers])

  useEffect(() => {
    if (familyMembers.length > 0 && !selectedMember) {
      setSelectedMember(familyMembers[0]?.name || "")
    }
  }, [familyMembers])

  const loadUserData = async () => {
    try {
      const db: any = await getDb()
      const { doc, getDoc, collection, query, where, getDocs } = await import("firebase/firestore")

      const userDocRef = doc(db, "users", user.id)
      const userDocSnap = await getDoc(userDocRef)

      let userData = null
      
      if (userDocSnap.exists()) {
        userData = userDocSnap.data()
      } else {
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("familyMembers", "array-contains", user.name))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const familyDoc = querySnapshot.docs[0]
          userData = familyDoc.data()
          
          const { setDoc } = await import("firebase/firestore")
          await setDoc(userDocRef, {
            name: user.name,
            email: user.email,
            dogName: userData.dogName,
            familyMembers: userData.familyMembers,
            photoUrl: userData.photoUrl,
            createdAt: new Date(),
          })
        }
      }

      if (userData) {
        setDogName(userData.dogName || "")
        
        const members = userData.familyMembers || [user.name]
        const formattedMembers = members.map((member: any) => {
          if (typeof member === 'string') {
            return { name: member }
          }
          return member
        })
        
        setFamilyMembers(formattedMembers)
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
    if (!familyMembers.length) return

    try {
      setLoadingEntries(true)
      const db: any = await getDb()
      const { collection, query, where, getDocs } = await import("firebase/firestore")

      const dateKey = format(selectedDate, "yyyy-MM-dd")
      const entriesRef = collection(db, "entries")

      const q = query(
        entriesRef,
        where("userId", "==", user.id),
        where("date", "==", dateKey)
      )

      const querySnapshot = await getDocs(q)
      const loadedEntries = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      })) as Entry[]

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

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadEntries()
      setSelectedTime(format(new Date(), "HH:mm"))
      toast({
        title: "Refreshed",
        description: "Activities have been refreshed successfully!",
      })
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Could not refresh activities. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const deleteEntry = async (entryId: string) => {
    try {
      setDeletingEntry(entryId)
      const db: any = await getDb()
      const { doc, deleteDoc } = await import("firebase/firestore")

      const entryRef = doc(db, "entries", entryId)
      await deleteDoc(entryRef)

      setEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== entryId))
      setSwipedEntry(null)

      toast({
        title: "Activity Deleted",
        description: "The activity has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting entry:", error)
      toast({
        title: "Delete Failed",
        description: "Could not delete the activity. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingEntry(null)
    }
  }

  const handleTouchStart = (e: React.TouchEvent, entryId: string) => {
    setStartX(e.touches[0].clientX)
    setCurrentX(e.touches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent, entryId: string) => {
    if (!isDragging) return
    
    const touch = e.touches[0]
    setCurrentX(touch.clientX)
    
    const deltaX = startX - touch.clientX
    
    if (deltaX > 20) {
      setSwipedEntry(entryId)
    } else if (deltaX < -10) {
      setSwipedEntry(null)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    const deltaX = startX - currentX
    
    if (deltaX < 60) {
      setSwipedEntry(null)
    }
  }

  const handleMouseDown = (e: React.MouseEvent, entryId: string) => {
    setStartX(e.clientX)
    setCurrentX(e.clientX)
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent, entryId: string) => {
    if (!isDragging) return
    
    setCurrentX(e.
