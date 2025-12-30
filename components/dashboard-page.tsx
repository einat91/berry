"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
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
  TrendingUp,
  RefreshCw,
  Edit2,
  BarChart2,
  ArrowLeft
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
import { DayPicker } from "react-day-picker" 
import "react-day-picker/style.css";
// CHART IMPORTS
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

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
  familyId: string
}

interface FamilyMember {
  name: string
  email?: string
  userId?: string
}

interface DailySummary {
  totalPee: number
  totalPoop: number
  totalFood: number
}

interface DashboardPageProps {
  user: UserType
}

const FOOD_AMOUNTS = [25, 50, 75, 100, 125, 150, 175, 200]

const getFirstName = (name: string) => {
  return name ? name.split(" ")[0] : name
}

const DatePicker = ({ selectedDate, setSelectedDate }: { selectedDate: Date, setSelectedDate: (date: Date) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const handleSelect = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date);
            setIsOpen(false);
        }
    }

    const dayPickerClassNames = {
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-gray-900",
        nav: "space-x-1 flex items-center",
        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-gray-900",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-gray-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-gray-100 transition-colors text-gray-900",
        day_selected: "bg-gray-900 text-white hover:bg-gray-800 hover:text-white focus:bg-gray-900 focus:text-white",
        day_today: "bg-gray-100 text-gray-900 font-bold",
        day_outside: "text-gray-300 opacity-50",
        day_disabled: "text-gray-300 opacity-50",
        day_range_middle: "aria-selected:bg-gray-100 aria-selected:text-gray-900",
        day_hidden: "invisible",
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-1 rounded-md hover:bg-gray-100">
                    <CalendarIcon className="h-4 w-4" />
                    <div className="text-sm font-medium">{format(selectedDate, "dd/MM/yyyy")}</div>
                </button>
            </DialogTrigger>
            <DialogContent className="w-auto p-4 bg-white rounded-xl border-0 shadow-lg">
                <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelect}
                    showOutsideDays={true}
                    disabled={(date) => date > new Date()} 
                    initialFocus
                    classNames={dayPickerClassNames}
                    components={{
                        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
                    }}
                />
            </DialogContent>
        </Dialog>
    );
};

