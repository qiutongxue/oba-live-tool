import { cn } from '@/lib/utils'

import type * as React from 'react'

const Textarea = ({
  className,
  ...props
}: React.ComponentProps<'textarea'>) => {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}
Textarea.displayName = 'Textarea'

export { Textarea }
