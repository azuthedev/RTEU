"use client"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { format } from "date-fns"
import { ArrowLeft, Calendar as CalendarIcon, Clock } from "lucide-react"
import { useState } from "react"
import { DateRange } from "react-day-picker"

interface DateRangePickerProps {
  dateRange?: DateRange
  onDateRangeChange: (dateRange: DateRange | undefined) => void
  className?: string
  placeholder?: string
}

export function DateRangePicker({ 
  dateRange, 
  onDateRangeChange, 
  className,
  placeholder = "Pick a date range" 
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(dateRange)
  
  // Time state for both from and to dates
  const [fromHours, setFromHours] = useState<number>(dateRange?.from ? dateRange.from.getHours() : 12)
  const [fromMinutes, setFromMinutes] = useState<number>(dateRange?.from ? dateRange.from.getMinutes() : 0)
  const [toHours, setToHours] = useState<number>(dateRange?.to ? dateRange.to.getHours() : 12)
  const [toMinutes, setToMinutes] = useState<number>(dateRange?.to ? dateRange.to.getMinutes() : 0)
  
  // Step tracking: 'from-date' → 'from-time' → 'to-date' → 'to-time'
  const [step, setStep] = useState<'from-date' | 'from-time' | 'to-date' | 'to-time'>('from-date')

  const handleRangeSelect = (range: DateRange | undefined) => {
    // In a step-by-step flow, we handle what happens based on the current step
    if (step === 'from-date' && range?.from) {
      // First date selection, now need time for it
      setSelectedRange({ from: range.from, to: undefined })
      setStep('from-time')
    } else if (step === 'to-date' && range?.to) {
      // Second date selection, now need time for it 
      setSelectedRange({ from: selectedRange?.from, to: range.to })
      setStep('to-time')
    } else {
      // Default fallback behavior
      setSelectedRange(range)
    }
  }

  const handleBack = () => {
    // Navigate back based on current step
    if (step === 'from-time') {
      setStep('from-date')
    } else if (step === 'to-date') {
      setStep('from-time')
    } else if (step === 'to-time') {
      setStep('to-date')
    }
  }

  const handleNextAfterFromTime = (e: React.MouseEvent) => {
    e.stopPropagation()
    // After setting the first time, move to selecting the second date
    setStep('to-date')
  }

  const handleConfirmTime = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (step === 'from-time' && selectedRange?.from) {
      // After first time, move to select return date
      const fromWithTime = new Date(selectedRange.from)
      fromWithTime.setHours(fromHours)
      fromWithTime.setMinutes(fromMinutes)
      
      setSelectedRange({
        from: fromWithTime,
        to: selectedRange.to
      })
      
      setStep('to-date')
    } else if (step === 'to-time' && selectedRange?.from && selectedRange?.to) {
      // After both times are set, finalize the selection
      const fromWithTime = new Date(selectedRange.from)
      fromWithTime.setHours(fromHours)
      fromWithTime.setMinutes(fromMinutes)
      
      const toWithTime = new Date(selectedRange.to)
      toWithTime.setHours(toHours)
      toWithTime.setMinutes(toMinutes)
      
      // Create the final range
      const rangeWithTime: DateRange = {
        from: fromWithTime,
        to: toWithTime
      }
      
      // Submit the complete range
      onDateRangeChange(rangeWithTime)
      setOpen(false)
      // Reset for next opening
      setStep('from-date')
    }
  }

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedRange(undefined)
    onDateRangeChange(undefined)
    setOpen(false)
    setStep('from-date') // Reset step
  }

  // Prevent clicks within the popover from propagating to the document
  const handlePopoverClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Function to check if a date is in the past
  const isPastDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to beginning of day for accurate comparison
    return date < today
  }
  
  // Check if the selected time is in the past for today's date
  const isTimeInPast = (date: Date | undefined, hours: number, minutes: number) => {
    if (!date) return false
    
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Only validate time if the selected date is today
    if (date.toDateString() === today.toDateString()) {
      const selectedTime = new Date(today)
      selectedTime.setHours(hours)
      selectedTime.setMinutes(minutes)
      return selectedTime < now
    }
    
    return false
  }
  
  // Is the "from" time in the past?
  const isFromTimeInPast = () => isTimeInPast(selectedRange?.from, fromHours, fromMinutes)
  
  // Is the "to" date earlier than "from" date? 
  const isToDateBeforeFromDate = () => {
    if (selectedRange?.from && selectedRange?.to) {
      const fromDate = new Date(selectedRange.from)
      fromDate.setHours(0, 0, 0, 0)
      
      const toDate = new Date(selectedRange.to)
      toDate.setHours(0, 0, 0, 0)
      
      return toDate < fromDate
    }
    return false
  }
  
  // Is any validation error present?
  const hasValidationError = isFromTimeInPast() ||
                            (step === 'to-time' && selectedRange?.from && selectedRange?.to && 
                              new Date(selectedRange.from).setHours(fromHours, fromMinutes) >= 
                              new Date(selectedRange.to).setHours(toHours, toMinutes))

  // Generate hour options (24-hour format)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i)
  
  // Generate minute options (every 15 minutes)
  const minuteOptions = [0, 15, 30, 45]
  
  // Format the display text for the date range with time
  const getFormattedDateRange = () => {
    if (dateRange?.from) {
      const fromText = format(dateRange.from, "PPP") + 
                      ` at ${dateRange.from.getHours().toString().padStart(2, '0')}:${dateRange.from.getMinutes().toString().padStart(2, '0')}`
      
      if (dateRange.to) {
        const toText = format(dateRange.to, "PPP") +
                      ` at ${dateRange.to.getHours().toString().padStart(2, '0')}:${dateRange.to.getMinutes().toString().padStart(2, '0')}`
        return `${fromText} - ${toText}`
      }
      return fromText
    }
    
    return placeholder
  }

  // Handle popover open change
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Initialize state from props
      setSelectedRange(dateRange)
      if (dateRange?.from) {
        setFromHours(dateRange.from.getHours())
        setFromMinutes(dateRange.from.getMinutes())
      }
      if (dateRange?.to) {
        setToHours(dateRange.to.getHours())
        setToMinutes(dateRange.to.getMinutes())
      }
    } else {
      // Reset step when closing
      setStep('from-date')
    }
    setOpen(newOpen)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-between bg-white hover:bg-white focus:ring-2 focus:ring-black h-[42px]",
            !dateRange?.from && "text-gray-500",
            className
          )}
        >
          <span className="truncate">
            {getFormattedDateRange()}
          </span>
          <CalendarIcon className="h-5 w-5 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="start" 
        side="bottom" 
        sideOffset={5}
        avoidCollisions={false}
        sticky="always"
        style={{ zIndex: 100 }}
        onClick={handlePopoverClick}
      >
        <div onClick={e => e.stopPropagation()}>
          {/* Departure Date Selection */}
          {step === 'from-date' && (
            <>
              <div className="p-3 border-b text-center text-sm font-medium">
                Select Departure Date
              </div>
              <Calendar
                mode="single"
                selected={selectedRange?.from}
                onSelect={(date) => handleRangeSelect({
                  from: date,
                  to: selectedRange?.to
                })}
                initialFocus
                disabled={isPastDate}
                classNames={{
                  day_selected: "bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white",
                  day_today: "text-black font-semibold",
                  day_range_start: "day-range-start bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white",
                  day_range_end: "day-range-end bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white",
                  day_range_middle: "aria-selected:bg-gray-100 aria-selected:text-gray-900"
                }}
              />
              <div className="flex justify-between p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearClick}
                  className="text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-gray-900"
                >
                  Clear
                </Button>
              </div>
            </>
          )}

          {/* Departure Time Selection */}
          {step === 'from-time' && selectedRange?.from && (
            <>
              <div className="p-4 min-w-[240px]">
                <div className="flex items-center mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBack}
                    className="mr-2 p-1 h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center justify-between flex-1">
                    <span className="text-sm font-medium">Departure Time</span>
                    <Clock className="h-4 w-4 text-gray-500" />
                  </div>
                </div>

                <div className="flex flex-col space-y-4">
                  {/* Selected date display */}
                  <div className="text-sm font-medium text-center pb-2 border-b">
                    {selectedRange.from && format(selectedRange.from, "PPP")}
                  </div>
                  
                  <div className="flex space-x-2">
                    {/* Hour select */}
                    <div className="flex-1">
                      <label htmlFor="from-hour-select" className="text-xs text-gray-500">Hour</label>
                      <select
                        id="from-hour-select"
                        value={fromHours}
                        onChange={(e) => setFromHours(Number(e.target.value))}
                        className="w-full p-2 border rounded-md text-sm"
                      >
                        {hourOptions.map((hour) => (
                          <option key={hour} value={hour}>
                            {hour.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Minute select */}
                    <div className="flex-1">
                      <label htmlFor="from-minute-select" className="text-xs text-gray-500">Minute</label>
                      <select
                        id="from-minute-select"
                        value={fromMinutes}
                        onChange={(e) => setFromMinutes(Number(e.target.value))}
                        className="w-full p-2 border rounded-md text-sm"
                      >
                        {minuteOptions.map((minute) => (
                          <option key={minute} value={minute}>
                            {minute.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Show warning if time is in the past */}
                  {isFromTimeInPast() && (
                    <p className="text-xs text-red-500 mt-1">
                      Please select a future time
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-gray-900"
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmTime}
                  disabled={isFromTimeInPast()}
                  className={cn(
                    "bg-black text-white hover:bg-gray-800",
                    isFromTimeInPast() && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Next
                </Button>
              </div>
            </>
          )}

          {/* Return Date Selection */}
          {step === 'to-date' && (
            <>
              <div className="p-3 border-b text-center text-sm font-medium">
                Select Return Date
              </div>
              <Calendar
                mode="single"
                selected={selectedRange?.to}
                onSelect={(date) => handleRangeSelect({
                  from: selectedRange?.from,
                  to: date
                })}
                initialFocus
                disabled={(date) => isPastDate(date) || (selectedRange?.from ? date < selectedRange.from : false)}
                defaultMonth={selectedRange?.from}
                classNames={{
                  day_selected: "bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white",
                  day_today: "text-black font-semibold",
                  day_range_start: "day-range-start bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white",
                  day_range_end: "day-range-end bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white",
                  day_range_middle: "aria-selected:bg-gray-100 aria-selected:text-gray-900"
                }}
              />
              <div className="flex justify-between p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-gray-900"
                >
                  Back
                </Button>
              </div>
            </>
          )}
          
          {/* Return Time Selection */}
          {step === 'to-time' && selectedRange?.to && (
            <>
              <div className="p-4 min-w-[240px]">
                <div className="flex items-center mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBack}
                    className="mr-2 p-1 h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center justify-between flex-1">
                    <span className="text-sm font-medium">Return Time</span>
                    <Clock className="h-4 w-4 text-gray-500" />
                  </div>
                </div>

                <div className="flex flex-col space-y-4">
                  {/* Display both dates */}
                  <div className="text-sm text-center pb-2 border-b">
                    <div className="font-medium">
                      {selectedRange.to && format(selectedRange.to, "PPP")}
                    </div>
                    {selectedRange.from && (
                      <div className="text-xs text-gray-500 mt-1">
                        Departure: {format(selectedRange.from, "PPP")}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {/* Hour select */}
                    <div className="flex-1">
                      <label htmlFor="to-hour-select" className="text-xs text-gray-500">Hour</label>
                      <select
                        id="to-hour-select"
                        value={toHours}
                        onChange={(e) => setToHours(Number(e.target.value))}
                        className="w-full p-2 border rounded-md text-sm"
                      >
                        {hourOptions.map((hour) => (
                          <option key={hour} value={hour}>
                            {hour.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Minute select */}
                    <div className="flex-1">
                      <label htmlFor="to-minute-select" className="text-xs text-gray-500">Minute</label>
                      <select
                        id="to-minute-select"
                        value={toMinutes}
                        onChange={(e) => setToMinutes(Number(e.target.value))}
                        className="w-full p-2 border rounded-md text-sm"
                      >
                        {minuteOptions.map((minute) => (
                          <option key={minute} value={minute}>
                            {minute.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Show warning if return time is before departure time */}
                  {selectedRange?.from && selectedRange.to && 
                   (new Date(selectedRange.from).setHours(fromHours, fromMinutes) >= 
                   new Date(selectedRange.to).setHours(toHours, toMinutes)) && (
                    <p className="text-xs text-red-500 mt-1">
                      Return time must be after departure time
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-gray-900"
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmTime}
                  disabled={hasValidationError}
                  className={cn(
                    "bg-black text-white hover:bg-gray-800",
                    hasValidationError && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Confirm
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}