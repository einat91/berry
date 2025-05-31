"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Entry {
  type: "pee" | "poop" | "food"
  notes?: string
  amount?: string
  foodType?: string
}

interface AddEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "pee" | "poop" | "food"
  onAdd: (entry: Entry) => void
}

export function AddEntryDialog({ open, onOpenChange, type, onAdd }: AddEntryDialogProps) {
  const [notes, setNotes] = useState("")
  const [amount, setAmount] = useState("")
  const [foodType, setFoodType] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const entry: Entry = {
      type,
      ...(notes && { notes }),
      ...(amount && { amount }),
      ...(foodType && { foodType }),
    }

    onAdd(entry)

    // Reset form
    setNotes("")
    setAmount("")
    setFoodType("")
    onOpenChange(false)
  }

  const getTitle = () => {
    switch (type) {
      case "pee":
        return "💧 Add Pee Entry"
      case "poop":
        return "💩 Add Poop Entry"
      case "food":
        return "🍽️ Add Food Entry"
    }
  }

  const getDescription = () => {
    switch (type) {
      case "pee":
        return "Log a pee break for your dog"
      case "poop":
        return "Log a poop break for your dog"
      case "food":
        return "Log a meal for your dog"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogDescription>{getDescription()}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {type === "food" && (
              <div className="space-y-2">
                <Label htmlFor="foodType">Food Type</Label>
                <Select value={foodType} onValueChange={setFoodType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select food type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="treats">Treats</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(type === "pee" || type === "poop") && (
              <div className="space-y-2">
                <Label htmlFor="amount">Size/Amount</Label>
                <Select value={amount} onValueChange={setAmount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Entry</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
