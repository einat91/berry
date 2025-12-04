const handleTouchEnd = (entryId: string) => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50  // Positive distance means movement from right-to-left
    const isRightSwipe = distance < -50 // Negative distance means movement from left-to-right

    // --- LOGIC FOR SWIPE LEFT (EDIT) ---
    if (isLeftSwipe) {
      const entry = entries.find((e) => e.id === entryId)
      
      // Only allow SWIPE LEFT to trigger EDIT if the entry type is 'food'
      if (entry?.type === "food") {
        setSwipedEntryId(entryId)
        setSwipeDirection("left")
      } else {
        // If it's a non-food item, do not trigger the swipe action
        setSwipedEntryId(null)
        setSwipeDirection(null)
      }
    } 
    // --- LOGIC FOR SWIPE RIGHT (DELETE) ---
    else if (isRightSwipe) {
      // Allow SWIPE RIGHT to trigger DELETE for any entry type
      setSwipedEntryId(entryId)
      setSwipeDirection("right")
    } 
    // No significant swipe
    else {
      setSwipedEntryId(null)
      setSwipeDirection(null)
    }
  }
