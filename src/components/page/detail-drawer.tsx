'use client'

import { useRef } from 'react'
import type { ReactNode } from 'react'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'

export function DetailDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
}) {
  const returnFocus = useRef<HTMLElement | null>(null)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l bg-card outline-none motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-right-4"
          onOpenAutoFocus={() => {
            returnFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null
          }}
          onCloseAutoFocus={(event) => {
            if (returnFocus.current?.isConnected) {
              event.preventDefault()
              returnFocus.current.focus()
            }
          }}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
            <DialogTitle className="min-w-0 break-words leading-snug">{title}</DialogTitle>
            <DialogClose
              aria-label="Đóng chi tiết"
              className="grid size-10 shrink-0 place-items-center rounded-md hover:bg-muted"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogClose>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain break-words p-4">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
