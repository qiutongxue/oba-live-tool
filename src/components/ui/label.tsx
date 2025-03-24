import { cn } from '@/lib/utils'
import * as LabelPrimitive from '@radix-ui/react-label'
import { type VariantProps, cva } from 'class-variance-authority'

import type React from 'react'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
)

const Label = ({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> &
  VariantProps<typeof labelVariants>) => (
  <LabelPrimitive.Root
    data-slot="label"
    className={cn(labelVariants(), className)}
    {...props}
  />
)
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
