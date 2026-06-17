'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AutocompleteOption {
  label: string
  value: string
  sublabel?: string
}

interface AutocompleteProps {
  value: string
  onChange: (value: string) => void
  options: string[] | AutocompleteOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  isLoading?: boolean
  onlyChangeOnSelect?: boolean
  clearOnFocus?: boolean
}

export function Autocomplete({
  value,
  onChange,
  options,
  placeholder = 'Pilih...',
  disabled = false,
  className,
  id,
  isLoading = false,
  onlyChangeOnSelect = false,
  clearOnFocus = false,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({})

  const normalizedOptions = React.useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt }
      }
      return opt
    })
  }, [options])

  React.useEffect(() => {
    const matched = normalizedOptions.find(opt => opt.value === value)
    setSearchTerm(matched ? matched.label : (value || ''))
  }, [value, normalizedOptions])

  const filteredOptions = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return normalizedOptions.slice(0, 100)

    const filtered = []
    for (let i = 0; i < normalizedOptions.length; i++) {
      const opt = normalizedOptions[i]
      if (
        opt.label.toLowerCase().includes(term) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(term))
      ) {
        filtered.push(opt)
        if (filtered.length >= 100) break
      }
    }
    return filtered
  }, [normalizedOptions, searchTerm])

  React.useEffect(() => {
    setHighlightedIndex((prev) => {
      if (filteredOptions.length === 0) return -1
      if (prev >= filteredOptions.length) return filteredOptions.length - 1
      return prev
    })
  }, [filteredOptions])

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        if (onlyChangeOnSelect) {
          const matched = normalizedOptions.find(opt => opt.value === value)
          setSearchTerm(matched ? matched.label : '')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onlyChangeOnSelect, normalizedOptions, value])

  React.useEffect(() => {
    if (open && highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex, open])

  React.useEffect(() => {
    if (!open || !containerRef.current) return

    const update = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false)
        return
      }

      const viewportPadding = 8
      const dropdownGap = 6
      const maxDropdownHeight = 224
      const minDropdownHeight = 96
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - viewportPadding)
      const spaceAbove = Math.max(0, rect.top - viewportPadding)
      const openAbove = spaceBelow < maxDropdownHeight && spaceAbove > spaceBelow
      const availableSpace = openAbove ? spaceAbove : spaceBelow
      const maxHeight = Math.min(maxDropdownHeight, Math.max(minDropdownHeight, availableSpace - dropdownGap))
      const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2)
      const left = Math.min(
        Math.max(rect.left, viewportPadding),
        window.innerWidth - width - viewportPadding
      )
      const top = openAbove
        ? Math.max(viewportPadding, rect.top - dropdownGap - maxHeight)
        : Math.min(rect.bottom + dropdownGap, window.innerHeight - viewportPadding - maxHeight)

      setDropdownStyle({
        position: 'fixed',
        top,
        left,
        width,
        maxHeight,
        zIndex: 9999,
      })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchTerm(val)
    if (!onlyChangeOnSelect) {
      onChange(val)
    }
    setOpen(true)
  }

  const handleInputFocus = () => {
    const selectedOption = normalizedOptions.find(opt => opt.value === value)
    const isShowingSelectedLabel = selectedOption && searchTerm === selectedOption.label

    if (clearOnFocus && isShowingSelectedLabel) {
      setSearchTerm('')
      setHighlightedIndex(-1)
    }
    setOpen(true)
  }

  const handleSelectOption = (option: AutocompleteOption) => {
    setSearchTerm(option.label)
    onChange(option.value)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSearchTerm('')
    onChange('')
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => {
          if (filteredOptions.length === 0) return -1
          return prev < filteredOptions.length - 1 ? prev + 1 : 0
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => {
          if (filteredOptions.length === 0) return -1
          return prev > 0 ? prev - 1 : filteredOptions.length - 1
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[highlightedIndex])
        } else if (filteredOptions.length > 0) {
          handleSelectOption(filteredOptions[0])
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={containerRef} className="relative w-full" id={id ? `${id}-container` : undefined}>
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            "w-full h-8 rounded-lg border border-border bg-background pl-3 pr-11 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/50 disabled:opacity-40 transition-all font-sans dark:border-zinc-800 dark:bg-zinc-950",
            className
          )}
        />
        <div className="absolute right-2.5 flex items-center gap-1 text-muted-foreground/50">
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              {searchTerm && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="hover:text-foreground p-0.5 rounded-full hover:bg-muted transition-colors dark:hover:bg-zinc-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <ChevronDown className="h-3.5 w-3.5 pointer-events-none" />
            </>
          )}
        </div>
      </div>

      {open && !disabled && typeof document !== 'undefined' && createPortal(
        <ul
          ref={listRef}
          style={dropdownStyle}
          className="overflow-y-auto rounded-lg border border-border bg-popover shadow-xl py-1 focus:outline-none scrollbar-thin dark:border-zinc-800 dark:bg-zinc-950"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-muted-foreground italic font-sans">
              Tidak ada hasil ditemukan
            </li>
          ) : (
            filteredOptions.map((option, idx) => {
              const isSelected = value === option.value
              const isHighlighted = idx === highlightedIndex

              return (
                <li
                  key={`${option.value}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelectOption(option)
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={cn(
                    "px-3 py-2 text-xs cursor-pointer flex flex-col min-w-0 font-sans transition-colors",
                    isHighlighted && "bg-amber-500/10 text-amber-500",
                    isSelected && !isHighlighted && "text-amber-500 font-medium bg-muted/50 dark:bg-zinc-900/40",
                    !isSelected && !isHighlighted && "text-foreground/80 hover:bg-muted dark:text-zinc-300 dark:hover:bg-zinc-900"
                  )}
                >
                  <span className="font-medium truncate">{option.label}</span>
                  {option.sublabel && (
                    <span className="text-[10px] text-muted-foreground/60 mt-0.5">{option.sublabel}</span>
                  )}
                </li>
              )
            })
          )}
        </ul>,
        document.body
      )}
    </div>
  )
}
