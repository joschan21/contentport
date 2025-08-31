import DuolingoButton from '@/components/ui/duolingo-button'
import { XLogoIcon } from '@phosphor-icons/react'

interface EmptyStateProps {
  onAddKeywords: () => void
}

export const EmptyState = ({ onAddKeywords }: EmptyStateProps) => {
  return (
    <div className='bg-white py-20 rounded-2xl border border-black border-opacity-[0.01] bg-clip-padding shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]'>
      <div className="text-center max-w-xs mx-auto">
        <XLogoIcon className="mx-auto size-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No tweets yet</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by adding keywords to monitor.</p>
        <div className="mt-6">
          <DuolingoButton size="sm">Add keywords</DuolingoButton>
        </div>
      </div>
    </div>
  )
}
