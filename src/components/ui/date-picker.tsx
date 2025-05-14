"use client"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { useState } from "react"

interface DatePickerProps {
  date?: Date
  onDateChange: (date: Date | undefined) => void
  className?: string
  placeholder?: string
}

export function DatePicker({ date, onDateChange, className, placeholder = "Pick a date" }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date)
  const [hours, setHours] = useState<number>(date ? date.getHours() : 12)
  const [minutes, setMinutes] = useState<number>(date ? date.getMinutes() : 0)

  const handleSelect = (date: Date | undefined) => {
    setSelectedDate(date)
  }

  const handleOkClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedDate) {
      // Create a new date with the selected time
      const dateWithTime = new Date(selectedDate)
      dateWithTime.setHours(hours)
      dateWithTime.setMinutes(minutes)
      onDateChange(dateWithTime)
    } else {
      onDateChange(undefined)
    }
    setOpen(false)
  }

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedDate(undefined)
    onDateChange(undefined)
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
  
  // If today is selected, check if the selected time is in the past
  const isTimeInPast = () => {
    if (!selectedDate) return false
    
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Only validate time if the selected date is today
    if (selectedDate.getTime() === today.getTime()) {
      const selectedTime = new Date(today)
      selectedTime.setHours(hours)
      selectedTime.setMinutes(minutes)
      return selectedTime < now
    }
    
    return false
  }
  
  // Generate hour options (24-hour format)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i)
  
  // Generate minute options (every 15 minutes)
  const minuteOptions = [0, 15, 30, 45]
  
  // Format the display date with time
  const formattedDate = date 
    ? `${format(date, "PPP")} at ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-between bg-white hover:bg-white focus:ring-2 focus:ring-black h-[42px]",
            !date && "text-gray-500",
            className
          )}
        >
          {formattedDate}
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
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
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

          {/* Time Picker */}
          <div className="p-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Set Time</span>
              <Clock className="h-4 w-4 text-gray-500" />
            </div>
            <div className="flex space-x-2">
              {/* Hour select */}
              <div className="flex-1">
                <label htmlFor="hour-select" className="text-xs text-gray-500">Hour</label>
                <select
                  id="hour-select"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
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
                <label htmlFor="minute-select" className="text-xs text-gray-500">Minute</label>
                <select
                  id="minute-select"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
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
            {isTimeInPast() && (
              <p className="text-xs text-red-500 mt-1">
                Please select a future time
              </p>
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
              disabled={isTimeInPast()}
              className={cn(
                "bg-black text-white hover:bg-gray-800",
                isTimeInPast() && "opacity-50 cursor-not-allowed"
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