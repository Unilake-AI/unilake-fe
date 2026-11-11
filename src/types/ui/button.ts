import type * as React from 'react'

import type { buttonVariants } from '@/components/ui/button'

import type { VariantProps } from 'class-variance-authority'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}
