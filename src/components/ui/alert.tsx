import { cn } from '@/lib/utils'
import { type VariantProps, cva } from 'class-variance-authority'

import type * as React from 'react'

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const Alert = ({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants>) => (
  <div
    data-slot="alert"
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
)
Alert.displayName = 'Alert'

const AlertTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h5
    data-slot="alert-title"
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
)
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <div
    data-slot="alert-description"
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
)
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertDescription, AlertTitle }
