'use client'

import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

type NeedsCategoryOptionProps = {
  checked: boolean
  inputId: string
  label: string
  onChange: () => void
}

export function NeedsCategoryOption({ checked, inputId, label, onChange }: NeedsCategoryOptionProps) {
  return (
    <label
      htmlFor={inputId}
      className={cn(
        'group relative flex min-h-12 cursor-pointer select-none items-center gap-2.5 rounded-xl border px-3 py-2 transition-[border-color,background-color,box-shadow,transform] duration-200 active:scale-[0.99] sm:min-h-11 sm:px-2.5',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber-500/45 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card',
        checked
          ? 'border-amber-500/55 bg-amber-500/[0.09] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary-theme)_12%,transparent)]'
          : 'border-border/75 bg-background/35 hover:border-amber-500/25 hover:bg-muted/55 dark:hover:bg-zinc-800/45',
      )}
    >
      <input id={inputId} type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-[6px] border transition-[border-color,background-color,box-shadow] duration-200',
          checked
            ? 'border-amber-500 bg-amber-500 text-zinc-950 shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary-theme)_12%,transparent)]'
            : 'border-foreground/25 bg-background text-transparent group-hover:border-amber-500/45 dark:bg-zinc-900',
        )}
      >
        <Check className="size-3.5" strokeWidth={3.25} />
      </span>
      <span className={cn('min-w-0 text-[11px] font-semibold leading-[1.25] sm:text-xs', checked ? 'text-amber-600 dark:text-amber-400' : 'text-foreground/80')}>
        {label}
      </span>
    </label>
  )
}