// STATS COMPONENT
const StatsView = ({ familyId, dogName, onBack }: { familyId: string, dogName: string, onBack: () => void }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const db = await getDb();
                const { collection, query, where, getDocs } = await import("firebase/firestore");
                const entriesRef = collection(db, "entries");
                // Fetch ALL entries for the family
                const q = query(entriesRef, where("familyId", "==", familyId));
                const snapshot = await getDocs(q);
                
                const allEntries = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    timestamp: doc.data().timestamp.toDate()
                })) as Entry[];

                processStats(allEntries);
            } catch (err) {
                console.error("Error fetching stats:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [familyId]);

    const processStats = (entries: Entry[]) => {
        // 1. Travel Buddy (Who added most pee/poop)
        const buddyCount: {[key: string]: {pee: number, poop: number}} = {};
        
        // 2. Best Buddy for Walk Times
        const timeBuddy = {
            morning: {} as {[key: string]: number},
            afternoon: {} as {[key: string]: number},
            night: {} as {[key: string]: number}
        };

        // 3. Poop Times
        const poopHours: {[key: number]: number} = {};

        // 4. Food Stats
        let totalFood = 0;
        const uniqueFoodDays = new Set<string>();

        entries.forEach(entry => {
            const name = getFirstName(entry.addedBy);
            const hour = entry.timestamp.getHours();
            
            // Travel Buddy
            if (entry.type === 'pee' || entry.type === 'poop') {
                if (!buddyCount[name]) buddyCount[name] = { pee: 0, poop: 0 };
                buddyCount[name][entry.type]++;

                // Best Buddy by Time
                if (hour >= 5 && hour < 12) { // Morning
                    timeBuddy.morning[name] = (timeBuddy.morning[name] || 0) + 1;
                } else if (hour >= 12 && hour < 19) { // Afternoon
                    timeBuddy.afternoon[name] = (timeBuddy.afternoon[name] || 0) + 1;
                } else { // Night
                    timeBuddy.night[name] = (timeBuddy.night[name] || 0) + 1;
                }
            }

            // Poop Time
            if (entry.type === 'poop') {
                poopHours[hour] = (poopHours[hour] || 0) + 1;
            }

            // Food
            if (entry.type === 'food' && entry.amount) {
                totalFood += parseInt(entry.amount.replace('g', '')) || 0;
                uniqueFoodDays.add(format(entry.timestamp, 'yyyy-MM-dd'));
            }
        });

        // Format for Recharts
        const travelBuddyData = Object.keys(buddyCount).map(name => ({
            name,
            Activities: buddyCount[name].pee + buddyCount[name].poop
        })).sort((a,b) => b.Activities - a.Activities);

        const getBestBuddy = (counts: {[key:string]: number}) => {
            if (Object.keys(counts).length === 0) return "N/A";
            return Object.entries(counts).sort(([,a], [,b]) => b - a)[0][0];
        };

        const poopTimeData = Object.entries(poopHours).map(([hour, count]) => ({
            hour: `${hour}:00`,
            count
        })).sort((a,b) => parseInt(a.hour) - parseInt(b.hour));

        const avgFood = uniqueFoodDays.size > 0 ? Math.round(totalFood / uniqueFoodDays.size) : 0;

        setStats({
            travelBuddyData,
            bestMorning: getBestBuddy(timeBuddy.morning),
            bestAfternoon: getBestBuddy(timeBuddy.afternoon),
            bestNight: getBestBuddy(timeBuddy.night),
            poopTimeData,
            avgFood
        });
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading statistics...</div>;

    return (
        <div className="space-y-6 pb-8 animate-in fade-in duration-500">
             {/* Header with Back Button */}
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-xl font-bold text-gray-800">Statistics</h2>
            </div>

            {/* Travel Buddy Chart */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
                    <PawPrint className="h-4 w-4 text-teal-600"/> Who is {dogName}'s Travel Buddy?
                </h3>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.travelBuddyData}>
                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                            <YAxis hide />
                            <Tooltip />
                            <Bar dataKey="Activities" fill="#0d9488" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Best Walk Buddies */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                    <div className="text-xs text-orange-600 mb-1">Morning</div>
                    <div className="font-bold text-gray-800 text-sm">{stats.bestMorning}</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                    <div className="text-xs text-blue-600 mb-1">Afternoon</div>
                    <div className="font-bold text-gray-800 text-sm">{stats.bestAfternoon}</div>
                </div>
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-center">
                    <div className="text-xs text-indigo-600 mb-1">Night</div>
                    <div className="font-bold text-gray-800 text-sm">{stats.bestNight}</div>
                </div>
            </div>

             {/* Poop Time Chart */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
                    <Waves className="h-4 w-4 text-amber-700"/> Best Time for Poop
                </h3>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.poopTimeData}>
                            <XAxis dataKey="hour" tick={{fontSize: 10}} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#b45309" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Average Food */}
            <div className="bg-teal-50 p-6 rounded-xl border border-teal-100 text-center">
                 <div className="flex justify-center mb-2">
                    <Utensils className="h-6 w-6 text-teal-600" />
                 </div>
                 <div className="text-3xl font-bold text-teal-800">{stats.avgFood}g</div>
                 <div className="text-sm text-teal-600">Average Daily Meal Size</div>
            </div>
        </div>
    );
};

export function DashboardPage({ user }: DashboardPageProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [entries, setEntries] = useState<Entry[]>([])
  const [dogName, setDogName] = useState("")
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [familyId, setFamilyId] = useState("")
  const [selectedActivities, setSelectedActivities] = useState<Set<"pee" | "poop" | "food">>(new Set())
  const [selectedTime, setSelectedTime] = useState(format(new Date(), "HH:mm"))
  const [selectedMember, setSelectedMember] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [addingMember, setAddingMember] = useState(false)
  const [amount, setAmount] = useState("75")
  const [showFamilyDialog, setShowFamilyDialog] = useState(false)
  const [dailySummary, setDailySummary] = useState<DailySummary>({ totalPee: 0, totalPoop: 0, totalFood: 0 })
  const [loggingOut, setLoggingOut] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [editNote, setEditNote] = useState("")
  const [updatingEntry, setUpdatingEntry] = useState(false)
  const [showStats, setShowStats] = useState(false) // NEW STATE FOR STATS
  const { toast } = useToast()

  const swipeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const [swipedEntryId, setSwipedEntryId] = useState<string | null>(null)
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (familyId) {
      loadEntries()
    }
  }, [selectedDate, familyId])

  useEffect(() => {
    if (familyMembers.length > 0 && !selectedMember) {
        const currentUserName = getFirstName(user.name);
        const currentUserInFamily = familyMembers.find(member => getFirstName(member.name) === currentUserName);
        
        if (currentUserInFamily) {
            setSelectedMember(currentUserName);
        } else {
            setSelectedMember(getFirstName(familyMembers[0]?.name || ""));
        }
    }
  }, [familyMembers, selectedMember, user.name])

  useEffect(() => {
    calculateDailySummary()
  }, [entries])

  const calculateDailySummary = () => {
    const summary = entries.reduce(
      (acc, entry) => {
        switch (entry.type) {
          case "pee":
            acc.totalPee += 1
            break
          case "poop":
            acc.totalPoop += 1
            break
          case "food":
            const grams = entry.amount ? Number.parseInt(entry.amount.replace("g", "")) || 0 : 0
            acc.totalFood += grams
            break
        }
        return acc
      },
      { totalPee: 0, totalPoop: 0, totalFood: 0 },
    )
    setDailySummary(summary)
  }

  const loadUserData = async () => {
    try {
      const db = await getDb()
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
          if (typeof member === "string") {
            return { name: member }
          }
          return member
        })

        setFamilyMembers(formattedMembers)
        const familyIdentifier = userData.originalFamilyId || userDocSnap.id || user.id
        setFamilyId(familyIdentifier)
      } else {
        toast({
          title: "Setup Required",
          description: "Please complete your family setup first.",
          variant: "destructive",
        })
      }
      setLoading(false)
    } catch (error: any) {
      console.error("Error loading user data:", error)
      toast({
        title: "Database Error",
        description: "Failed to connect to Firebase. Check API Keys.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const loadEntries = async () => {
    if (!familyId) return

    try {
      setLoadingEntries(true)
      const db = await getDb()
      const { collection, query, where, getDocs } = await import("firebase/firestore")

      const dateKey = format(selectedDate, "yyyy-MM-dd")
      const entriesRef = collection(db, "entries")

      const q = query(entriesRef, where("familyId", "==", familyId), where("date", "==", dateKey))

      const querySnapshot = await getDocs(q)
      const loadedEntries = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      })) as Entry[]

      loadedEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      setEntries(loadedEntries)
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
    if (!familyId) {
      toast({
        title: "Family Setup Required",
        description: "Please complete your family setup before logging activities.",
        variant: "destructive",
      })
      return false
    }

    try {
      setSaving(true)
      const db = await getDb()
      const { collection, addDoc, Timestamp } = await import("firebase/firestore")

      const dateKey = format(selectedDate, "yyyy-MM-dd")

      const entryData = {
        type: entry.type,
        timestamp: Timestamp.fromDate(entry.timestamp),
        addedBy: getFirstName(entry.addedBy),
        userId: user.id,
        familyId: familyId,
        date: dateKey,
        createdAt: Timestamp.fromDate(new Date()),
      }

      if (entry.notes && entry.notes.trim()) {
        entryData.notes = entry.notes.trim()
      }

      if (entry.amount && entry.amount.trim()) {
        entryData.amount = entry.amount.trim()
      }

      const entriesRef = collection(db, "entries")
      const docRef = await addDoc(entriesRef, entryData)

      const newEntryWithId = {
        ...entry,
        id: docRef.id,
      }

      setEntries((prevEntries) => {
        const updatedEntries = [newEntryWithId, ...prevEntries]
        return updatedEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      })

      return true
    } catch (error) {
      console.error("❌ Error saving entry:", error)
      toast({
        title: "Save Failed",
        description: "Please check your connection and try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleLogActivities = async () => {
    if (selectedActivities.size === 0) {
      toast({ title: "Select an activity", description: "Please select at least one activity type", variant: "destructive" })
      return
    }

    if (!selectedMember) {
      toast({ title: "Select a family member", description: "Please select who is logging this activity", variant: "destructive" })
      return
    }

    if (selectedActivities.has("food") && !amount) {
      toast({ title: "Select food amount", description: "Please select the amount of food in grams", variant: "destructive" })
      return
    }

    if (selectedDate > new Date()) {
      toast({ title: "Cannot log future activities", description: "You can only log activities for today or past dates", variant: "destructive" })
      return
    }

    const timeArray = selectedTime.split(":")
    const hours = Number.parseInt(timeArray[0], 10)
    const minutes = Number.parseInt(timeArray[1], 10)

    const timestamp = new Date(selectedDate)
    timestamp.setHours(hours, minutes, 0, 0)

    const activitiesToLog = Array.from(selectedActivities)
    let successCount = 0

    for (const activity of activitiesToLog) {
      const newEntry: Entry = {
        id: "",
        type: activity,
        timestamp,
        addedBy: selectedMember,
        userId: user.id,
        familyId: familyId,
        ...(note && { notes: note }),
        ...(activity === "food" && amount && { amount: `${amount}g` }),
      }

      const success = await saveEntry(newEntry)
      if (success) successCount++
    }

    if (successCount > 0) {
      toast({
        title: "Activities Saved",
        description: `${successCount} ${successCount === 1 ? "activity" : "activities"} saved successfully!`,
      })
      setSelectedActivities(new Set())
      setAmount("75") 
      setNote("")
    }
  }

  const deleteEntry = async (entryId: string) => {
    try {
      const db = await getDb()
      const { doc, deleteDoc } = await import("firebase/firestore")
      await deleteDoc(doc(db, "entries", entryId))
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId))
      setSwipedEntryId(null)
      toast({ title: "Activity Deleted", description: "Activity has been removed successfully." })
    } catch (error) {
      console.error("Error deleting entry:", error)
      toast({ title: "Delete Failed", description: "Could not delete activity.", variant: "destructive" })
    }
  }

  const handleTouchStart = (e: React.TouchEvent, entryId: string) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent, entryId: string) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = (entryId: string) => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50 
    const isRightSwipe = distance < -50 

    if (isLeftSwipe) {
      setSwipedEntryId(entryId)
      setSwipeDirection("left") 
    } else if (isRightSwipe) {
      const entry = entries.find((e) => e.id === entryId)
      if (entry?.type === "food") {
        setSwipedEntryId(entryId)
        setSwipeDirection("right") 
      } else {
        setSwipedEntryId(null)
        setSwipeDirection(null)
      }
    } else {
      setSwipedEntryId(null)
      setSwipeDirection(null)
    }
  }

  const toggleActivity = (activity: "pee" | "poop" | "food") => {
    const newActivities = new Set(selectedActivities)
    if (newActivities.has(activity)) {
      newActivities.delete(activity)
    } else {
      newActivities.add(activity)
    }
    setSelectedActivities(newActivities)
  }

  const getActivityIcon = (type: "pee" | "poop" | "food") => {
    switch (type) {
      case "pee": return <Droplets className="h-5 w-5" />
      case "poop": return <Waves className="h-5 w-5" />
      case "food": return <Utensils className="h-5 w-5" />
    }
  }

  const getActivityColor = (type: "pee" | "poop" | "food") => {
    switch (type) {
      case "pee": return "bg-yellow-500 text-white"
      case "poop": return "bg-amber-700 text-white"
      case "food": return "bg-teal-500 text-white"
    }
  }

  const handleSignOut = async () => {
    try {
      setLoggingOut(true)
      const auth: any = await getAuth()
      const { signOut } = await import("firebase/auth")
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
      toast({ title: "Sign Out Error", description: "Could not sign out.", variant: "destructive" })
    } finally {
      setLoggingOut(false)
    }
  }

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1))
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1))
  const goToToday = () => setSelectedDate(new Date())

  const addFamilyMember = async () => {
    if (!newMemberName.trim()) return
    try {
      setAddingMember(true)
      const db = await getDb()
      const { doc, updateDoc, arrayUnion } = await import("firebase/firestore")
      const userDocRef = doc(db, "users", user.id)
      const newMember = {
        name: getFirstName(newMemberName.trim()),
        ...(newMemberEmail.trim() && { email: newMemberEmail.trim() }),
      }
      await updateDoc(userDocRef, { familyMembers: arrayUnion(newMember) })
      setFamilyMembers((prev) => [...prev, newMember])
      setNewMemberName("")
      setNewMemberEmail("")
      toast({ title: "Family Member Added", description: `${getFirstName(newMemberName.trim())} has been added.` })
    } catch (error) {
      toast({ title: "Failed to Add Member", description: "Could not add family member.", variant: "destructive" })
    } finally {
      setAddingMember(false)
    }
  }

  const removeFamilyMember = async (memberToRemove: FamilyMember) => {
    if (familyMembers.length <= 1) return
    try {
      const db = await getDb()
      const { doc, updateDoc } = await import("firebase/firestore")
      const userDocRef = doc(db, "users", user.id)
      const updatedMembers = familyMembers.filter(
        (m) => m.name !== memberToRemove.name || m.email !== memberToRemove.email,
      )
      await updateDoc(userDocRef, { familyMembers: updatedMembers })
      setFamilyMembers(updatedMembers)
      toast({ title: "Family Member Removed", description: `${getFirstName(memberToRemove.name)} has been removed.` })
    } catch (error) {
      toast({ title: "Failed to Remove Member", description: "Could not remove family member.", variant: "destructive" })
    }
  }

  const updateEntry = async (entryId: string) => {
    try {
      setUpdatingEntry(true)
      const db = await getDb()
      const { doc, updateDoc } = await import("firebase/firestore")
      const updateData: any = {}
      if (editAmount && editAmount !== editingEntry?.amount) {
        updateData.amount = editAmount.endsWith('g') ? editAmount : `${editAmount}g` 
      }
      if (editNote !== editingEntry?.notes) {
        updateData.notes = editNote.trim() || null
      }
      if (Object.keys(updateData).length > 0) {
        await updateDoc(doc(db, "entries", entryId), updateData)
        setEntries((prev) => prev.map((entry) => entry.id === entryId ? { ...entry, amount: updateData.amount || entry.amount, notes: updateData.notes || entry.notes } : entry))
        toast({ title: "Activity Updated", description: "Updated successfully!" })
      }
      setEditingEntry(null)
    } catch (error) {
      toast({ title: "Update Failed", description: "Could not update activity.", variant: "destructive" })
    } finally {
      setUpdatingEntry(false)
    }
  }

  const openEditModal = (entry: Entry) => {
    setEditingEntry(entry)
    setEditAmount(entry.amount ? entry.amount.replace('g', '') : "") 
    setEditNote(entry.notes || "") 
    setSwipedEntryId(null)
    setSwipeDirection(null)
  }

  const closeEditModal = () => {
    setEditingEntry(null)
    setEditAmount("")
    setEditNote("") 
  }

  const saveEdit = async () => {
    if (!editingEntry) return
    try {
      const db = await getDb()
      const { doc, updateDoc } = await import("firebase/firestore")
      const newAmountWithG = editAmount.endsWith('g') ? editAmount : `${editAmount}g`;
      await updateDoc(doc(db, "entries", editingEntry.id), {
        amount: newAmountWithG,
        notes: editNote.trim() || null, 
      })
      setEntries((prev) => prev.map((entry) => entry.id === editingEntry.id ? { ...entry, amount: newAmountWithG, notes: editNote.trim() || null } : entry))
      closeEditModal()
      toast({ title: "Activity Updated", description: "Updated successfully." })
    } catch (error) {
      toast({ title: "Update Failed", description: "Could not update activity.", variant: "destructive" })
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

  if (!familyId) {
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

  // --- RENDER VIEW: STATS vs DASHBOARD ---

  if (showStats) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white p-4 border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-md mx-auto flex items-center justify-center">
                   <Image src="/images/berry-logo.png" alt="Berry" width={120} height={40} />
                </div>
            </header>
            <main className="max-w-md mx-auto p-4 w-full flex-1">
                <StatsView familyId={familyId} dogName={dogName} onBack={() => setShowStats(false)} />
            </main>
        </div>
    )
  }

  // NORMAL DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white p-4 border-b border-gray-100">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={goToToday} className="hover:opacity-80 transition-opacity">
              <Image src="/images/berry-logo.png" alt="Berry" width={150} height={50} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* STATS BUTTON */}
            <Button variant="ghost" size="icon" onClick={() => setShowStats(true)}>
              <BarChart2 className="h-5 w-5 text-gray-600" />
            </Button>

            <Button variant="ghost" size="icon" onClick={() => window.location.reload()}>
              <RefreshCw className="h-5 w-5 text-gray-600" />
            </Button>
            <Dialog open={showFamilyDialog} onOpenChange={setShowFamilyDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <UserPlus className="h-5 w-5 text-gray-600" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Manage Family Members</DialogTitle>
                  <DialogDescription>Add or remove family members who can log activities.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Current Family Members</h3>
                    <div className="space-y-2">
                      {familyMembers.map((member, index) => (
                        <div
                          key={`${member.name}-${index}`}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <div>
                              <span className="text-sm font-medium">{getFirstName(member.name)}</span>
                              {member.email && <div className="text-xs text-gray-500">{member.email}</div>}
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
                        <Label htmlFor="memberName" className="text-xs">
                          Name *
                        </Label>
                        <Input
                          id="memberName"
                          placeholder="Enter name"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="memberEmail" className="text-xs">
                          Email (optional)
                        </Label>
                        <Input
                          id="memberEmail"
                          type="email"
                          placeholder="Enter email"
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <Button
                        onClick={addFamilyMember}
                        disabled={addingMember || !newMemberName.trim()}
                        className="w-full"
                        size="sm"
                      >
                        {addingMember ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        ) : (
                          <span>Add Member</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowFamilyDialog(false)} size="sm">
                    Done
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={handleSignOut} disabled={loggingOut}>
              {loggingOut ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-300"></div>
              ) : (
                <Image
                  src={user.avatar || "/placeholder.svg"}
                  alt={user.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 flex-1">
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4 border border-gray-100 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousDay}
            className="h-8 w-8 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <DatePicker selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
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

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <PawPrint className="h-6 w-6 text-gray-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-700">Welcome, {dogName}'s family!</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-gray-600" />
            <h2 className="text-base text-gray-600">Today's Summary</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">{dailySummary.totalPee}</div>
              <div className="text-xs text-gray-500">Pee</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-700">{dailySummary.totalPoop}</div>
              <div className="text-xs text-gray-500">Poop</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-teal-600">{dailySummary.totalFood}g</div>
              <div className="text-xs text-gray-500">Food</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-base text-gray-600 mb-6">Log Activity</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              className={`h-20 flex flex-col items-center justify-center gap-2 rounded-lg border transition-colors ${
                selectedActivities.has("pee")
                  ? "bg-yellow-500 text-white border-yellow-500"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => toggleActivity("pee")}
            >
              <Droplets className="h-6 w-6" />
              <span className="text-sm">Pee</span>
            </button>
            <button
              className={`h-20 flex flex-col items-center justify-center gap-2 rounded-lg border transition-colors ${
                selectedActivities.has("poop")
                  ? "bg-amber-700 text-white border-amber-700"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => toggleActivity("poop")}
            >
              <Waves className="h-6 w-6" />
              <span className="text-sm">Poop</span>
            </button>
            <button
              className={`h-20 flex flex-col items-center justify-center gap-2 rounded-lg border transition-colors ${
                selectedActivities.has("food")
                  ? "bg-teal-500 text-white border-teal-500"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => toggleActivity("food")}
            >
              <Utensils className="h-6 w-6" />
              <span className="text-sm">Food</span>
            </button>
          </div>

          {/* LAYOUT FIX: Adjusted height to h-12 for better iPhone touch */}
          <div className="grid grid-cols-[130px_1fr] gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Time</span>
              </div>
              <Input 
                type="time" 
                value={selectedTime} 
                onChange={(e) => setSelectedTime(e.target.value)} 
                className="h-12 text-base"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>Added by</span>
              </div>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {familyMembers.map((member, index) => (
                    <SelectItem key={`${member.name}-${index}`} value={getFirstName(member.name)}>
                      {getFirstName(member.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedActivities.has("food") && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                <Utensils className="h-4 w-4" />
                <span>Grams *</span>
              </div>
              <Select value={amount} onValueChange={setAmount}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select amount" />
                </SelectTrigger>
                <SelectContent>
                  {FOOD_AMOUNTS.map((grams) => (
                    <SelectItem key={grams} value={grams.toString()}>
                      {grams}g
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span>Note</span>
            </div>
            <Input
              placeholder="Quick note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          <Button
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3"
            onClick={handleLogActivities}
            disabled={selectedDate > new Date() || saving}
          >
            {saving
              ? "Saving..."
              : selectedDate > new Date()
                ? "Cannot log future activities"
                : `Log ${selectedActivities.size > 1 ? "Activities" : "Activity"}`}
          </Button>
        </div>

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
                <div key={entry.id} className="relative overflow-hidden">
                  <div
                    ref={(el) => (swipeRefs.current[entry.id] = el)}
                    className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg transition-transform duration-200 ${
                      swipedEntryId === entry.id && swipeDirection === "left"
                        ? "translate-x-[-80px]"
                        : swipedEntryId === entry.id && swipeDirection === "right"
                          ? "translate-x-[80px]"
                          : "translate-x-0"
                    }`}
                    onTouchStart={(e) => handleTouchStart(e, entry.id)}
                    onTouchMove={(e) => handleTouchMove(e, entry.id)}
                    onTouchEnd={() => handleTouchEnd(entry.id)}
                  >
                    <div className={`p-2 rounded-full ${getActivityColor(entry.type)}`}>
                      {getActivityIcon(entry.type)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">
                        {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                      </div>
                      <div className="text-xs text-gray-600">By {getFirstName(entry.addedBy)}</div>
                      {entry.amount && <div className="text-xs text-teal-600 font-medium">{entry.amount}</div>}
                      {entry.notes && <div className="text-xs text-gray-500 mt-1">{entry.notes}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">{format(entry.timestamp, "HH:mm")}</div>
                    </div>
                  </div>

                  {swipedEntryId === entry.id && swipeDirection === "right" && entry.type === "food" && (
                    <div className="absolute left-0 top-0 h-full flex items-center">
                      <Button
                        onClick={() => openEditModal(entry)}
                        className="bg-blue-500 hover:bg-blue-600 text-white h-full px-6 rounded-r-none"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {swipedEntryId === entry.id && swipeDirection === "left" && (
                    <div className="absolute right-0 top-0 h-full flex items-center">
                      <Button
                        onClick={() => deleteEntry(entry.id)}
                        className="bg-red-500 hover:bg-red-600 text-white h-full px-6 rounded-l-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* FOOTER with Privacy Policy */}
      <div className="w-full text-center py-4 text-[10px] text-gray-400 space-x-2">
         <a href="https://www.iubenda.com/privacy-policy/65370946" className="iubenda-white iubenda-noiframe iubenda-embed iubenda-noiframe hover:underline" title="Privacy Policy">Privacy Policy</a>
         <span>•</span>
         <a href="https://www.iubenda.com/privacy-policy/65370946/cookie-policy" className="iubenda-white iubenda-noiframe iubenda-embed iubenda-noiframe hover:underline" title="Cookie Policy">Cookie Policy</a>
      </div>

      {editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Edit Food Amount</h2>
            <input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                <span>Note</span>
              </div>
              <Input
                placeholder="Quick note..."
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
