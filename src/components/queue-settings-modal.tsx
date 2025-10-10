import { useState, useEffect, Dispatch, SetStateAction } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { client } from '@/lib/client'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import DuolingoButton from './ui/duolingo-button'
import { Loader } from './ai-elements/loader'
import { AccountAvatar, AccountName, AccountHandle } from '@/hooks/account-ctx'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

type QueueSettings = Record<string, number[]>

interface QueueSettingsModalProps {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
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

  const { data, isPending: loading } = useQuery({
    queryKey: ['queue-settings'],
    queryFn: async () => {
      const response = await client.tweet.get_queue_settings.$get()
      return await response.json()
    },
  })

  useEffect(() => {
    if (data) {
      setSettings(data.queueSettings)

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
    mutationFn: async (queueSettings: QueueSettings) => {
      const response = await client.tweet.update_queue_settings.$post({
        queueSettings,
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

          <p className="text-gray-500">
            Don't worry: Editing your schedule here won't affect posts that are already
            scheduled.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <Loader />
            <p className="text-gray-500">Loading queue...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-8 bg-muted">
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
                  <div key={time} className="grid grid-cols-8 hover:bg-muted/50">
                    <div className="p-3 text-sm border-r flex items-center justify-between">
                      <span>{formatTime(time)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeTimeSlot(time)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    {DAYS.map((day) => (
                      <div
                        key={`${day.value}-${time}`}
                        className="p-3 border-r last:border-r-0 flex items-center justify-center"
                      >
                        <Checkbox
                          checked={settings[day.value]?.includes(time) ?? false}
                          onCheckedChange={() => toggleSlot(day.value, time)}
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
                    <div className="p-4 flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4 text-gray-400" />
                      <Select
                        value={selectedTime}
                        onValueChange={(value) => {
                          setSelectedTime(value)
                          addTimeSlot(Number(value))
                          setSelectedTime('')
                        }}
                      >
                        <SelectTrigger className="h-8 w-full bg-white border-dashed">
                          <SelectValue placeholder="Add time slot..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {TIME_OPTIONS.filter(
                            (opt) => !availableTimes.includes(opt.value),
                          ).map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value.toString()}
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
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <DuolingoButton
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </DuolingoButton>
              <DuolingoButton onClick={() => handleSave(settings)} loading={saving}>
                Save Settings
              </DuolingoButton>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
