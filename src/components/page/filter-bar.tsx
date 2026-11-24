'use client'

import { useEffect, useRef } from 'react'
import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/lib/utils'

export const filterBarClassName = 'flex flex-wrap items-center gap-2'
export const filterControlClassName =
  'h-10 min-w-0 max-w-full rounded-lg border border-input bg-card px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm'

export function FilterForm({
  className,
  onSubmit,
  children,
}: Pick<ComponentPropsWithoutRef<'form'>, 'className' | 'onSubmit' | 'children'>) {
  const timer = useRef<number | undefined>(undefined)
  const composing = useRef(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function schedule(form: HTMLFormElement) {
    window.clearTimeout(timer.current)
    if (!composing.current) timer.current = window.setTimeout(() => form.requestSubmit(), 300)
  }

  return (
    <form
      className={cn(filterBarClassName, className)}
      onChange={(event) => schedule(event.currentTarget)}
      onCompositionStart={() => {
        composing.current = true
        window.clearTimeout(timer.current)
      }}
      onCompositionEnd={(event) => {
        composing.current = false
        schedule(event.currentTarget)
      }}
      onSubmit={(event) => {
        event.preventDefault()
        if (composing.current) return
        window.clearTimeout(timer.current)
        onSubmit?.(event)
      }}
    >
      {children}
      <button type="submit" hidden />
    </form>
  )
}
