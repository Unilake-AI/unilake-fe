import type * as React from 'react'

import type { badgeVariants } from '@/components/ui/badge'

import type { VariantProps } from 'class-variance-authority'

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
