"use client"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
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

  const handleRangeSelect = (range: DateRange | undefined) => {
    setSelectedRange(range)
  }

  const handleOkClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDateRangeChange(selectedRange)
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
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              placeholder
            )}
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
            <Button
              size="sm"
              onClick={handleOkClick}
              className="bg-black text-white hover:bg-gray-800"
            >
              Confirm
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}