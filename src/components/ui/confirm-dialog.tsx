'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog'

export interface ConfirmOptions {
  title: string
  description: string
  actionLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive' | 'warning'
}

type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = React.createContext<ConfirmContextType | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null)
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null)
  const confirmedRef = React.useRef<boolean>(false)

  const confirm = React.useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    confirmedRef.current = false
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      resolveRef.current?.(confirmedRef.current)
    }
  }

  const handleConfirm = () => {
    confirmedRef.current = true
    setOpen(false)
  }

  const handleCancel = () => {
    confirmedRef.current = false
    setOpen(false)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="border border-border dark:border-zinc-800 bg-popover rounded-xl shadow-2xl p-5 max-w-sm">
          <AlertDialogHeader className="text-left sm:place-items-start sm:text-left gap-1">
            <AlertDialogTitle className="text-sm font-semibold text-foreground/90 font-sans">
              {options?.title || 'Apakah Anda yakin?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground/80 font-sans leading-relaxed mt-1">
              {options?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 flex gap-2 sm:justify-end">
            <AlertDialogCancel
              onClick={handleCancel}
              className="h-8 px-3.5 text-xs font-medium border-border hover:bg-muted text-muted-foreground hover:text-foreground dark:border-zinc-800 dark:bg-zinc-950 rounded-lg transition-colors"
            >
              {options?.cancelLabel || 'Batal'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                options?.variant === 'destructive'
                  ? 'h-8 px-3.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors'
                  : 'h-8 px-3.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg transition-colors'
              }
            >
              {options?.actionLabel || 'Konfirmasi'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = React.useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}
