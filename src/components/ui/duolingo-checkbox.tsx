'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface DuolingoCheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  description?: string
  fullWidth?: boolean
}

const DuolingoCheckbox = forwardRef<HTMLInputElement, DuolingoCheckboxProps>(
  (
    {
      className,
      label,
      description,
      fullWidth = false,
      checked,
      disabled = false,
      id,
      ...props
    },
    ref,
  ) => {
    return (
      <div className={cn('flex items-center gap-3', fullWidth ? 'w-full' : 'max-w-sm')}>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <label
            htmlFor={id}
            className={cn(
              'w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer',
              checked
                ? 'border-indigo-600 bg-indigo-600 shadow-[0_2px_0_#4F46E5]'
                : 'border-gray-300 bg-white shadow-[0_2px_0_#E5E7EB] hover:border-gray-400',
              disabled && 'opacity-60 cursor-not-allowed',
              className,
            )}
          >
            {checked && <Check className="w-3 h-3 text-white stroke-[3]" />}
          </label>
        </div>
        <label
          htmlFor={id}
          className={cn(
            'text-base cursor-pointer select-none opacity-60',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
        >
          <span>{label}</span>
          {description && (
            <span className="block text-xs text-gray-500 font-normal mt-0.5">
              {description}
            </span>
          )}
        </label>
      </div>
    )
  },
)

DuolingoCheckbox.displayName = 'DuolingoCheckbox'

export default DuolingoCheckbox
