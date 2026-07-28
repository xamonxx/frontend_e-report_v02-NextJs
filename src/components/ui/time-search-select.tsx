'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type TimeSearchOption = {
  value: string
  label: string
}

type TimeSearchSelectProps = {
  value: string
  onChange: (value: string) => void
  options: TimeSearchOption[]
  placeholder?: string
  searchPlaceholder?: string
  className?: string
}

export function TimeSearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih jam',
  searchPlaceholder = 'Cari jam...',
  className,
}: TimeSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find((option) => option.value === value)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options
    return options.filter((option) => {
      const haystack = `${option.label} ${option.value}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [normalizedQuery, options])

  const choose = (nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-950/65 px-3 text-left text-xs font-semibold text-foreground/90 outline-none transition-colors hover:border-cyan-500/35 hover:bg-slate-950/80 focus-visible:ring-2 focus-visible:ring-cyan-500/25',
          className
        )}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn('size-4 text-cyan-400/80 transition-transform', open && 'rotate-180')} />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionAvoidance={{ side: 'shift', align: 'shift', fallbackAxisSide: 'none' }}
        className="flex max-h-[min(13.5rem,var(--available-height))] w-52 flex-col gap-1.5 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950 p-2 text-foreground shadow-[0_22px_60px_-34px_rgba(0,188,212,0.55)]"
      >
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-cyan-400/70" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && filteredOptions[0]) {
                event.preventDefault()
                choose(filteredOptions[0].value)
              }
            }}
            placeholder={searchPlaceholder}
            className="h-8 rounded-lg border-slate-700/80 bg-slate-900/80 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-cyan-500/25"
            autoFocus
          />
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const active = option.value === value
              return (
                <button
                  key={option.value || 'empty-time'}
                  type="button"
                  onClick={() => choose(option.value)}
                  className={cn(
                    'flex h-8 w-full items-center justify-between rounded-lg px-3 text-left text-xs font-semibold text-foreground transition-colors hover:bg-cyan-500/10 hover:text-cyan-200',
                    active && 'bg-cyan-500/12 text-cyan-300'
                  )}
                >
                  <span>{option.label}</span>
                  {active && <Check className="size-3.5 text-cyan-400" />}
                </button>
              )
            })
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-4 text-center text-xs text-muted-foreground">
              Jam tidak ditemukan
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
