import { Card } from '@/components/ui/card'
import DuolingoButton from '@/components/ui/duolingo-button'
import { GhostIcon, XLogoIcon } from '@phosphor-icons/react'

interface EmptyStateProps {
  title: string
  description: string
}

export const EmptyState = ({ title, description }: EmptyStateProps) => {
  return (
    <Card className="py-20">
      <div className="text-center max-w-xs mx-auto">
        <GhostIcon className="mx-auto size-6 text-gray-400" />
        <h3 className="mt-2 font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-gray-500">{description}</p>
      </div>
    </Card>
  )
}
