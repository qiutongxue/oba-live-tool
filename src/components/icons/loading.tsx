import { cn } from '@/lib/utils'

interface LoadingIconProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

export function LoadingIcon({
  size = 'md',
  color = 'text-primary',
  className,
}: LoadingIconProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-gray-400 border-t-transparent',
          'shadow-sm',
          sizeClasses[size],
          color,
        )}
        style={{
          animationDuration: '0.6s',
        }}
        aria-label="Loading"
      />
      <span className="sr-only">Loading...</span>
    </div>
  )
}
