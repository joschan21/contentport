export const baseStyles =
  'font-semibold w-full rounded-lg relative transition-transform active:translate-y-0.5 active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center'

export const variantStyles = {
  primary:
    'bg-indigo-600 text-white border bg-clip-padding border-b-2 border-indigo-700 hover:bg-indigo-500 shadow-[0_3px_0_#3730a3] focus:ring-indigo-600',
  secondary:
    'bg-[#FFFFFF] border bg-clip-padding text-stone-800 border-b-2 border-[#E5E5E5] hover:bg-light-gray shadow-[0_3px_0_#E5E5E5] focus:ring-[#E5E5E5]',
  disabled:
    'bg-[#E5E5E5] text-[#AFAFAF] border-b-2 border-[#CCCCCC] cursor-not-allowed shadow-[0_3px_0_#CCCCCC]',
  icon: 'bg-indigo-600 text-white border-b-2 border-indigo-700 hover:bg-indigo-500 shadow-[0_3px_0_#4338CA] focus:ring-indigo-600 p-0 flex items-center justify-center',
  destructive:
    'bg-red-500 text-white border-b-2 border-red-600 hover:bg-red-600 shadow-[0_3px_0_#B91C1C] focus:ring-red-500',
  dashedOutline:
    'bg-white text-gray-600 border-2 bg-clip-padding border-dashed border-stone-300 border-b-[4px] hover:bg-stone-50 focus:ring-gray-400',
  emerald:
    'bg-emerald-600 text-white border bg-clip-padding border-b-2 border-emerald-700 hover:bg-emerald-500 shadow-[0_3px_0_#065f46] focus:ring-emerald-600',
}

export const sizeStyles = {
  sm: 'text-sm py-2 px-4',
  md: 'text-base py-3 px-6',
  lg: 'text-lg py-4 px-8',
  icon: 'h-10 w-10',
}
