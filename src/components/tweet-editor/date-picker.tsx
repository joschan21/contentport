'use client'

import * as React from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/client'
import { cn } from '@/lib/utils'
import { CalendarBlankIcon, InfoIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { DayFlag, DayPicker, UI } from 'react-day-picker'
import DuolingoButton from '../ui/duolingo-button'
import { isToday, isTomorrow } from 'date-fns'

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  onSchedule?: (date: Date, time: string, useNaturalTime?: boolean) => void
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

  const session = authClient.useSession()

  const { data } = useQuery({
    queryKey: ['get-scheduled-tweet-count'],
    queryFn: async () => {
      const res = await client.tweet.get_scheduled_count.$get()
      const data = await res.json()

      return data
    },
  })

  const timeSlots = React.useMemo(() => {
    const isAdmin = session?.data?.user?.isAdmin
    const slots: { value: string; label: string }[] = Array.from(
      { length: 96 },
      (_, i) => {
        const totalMinutes = i * 15
        const hour = Math.floor(totalMinutes / 60)
        const minute = totalMinutes % 60
        const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayHour = hour % 12 || 12
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const label = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`
        return { value, label }
      },
    )

    if (isAdmin) {
      const now = new Date()
      const nextMinute = new Date(now.getTime() + 60000)
      const h = nextMinute.getHours()
      const m = nextMinute.getMinutes()
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      const displayHour = h % 12 || 12
      const ampm = h >= 12 ? 'PM' : 'AM'
      slots.unshift({
        value,
        label: `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`,
      })
    }

    return slots
  }, [session?.data?.user?.isAdmin])

  const getNextAvailableTime = (): string => {
    const currentTime = currentHour * 60 + currentMinute
    return (
      timeSlots.find((t) => {
        const [h, m] = t.value.split(':').map(Number)
        const slotTime = (h ?? 0) * 60 + (m ?? 0)
        return slotTime > currentTime
      })?.value ??
      timeSlots[0]?.value ??
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
  const [selectedTime, setSelectedTime] = React.useState<string | null>(getInitialTime())

  const getInitialAmPm = (): 'AM' | 'PM' => {
    return currentHour >= 12 ? 'PM' : 'AM'
  }

  const [ampm, setAmPm] = React.useState<'AM' | 'PM'>(getInitialAmPm())

  const isTimeSlotDisabled = (value: string) => {
    if (!date || date.toDateString() !== today.toDateString()) {
      return false
    }

    const [hour, minute] = value.split(':').map(Number)
    const slotTime = (hour ?? 0) * 60 + (minute ?? 0)
    const currentTime = currentHour * 60 + currentMinute

    return slotTime <= currentTime
  }

  const hasAvailableSlots = React.useMemo(() => {
    if (!date) return { AM: true, PM: true }

    if (date.toDateString() !== today.toDateString()) {
      return { AM: true, PM: true }
    }

    const currentTimeInMinutes = currentHour * 60 + currentMinute

    const hasAMSlots = timeSlots.some((t) => {
      const [hour, minute] = t.value.split(':').map(Number)
      const slotTimeInMinutes = (hour ?? 0) * 60 + (minute ?? 0)
      return (hour ?? 0) < 12 && slotTimeInMinutes > currentTimeInMinutes
    })

    const hasPMSlots = timeSlots.some((t) => {
      const [hour, minute] = t.value.split(':').map(Number)
      const slotTimeInMinutes = (hour ?? 0) * 60 + (minute ?? 0)
      return (hour ?? 0) >= 12 && slotTimeInMinutes > currentTimeInMinutes
    })

    return {
      AM: hasAMSlots,
      PM: hasPMSlots,
    }
  }, [date, timeSlots, currentHour, currentMinute, today])

  React.useEffect(() => {
    if (!hasAvailableSlots[ampm]) {
      if (ampm === 'AM' && hasAvailableSlots.PM) {
        setAmPm('PM')
      } else if (ampm === 'PM' && hasAvailableSlots.AM) {
        setAmPm('AM')
      }
    }
  }, [ampm, hasAvailableSlots])

  const selectedTimeLabel = React.useMemo(() => {
    const found = timeSlots.find((t) => t.value === selectedTime)
    return found?.label ?? selectedTime
  }, [selectedTime, timeSlots])

  const formatDateDisplay = (date: Date): string => {
    if (isToday(date)) {
      return `Today, ${date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
      })}`
    }
    if (isTomorrow(date)) {
      return `Tomorrow, ${date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
      })}`
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
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
              [DayFlag.outside]:
                'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
              [DayFlag.disabled]: 'text-muted-foreground opacity-50',
              [DayFlag.hidden]: 'invisible',
              ...classNames,
            }}
          />
        </div>
        <div className="no-scrollbar inset-y-0 right-0 flex max-h-72 w-full scroll-pb-6 flex-col gap-4 overflow-y-auto border-t p-6 md:absolute md:max-h-none md:w-56 md:border-t-0 md:border-l">
          <div className="flex gap-2 pb-4 border-b border-border">
            {(['AM', 'PM'] as const).map((opt) => (
              <DuolingoButton
                key={opt}
                size="sm"
                variant={ampm === opt ? 'primary' : 'secondary'}
                onClick={() => setAmPm(opt)}
                className="flex-1 h-8"
                disabled={!hasAvailableSlots[opt]}
              >
                {opt}
              </DuolingoButton>
            ))}
          </div>
          <div className="grid gap-2">
            {timeSlots
              .filter((t) => {
                const h = parseInt(t.value.split(':')[0] ?? '0', 10)
                return ampm === 'AM' ? h < 12 : h >= 12
              })
              .filter((t) => !isTimeSlotDisabled(t.value))
              .map((t, i) => (
                <DuolingoButton
                  size="sm"
                  className="h-9"
                  key={`${t.value}-${i}`}
                  variant={selectedTime === t.value ? 'primary' : 'secondary'}
                  onClick={() => setSelectedTime(t.value)}
                >
                  {t.label}
                </DuolingoButton>
              ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t p-4 md:flex-row">
        <div className="flex flex-col gap-1.5">
          <div className="text-sm">
            {date && selectedTime ? (
              <>
                <span className="text-gray-500">
                  {editMode ? 'Reschedule for' : 'Schedule for'}{' '}
                </span>
                <span className="font-medium">
                  {' '}
                  {formatDateDisplay(date)}{' '}
                </span>
                <span className="text-gray-500">at</span>{' '}
                <span className="font-medium">{selectedTimeLabel}</span>
              </>
            ) : null}
          </div>
          {session?.data?.user?.plan === 'free' ? (
            <p className="inline-flex items-center text-xs text-gray-500">
              <InfoIcon className="size-3 mr-1" /> Upgrade to schedule unlimited tweets
              ({data?.count ?? 0}/3 used)
            </p>
          ) : (
            <p className="inline-flex items-center text-xs text-gray-500">
              <InfoIcon className="size-3 mr-1" /> You can schedule unlimited tweets
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 w-full md:ml-auto md:w-auto">
          {/* temporarily disabled */}
          {/* <div className="flex items-center space-x-2">
            <Checkbox
              id="natural-time"
              checked={useNaturalTime}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                setUseNaturalTime(isChecked)
                if (isChecked) {
                  localStorage.setItem('useNaturalPostingTime', 'true')
                } else {
                  localStorage.removeItem('useNaturalPostingTime')
                }
              }}
            />
            <Label
              htmlFor="natural-time"
              className="text-sm font-normal cursor-pointer text-muted-foreground"
            >
              Natural posting time (±4 min)
            </Label>
          </div> */}

          <DuolingoButton
            loading={isPending}
            size="sm"
            disabled={!date || !selectedTime}
            className="w-full"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()

              if (date && selectedTime && onSchedule) {
                onSchedule(date, selectedTime)
              }
            }}
          >
            {editMode ? null : <CalendarBlankIcon className="size-4 mr-1.5" />}
            {editMode ? 'Reschedule' : 'Schedule'}
          </DuolingoButton>
        </div>
      </CardFooter>
    </Card>
  )
}
