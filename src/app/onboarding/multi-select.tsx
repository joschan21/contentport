'use client'

import { cn } from '@/lib/utils'
import { CheckIcon } from '@phosphor-icons/react'

interface MultiSelectOption {
  label: string
  value: string
  description?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  name?: string
  className?: string
}

export const MultiSelect = ({
  options,
  value,
  onChange,
  name,
  className,
}: MultiSelectProps) => {
  const handleOptionToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onChange(newValue)
  }

  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {options.map((option) => {
        const isSelected = value.includes(option.value)

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleOptionToggle(option.value)}
            className={cn(
              'flex flex-col items-start p-4 rounded-lg transition-[color,box-shadow] outline-none text-left min-w-0 flex-1 basis-[calc(50%-0.375rem)]',
              'bg-white shadow-inner ring-1 ring-black/15 shadow-xs bg-clip-padding',
              'hover:ring-black/25',
              'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600',
              'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
              isSelected
                ? 'ring-2 ring-inset ring-indigo-600 hover:ring-indigo-600 bg-indigo-50/50'
                : '',
            )}
            data-selected={isSelected}
            name={name}
            value={option.value}
          >
            <div className="flex items-center justify-between w-full">
              <span
                className={cn(
                  'text-sm leading-tight',
                  isSelected ? 'text-indigo-800' : 'text-gray-900',
                )}
              >
                {option.label}
              </span>
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center ml-3 flex-shrink-0',
                  isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300',
                )}
              >
                {isSelected && <CheckIcon className="size-3 text-white" weight='bold' />}
              </div>
            </div>
            {option.description && (
              <span
                className={cn(
                  'text-xs mt-1 leading-tight',
                  isSelected ? 'text-indigo-700' : 'text-gray-600',
                )}
              >
                {option.description}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
