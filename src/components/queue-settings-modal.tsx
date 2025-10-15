import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AccountAvatar, AccountName } from '@/hooks/account-ctx'
import { client } from '@/lib/client'
import { ClockIcon, InfoIcon } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader } from './ai-elements/loader'
import DuolingoButton from './ui/duolingo-button'
import { Card, CardFooter } from './ui/card'

type QueueSettings = Record<string, number[]>

interface QueueSettingsModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  onSettingsUpdated?: () => void
}

const DAYS = [
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
  { value: '0', label: 'Sun' },
]

const generateTimeOptions = () => {
  const options = []
  for (let i = 0; i < 24 * 4; i++) {
    const totalMinutes = i * 15
    const hours24 = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const period = hours24 >= 12 ? 'PM' : 'AM'
    const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24
    const label = `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
    options.push({ value: totalMinutes, label })
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

const formatTime = (minutesFromMidnight: number) => {
  const hours24 = Math.floor(minutesFromMidnight / 60)
  const minutes = minutesFromMidnight % 60
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

export const QueueSettingsModal = ({
  open,
  setOpen,
  onSettingsUpdated,
}: QueueSettingsModalProps) => {
  const queryClient = useQueryClient()
  const [settings, setSettings] = useState<QueueSettings>({})
  const [availableTimes, setAvailableTimes] = useState<number[]>([600, 720, 840])
  const [useNaturalTimeByDefault, setUseNaturalTimeByDefault] = useState(false)
  const [useAutoDelayByDefault, setUseAutoDelayByDefault] = useState(false)

  const { data, isPending: loading } = useQuery({
    queryKey: ['queue-settings'],
    queryFn: async () => {
      const response = await client.settings.get_queue_settings.$get()
      return await response.json()
    },
  })

  useEffect(() => {
    if (data) {
      setSettings(data.queueSettings)
      setUseNaturalTimeByDefault(data.useNaturalTimeByDefault ?? false)
      setUseAutoDelayByDefault(data.useAutoDelayByDefault ?? false)

      const allTimes = new Set<number>()
      Object.values(data.queueSettings).forEach((times) => {
        times.forEach((time) => allTimes.add(time))
      })
      if (allTimes.size > 0) {
        setAvailableTimes(Array.from(allTimes).sort((a, b) => a - b))
      }
    }
  }, [data])

  const { mutate: handleSave, isPending: saving } = useMutation({
    mutationFn: async ({
      queueSettings,
      useNaturalTimeByDefault,
      useAutoDelayByDefault,
    }: {
      queueSettings: QueueSettings
      useNaturalTimeByDefault: boolean
      useAutoDelayByDefault: boolean
    }) => {
      const response = await client.settings.update_queue_settings.$post({
        queueSettings,
        useNaturalTimeByDefault,
        useAutoDelayByDefault,
      })
      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-settings'] })
      queryClient.invalidateQueries({ queryKey: ['next-queue-slot'] })
      queryClient.invalidateQueries({ queryKey: ['queue-slots'] })
      toast.success('Queue settings updated')
      onSettingsUpdated?.()
      setOpen(false)
    },
    onError: (error) => {
      const errorMessage = error?.message || 'Failed to save queue settings'
      toast.error(errorMessage)
    },
  })

  const toggleSlot = (day: string, time: number) => {
    setSettings((prev) => {
      const daySlots = prev[day] || []
      const newSlots = daySlots.includes(time)
        ? daySlots.filter((t) => t !== time)
        : [...daySlots, time].sort((a, b) => a - b)

      return {
        ...prev,
        [day]: newSlots,
      }
    })
  }

  const addTimeSlot = (time: number) => {
    if (availableTimes.length >= 10) {
      toast.error('Maximum 10 time slots allowed')
      return
    }
    if (!availableTimes.includes(time)) {
      setAvailableTimes((prev) => [...prev, time].sort((a, b) => a - b))
    }
  }

  const removeTimeSlot = (time: number) => {
    setAvailableTimes((prev) => prev.filter((t) => t !== time))
    setSettings((prev) => {
      const newSettings = { ...prev }
      Object.keys(newSettings).forEach((day) => {
        newSettings[day] = newSettings[day]!.filter((t) => t !== time)
      })
      return newSettings
    })
  }

  const [selectedTime, setSelectedTime] = useState<string>('')

  const handleModalChange = (value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === 'function' ? value(open) : value
    setOpen(newValue)
  }

  return (
    <Modal
      showModal={open}
      setShowModal={handleModalChange}
      className="max-w-3xl max-h-[90vh]"
    >
      <div className="p-6">
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-4">
            <AccountAvatar className="size-8 shrink-0" />
            <div className="flex flex-col gap-1 justify-center">
              <AccountName className="text-base leading-none font-medium text-gray-900" />
              <p className="text-sm leading-none text-gray-500">Queue Settings</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <Loader />
            <p className="text-gray-500">Loading queue...</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="natural-time-default"
                    checked={useNaturalTimeByDefault}
                    onCheckedChange={(checked) =>
                      setUseNaturalTimeByDefault(checked === true)
                    }
                  />
                  <Label
                    htmlFor="natural-time-default"
                    className="text-sm font-medium text-gray-800 cursor-pointer"
                  >
                    Use natural posting times (recommended)
                  </Label>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon
                      weight="bold"
                      className="size-4 text-gray-500 shrink-0 mt-px cursor-help"
                    />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    When enabled, new posts are published ±4 minutes around the scheduled
                    time to appear more natural.
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-start gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="auto-delay-default"
                    checked={useAutoDelayByDefault}
                    onCheckedChange={(checked) =>
                      setUseAutoDelayByDefault(checked === true)
                    }
                  />
                  <Label
                    htmlFor="auto-delay-default"
                    className="text-sm font-medium text-gray-800 cursor-pointer"
                  >
                    Use auto-delay for threads (recommended)
                  </Label>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon
                      weight="bold"
                      className="size-4 text-gray-500 shrink-0 mt-px cursor-help"
                    />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    When enabled, each tweet in a thread is delayed by 1 minute from the
                    previous tweet for better algorithmic performance.
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <Card className="p-0 gap-0">
              <div
                className="grid bg-muted"
                style={{ gridTemplateColumns: 'minmax(140px, auto) repeat(7, 1fr)' }}
              >
                <div className="p-3 text-sm font-medium border-r">Time</div>
                {DAYS.map((day) => (
                  <div
                    key={day.value}
                    className="p-3 text-sm font-medium text-center border-r last:border-r-0"
                  >
                    {day.label}
                  </div>
                ))}
              </div>

              <div className="divide-y max-h-[400px] overflow-y-auto">
                {availableTimes.map((time) => (
                  <div
                    key={time}
                    className="grid hover:bg-muted/50"
                    style={{ gridTemplateColumns: 'minmax(140px, auto) repeat(7, 1fr)' }}
                  >
                    <div className="px-4 py-3.5 text-sm border-r flex items-center justify-between gap-4">
                      <span className="whitespace-nowrap font-medium">
                        {formatTime(time)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeTimeSlot(time)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {DAYS.map((day) => (
                      <div
                        key={`${day.value}-${time}`}
                        className="p-3 border-r last:border-r-0 flex items-center justify-center cursor-pointer hover:bg-muted/70"
                        onClick={() => toggleSlot(day.value, time)}
                      >
                        <Checkbox
                          checked={settings[day.value]?.includes(time) ?? false}
                        />
                      </div>
                    ))}
                  </div>
                ))}

                {availableTimes.length < 10 && (
                  <div
                    className="bg-muted/30 border-t-2 border-dashed hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={(e) => {
                      const trigger = e.currentTarget.querySelector('[role="combobox"]')
                      if (trigger) {
                        ;(trigger as HTMLElement).click()
                      }
                    }}
                  >
                    <div className="p-4 flex items-center justify-start gap-2">
                      <Plus className="w-4 h-4 text-gray-400" />
                      <Select
                        value={selectedTime}
                        onValueChange={(value) => {
                          setSelectedTime(value)
                          addTimeSlot(Number(value))
                          setSelectedTime('')
                        }}
                      >
                        <SelectTrigger className="h-8 w-fit bg-white border-dashed">
                          <SelectValue placeholder="Add time slot..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {TIME_OPTIONS.filter(
                            (opt) => !availableTimes.includes(opt.value),
                          ).map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value.toString()}
                              className="font-medium flex items-center gap-2"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {availableTimes.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No time slots added. Use the row below to add your first time slot.
                  </div>
                )}
              </div>
            </Card>

            <p className="text-gray-500 inline-flex items-center gap-1.5 text-sm">
              <InfoIcon weight="bold" className="size-4" />
              Don't worry: Editing your schedule here won't affect posts that are already
              scheduled.
            </p>

            <div className="flex justify-end gap-2">
              <DuolingoButton
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </DuolingoButton>
              <DuolingoButton
                onClick={() =>
                  handleSave({
                    queueSettings: settings,
                    useNaturalTimeByDefault,
                    useAutoDelayByDefault,
                  })
                }
                loading={saving}
              >
                Save
              </DuolingoButton>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
