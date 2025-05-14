"use client"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
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

  const handleRangeSelect = (range: DateRange | undefined) => {
    setSelectedRange(range)
  }

  const handleOkClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedRange) {
      // Create a new range with the selected times
      const rangeWithTime: DateRange = {
        from: selectedRange.from ? new Date(selectedRange.from) : undefined,
        to: selectedRange.to ? new Date(selectedRange.to) : undefined
      }
      
      // Apply times to the dates
      if (rangeWithTime.from) {
        rangeWithTime.from.setHours(fromHours)
        rangeWithTime.from.setMinutes(fromMinutes)
      }
      
      if (rangeWithTime.to) {
        rangeWithTime.to.setHours(toHours)
        rangeWithTime.to.setMinutes(toMinutes)
      }
      
      onDateRangeChange(rangeWithTime)
    } else {
      onDateRangeChange(undefined)
    }
    setOpen(false)
  }

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedRange(undefined)
    onDateRangeChange(undefined)
    setOpen(false)
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
  
  // Is any validation error present?
  const hasValidationError = isFromTimeInPast() || 
                            (selectedRange?.from && selectedRange?.to && 
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          <Calendar
            mode="range"
            selected={selectedRange}
            onSelect={handleRangeSelect}
            initialFocus
            defaultMonth={selectedRange?.from}
            disabled={isPastDate}
            classNames={{
              day_selected: "bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white",
              day_today: "text-black font-semibold",
              day_range_start: "day-range-start bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white",
              day_range_end: "day-range-end bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white",
              day_range_middle: "aria-selected:bg-gray-100 aria-selected:text-gray-900"
            }}
          />
          
          {/* Time Picker Section */}
          <div className="p-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Set Times</span>
              <Clock className="h-4 w-4 text-gray-500" />
            </div>
            
            {/* From Time */}
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">Departure Time</div>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <select
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
                <div className="flex-1">
                  <select
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
              
              {isFromTimeInPast() && (
                <p className="text-xs text-red-500 mt-1">
                  Please select a future time
                </p>
              )}
            </div>
            
            {/* To Time - Only show if a range is selected */}
            {selectedRange?.to && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Return Time</div>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <select
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
                  <div className="flex-1">
                    <select
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
                
                {/* Show warning if to date is before from date with times */}
                {selectedRange?.from && selectedRange?.to && 
                 new Date(selectedRange.from).setHours(fromHours, fromMinutes) >= 
                 new Date(selectedRange.to).setHours(toHours, toMinutes) && (
                  <p className="text-xs text-red-500 mt-1">
                    Return time must be after departure time
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-between p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearClick}
              className="text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-gray-900"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleOkClick}
              disabled={hasValidationError}
              className={cn(
                "bg-black text-white hover:bg-gray-800",
                hasValidationError && "opacity-50 cursor-not-allowed"
              )}
            >
              Confirm
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}