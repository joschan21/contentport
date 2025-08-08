"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TimezoneSelectorProps {
  className?: string
  size?: "sm" | "default"
}

const commonTimezones = [
  { value: "America/New_York", label: "Eastern Time (ET) - New York" },
  { value: "America/Chicago", label: "Central Time (CT) - Chicago" },
  { value: "America/Denver", label: "Mountain Time (MT) - Denver" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT) - Los Angeles" },
  { value: "America/Anchorage", label: "Alaska Time (AK) - Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT) - Honolulu" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT) - London" },
  { value: "Europe/Paris", label: "Central European Time (CET) - Paris" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST) - Tokyo" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET) - Sydney" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST) - Dubai" },
  { value: "Asia/Shanghai", label: "China Standard Time (CST) - Shanghai" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST) - Mumbai" },
  { value: "America/Sao_Paulo", label: "Brasília Time (BRT) - São Paulo" },
  { value: "Africa/Johannesburg", label: "South Africa Standard Time (SAST) - Johannesburg" },
]

export function TimezoneSelector({ className, size = "default" }: TimezoneSelectorProps) {
  const [timezone, setTimezone] = React.useState<string>("")

  React.useEffect(() => {
    const savedTimezone = localStorage.getItem("userTimezone")
    if (savedTimezone) {
      setTimezone(savedTimezone)
    } else {
      // Default to user's local timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      setTimezone(userTimezone)
      localStorage.setItem("userTimezone", userTimezone)
    }
  }, [])

  const handleTimezoneChange = (value: string) => {
    setTimezone(value)
    localStorage.setItem("userTimezone", value)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Timezone</span>
      <Select value={timezone} onValueChange={handleTimezoneChange}>
        <SelectTrigger className={cn("w-[280px]", className)} size={size}>
          <SelectValue placeholder="Select timezone" />
        </SelectTrigger>
        <SelectContent>
          {commonTimezones.map((tz) => (
            <SelectItem key={tz.value} value={tz.value}>
              {tz.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default TimezoneSelector