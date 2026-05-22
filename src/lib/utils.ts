import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a raw phone string into Indonesian +62 format.
 * e.g. "08313477495" → "+62 831-3477-495"
 *      "6283132443244" → "+62 831-3244-3244"
 */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''

  // Normalize to national number (without country code)
  let national: string
  if (digits.startsWith('62') && digits.length > 2) {
    national = digits.slice(2)
  } else if (digits === '62') {
    return '+62'
  } else if (digits.startsWith('0')) {
    national = digits.slice(1)
  } else {
    national = digits
  }

  if (!national) return ''

  // Cap at 12 national digits (max Indonesian mobile)
  national = national.slice(0, 12)

  // Build: +62 XXX-XXXX-remainder
  let result = '+62 ' + national.slice(0, 3)
  if (national.length > 3) result += '-' + national.slice(3, 7)
  if (national.length > 7) result += '-' + national.slice(7)
  return result
}

/**
 * Strips a formatted phone to digits only for API submission/WA links.
 * e.g. "+62 831-3477-495" → "628313477495"
 */
export function rawPhoneDigits(formatted: string): string {
  return formatted.replace(/\D/g, '')
}
