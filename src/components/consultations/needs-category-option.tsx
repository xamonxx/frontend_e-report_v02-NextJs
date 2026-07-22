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
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[color-mix(in_srgb,var(--primary-theme)_45%,transparent)] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card',
        checked
          ? 'border-[color-mix(in_srgb,var(--primary-theme)_58%,var(--border))] bg-[color-mix(in_srgb,var(--primary-theme)_9%,var(--card))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary-theme)_10%,transparent)]'
          : 'border-[color-mix(in_srgb,var(--primary-theme)_16%,var(--border))] bg-background/35 hover:border-[color-mix(in_srgb,var(--primary-theme)_34%,var(--border))] hover:bg-muted/55 dark:hover:bg-zinc-800/45',
      )}
    >
      <input id={inputId} type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-[6px] border transition-[border-color,background-color,box-shadow] duration-200',
          checked
            ? 'border-[var(--primary-theme)] bg-[var(--primary-theme)] text-[color:var(--primary-theme-foreground)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary-theme)_12%,transparent)]'
            : 'border-foreground/25 bg-background text-transparent group-hover:border-[color-mix(in_srgb,var(--primary-theme)_45%,var(--border))] dark:bg-zinc-900',
        )}
      >
        <Check className="size-3.5" strokeWidth={3.25} />
      </span>
      <span className={cn('min-w-0 text-[11px] font-semibold leading-[1.25] sm:text-xs', checked ? 'text-[var(--primary-theme)]' : 'text-foreground/80')}>
        {label}
      </span>
    </label>
  )
}
