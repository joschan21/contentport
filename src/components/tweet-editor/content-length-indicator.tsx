import useTweetMetadata from '@/hooks/use-tweet-metdata'

const ContentLengthIndicator = () => {
  const { charCount } = useTweetMetadata()

  const getProgressColor = () => {
    const percentage = (charCount / 280) * 100
    if (percentage >= 100) return 'text-red-500'
    return 'text-blue-500'
  }

  const progress = Math.min((charCount / 280) * 100, 100)
  const circumference = 2 * Math.PI * 10
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <div className="h-8 w-8">
        <svg className="-ml-[5px] -rotate-90 w-full h-full">
          <circle
            className="text-stone-200"
            strokeWidth="2"
            stroke="currentColor"
            fill="transparent"
            r="10"
            cx="16"
            cy="16"
          />
          <circle
            className={`${getProgressColor()} transition-all duration-200`}
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="10"
            cx="16"
            cy="16"
          />
        </svg>
      </div>
      {charCount > 260 && charCount < 280 && (
        <div
          className={`text-sm/6 ${280 - charCount < 1 ? 'text-red-500' : 'text-stone-800'} mr-3.5`}
        >
          <p>{280 - charCount < 20 ? 280 - charCount : charCount}</p>
        </div>
      )}
    </div>
  )
}

export default ContentLengthIndicator
