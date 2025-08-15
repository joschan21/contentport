'use client'

import * as React from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { DayFlag, DayPicker, SelectionState, UI } from 'react-day-picker'
import { cn } from '@/lib/utils'
import DuolingoButton from '../ui/duolingo-button'

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  onSchedule?: (date: Date, time: string) => void
  isPending?: boolean
  initialScheduledTime?: Date
  editMode?: boolean
}

export const Calendar20 = ({
  className,
  classNames,
  showOutsideDays = true,
  onSchedule,
  isPending,
  initialScheduledTime,
  editMode,
  ...props
}: CalendarProps) => {
  const today = new Date()
  const currentHour = today.getHours()
  const currentMinute = today.getMinutes()

  const timeSlots = Array.from({ length: 1440 }, (_, i) => {
    const hour = Math.floor(i / 60)
    const minute = i % 60
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  })

  const getNextAvailableTime = (): string => {
    const currentTime = currentHour * 60 + currentMinute
    return (
      timeSlots.find((timeSlot) => {
        const timeParts = timeSlot.split(':').map(Number)
        const hour = timeParts[0] ?? 0
        const minute = timeParts[1] ?? 0
        const slotTime = hour * 60 + minute
        return slotTime > currentTime
      }) ??
      timeSlots[0] ??
      '10:00'
    )
  }

  const getInitialDate = (): Date => {
    return initialScheduledTime ? new Date(initialScheduledTime) : new Date()
  }

  const getInitialTime = (): string => {
    if (initialScheduledTime) {
      const scheduledDate = new Date(initialScheduledTime)
      const hour = scheduledDate.getHours().toString().padStart(2, '0')
      const minute = scheduledDate.getMinutes().toString().padStart(2, '0')
      return `${hour}:${minute}`
    }
    return getNextAvailableTime()
  }

  const [date, setDate] = React.useState<Date | undefined>(getInitialDate())
  const [selectedTime, setSelectedTime] = React.useState<string | null>(
    getInitialTime(),
  )

  const isTimeSlotDisabled = (timeString: string) => {
    if (!date || date.toDateString() !== today.toDateString()) {
      return false
    }

    const timeParts = timeString.split(':').map(Number)
    const hour = timeParts[0] ?? 0
    const minute = timeParts[1] ?? 0
    const slotTime = hour * 60 + minute
    const currentTime = currentHour * 60 + currentMinute

    return slotTime <= currentTime
  }

  const isPastDate = (date: Date) => {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return dateOnly < todayOnly
  }

  return (
    <Card className="w-full gap-0 p-0">
      <CardContent className="relative">
        <div className="p-5">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            defaultMonth={date}
            disabled={isPastDate}
            showOutsideDays={false}
            startMonth={today}
            className="p-0 [--cell-size:--spacing(12)]"
            formatters={{
              formatWeekdayName: (date) => {
                return date.toLocaleString('en-US', { weekday: 'short' })
              },
            }}
            classNames={{
              day: 'size-12 rounded-xl',
              selected: 'z-10 rounded-md',
              [UI.Months]: 'relative',
              [UI.Month]: 'space-y-4 ml-0',
              [UI.MonthCaption]: 'flex w-full justify-center items-center h-7',
              [UI.CaptionLabel]: 'text-sm font-medium',
              [UI.PreviousMonthButton]: cn(
                buttonVariants({ variant: 'outline' }),
                'absolute left-1 top-0 size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
              ),
              [UI.NextMonthButton]: cn(
                buttonVariants({ variant: 'outline' }),
                'absolute right-1 top-0 size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
              ),
              [UI.MonthGrid]: 'w-full border-collapse space-y-1',
              [UI.Weekdays]: 'flex',
              [UI.Weekday]:
                'text-muted-foreground rounded-md w-12 font-normal text-[0.8rem]',
              [UI.Week]: 'flex w-full mt-2',
              //   [UI.Day]:
              //     'h-9 w-9 text-center rounded-md text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
              //   [UI.DayButton]: cn(
              //     buttonVariants({ variant: 'ghost' }),
              //     'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary hover:text-primary-foreground',
              //   ),
              //   [SelectionState.range_end]: 'day-range-end',
              //   [SelectionState.selected]:
              //     'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
              //   [SelectionState.range_middle]:
              //     'aria-selected:bg-accent aria-selected:text-accent-foreground',
              //   [DayFlag.today]: 'bg-accent text-accent-foreground',
              [DayFlag.outside]:
                'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
              [DayFlag.disabled]: 'text-muted-foreground opacity-50',
              [DayFlag.hidden]: 'invisible',
              ...classNames,
            }}
          />
        </div>
        <div className="no-scrollbar inset-y-0 right-0 flex max-h-72 w-full scroll-pb-6 flex-col gap-4 overflow-y-auto border-t p-6 md:absolute md:max-h-none md:w-48 md:border-t-0 md:border-l">
          <div className="grid gap-2">
            {timeSlots
              .filter((time) => !isTimeSlotDisabled(time))
              .map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? 'default' : 'outline'}
                  onClick={() => setSelectedTime(time)}
                  className="w-full shadow-none"
                >
                  {time}
                </Button>
              ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t py-4 md:flex-row">
        <div className="text-sm">
          {date && selectedTime ? (
            <>
              {editMode ? 'Reschedule for' : 'Scheduled for'}{' '}
              <span className="font-medium">
                {' '}
                {date?.toLocaleDateString('en-US', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}{' '}
              </span>
              at <span className="font-medium">{selectedTime}</span>.
            </>
          ) : (
            <>Select a date and time for your meeting.</>
          )}
        </div>
        <DuolingoButton
          loading={isPending}
          size="sm"
          disabled={!date || !selectedTime}
          className="w-full md:ml-auto md:w-auto"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            
            if (date && selectedTime && onSchedule) {
              onSchedule(date, selectedTime)
            }
          }}
        >
          {editMode ? 'Reschedule' : 'Schedule'}
        </DuolingoButton>
      </CardFooter>
    </Card>
  )
}
