'use client'

import type { ComponentProps } from 'react'
import { Keyboard, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type SearchFieldProps = Omit<ComponentProps<typeof Input>, 'onChange' | 'type' | 'value' | 'size'> & {
  containerClassName?: string
  onValueChange: (value: string) => void
  pageSearch?: boolean
  showShortcut?: boolean
  size?: 'compact' | 'default' | 'large'
  value: string
}

const sizeClasses = {
  compact: 'h-8 rounded-lg pl-8 text-[11px]',
  default: 'h-10 rounded-xl pl-9 text-xs',
  large: 'h-11 rounded-xl pl-10 text-sm',
}

export function SearchField({
  className,
  containerClassName,
  onValueChange,
  pageSearch = false,
  placeholder = 'Cari...',
  showShortcut = false,
  size = 'default',
  value,
  ...props
}: SearchFieldProps) {
  const hasTrailingAction = Boolean(value) || showShortcut

  return (
    <div className={cn('group relative w-full', containerClassName)}>
      <Search
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground/55 transition-colors duration-200 group-focus-within:text-amber-500',
          size === 'compact' && 'left-2.5 size-3.5',
          size === 'large' && 'left-3.5',
        )}
      />
      <Input
        {...props}
        type="text"
        data-page-search={pageSearch ? 'true' : undefined}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full truncate border-[color:color-mix(in_srgb,var(--primary-theme)_18%,var(--border))] bg-background/65 text-foreground shadow-inner shadow-black/[0.025] outline-none placeholder:text-muted-foreground/55',
          'transition-[border-color,background-color,box-shadow] duration-200 hover:border-[color:color-mix(in_srgb,var(--primary-theme)_38%,var(--border))] focus-visible:border-[color:color-mix(in_srgb,var(--primary-theme)_60%,var(--border))] focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--primary-theme)_18%,transparent)]',
          'dark:bg-slate-950/45 dark:focus-visible:bg-slate-950/70',
          sizeClasses[size],
          hasTrailingAction && (showShortcut ? 'pr-[88px] sm:pr-[96px]' : 'pr-10'),
          className,
        )}
      />

      {value ? (
        <button
          type="button"
          onClick={() => onValueChange('')}
          aria-label="Bersihkan pencarian"
          title="Bersihkan pencarian"
          className={cn(
            'absolute right-1.5 top-1/2 grid -translate-y-1/2 place-items-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 active:bg-muted',
            size === 'compact' ? 'size-7' : 'size-8',
          )}
        >
          <X className="size-3.5" />
        </button>
      ) : showShortcut ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md border border-border/70 bg-muted/55 px-1.5 py-1 font-mono text-[9px] font-semibold leading-none text-muted-foreground/60 transition-colors group-focus-within:border-amber-500/25 group-focus-within:text-amber-500/80 dark:border-slate-400/15 dark:bg-slate-800/60"
        >
          <Keyboard className="size-3" />
          <span className="hidden sm:inline">Ctrl K</span>
        </span>
      ) : null}
    </div>
  )
}
