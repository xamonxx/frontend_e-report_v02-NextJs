'use client'

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className,
  disabled
}: CustomSelectProps) {
  // Ensure the component is always controlled by using a string fallback
  const currentValue = value || ""
  const selectedOption = options.find(opt => opt.value === currentValue)

  return (
    <Select 
      value={currentValue} 
      onValueChange={(val) => onChange(val || "")} 
      disabled={disabled}
      items={options}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedOption ? selectedOption.label : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
