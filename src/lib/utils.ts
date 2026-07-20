import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { AsYouType, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Normalizes only manually typed region values; selected master-data labels stay untouched. */
export function normalizeRegionName(input: string): string {
  const cleaned = input.trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''

  return cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export const PENDING_CONFIRMATION_LABEL = 'Belum ada konfirmasi'

export function isPendingConfirmation(value?: string | null): boolean {
  if (!value) return false
  return value.trim().replace(/\s+/g, ' ').toLowerCase() === PENDING_CONFIRMATION_LABEL.toLowerCase()
}

/** Displays an API placeholder as an empty region field in create/edit forms. */
export function regionFieldValue(value?: string | null): string {
  return !value || isPendingConfirmation(value) ? '' : value
}

/** Default country assumed when the user types a number without a "+" prefix. */
const DEFAULT_COUNTRY: CountryCode = "ID"

/**
 * Formats a phone string as the user types, using Google's libphonenumber rules
 * (via libphonenumber-js) so it works for ANY country — not just Indonesia.
 *
 * - If the input starts with "+", the country is auto-detected from the dial
 *   code (e.g. "+1 213-373-..." for US, "+62 831-..." for Indonesia).
 * - Otherwise the number is assumed to be Indonesian (DEFAULT_COUNTRY), so a
 *   local "08xx" still formats nicely.
 *
 * e.g. "08313477495"    → "0831 3477 495"
 *      "+6283134774955" → "+62 831 3477 4955"
 *      "+12133734253"   → "+1 213 373 4253"
 */
export function formatPhoneInput(raw: string): string {
  if (!raw) return ''
  const hasPlus = raw.replace(/^\s+/, '').startsWith('+')
  // E.164 allows at most 15 digits — cap to stop runaway/garbage input.
  const digits = raw.replace(/\D/g, '').slice(0, 15)
  if (!digits) return hasPlus ? '+' : ''
  const formatter = hasPlus ? new AsYouType() : new AsYouType(DEFAULT_COUNTRY)
  return formatter.input((hasPlus ? '+' : '') + digits)
}

/**
 * Normalizes a phone string to E.164 digits (no "+") for API submission and
 * WhatsApp wa.me links. Falls back to a plain digit strip if parsing fails.
 * e.g. "+62 831-3477-495" → "62831347749"
 *      "08313477495"      → "62813477495"
 */
export function rawPhoneDigits(formatted: string): string {
  if (!formatted) return ''
  const parsed = parsePhoneNumberFromString(formatted, DEFAULT_COUNTRY)
  if (parsed) return parsed.number.replace('+', '') // E.164 without the leading "+"
  return formatted.replace(/\D/g, '')
}

/**
 * Returns true if the string is a valid phone number (any country). Useful for
 * form validation. A bare local number is validated against DEFAULT_COUNTRY.
 */
export function isPhoneValid(value: string): boolean {
  if (!value) return false
  const parsed = parsePhoneNumberFromString(value, DEFAULT_COUNTRY)
  return parsed?.isValid() ?? false
}

/** Converts Laravel validation responses into one concise toast message. */
export function formatApiError(error: unknown, fallback = 'Terjadi kesalahan.'): string {
  if (!error || typeof error !== 'object') return fallback

  const apiError = error as { message?: string; errors?: Record<string, string[] | string> }
  const details = Object.values(apiError.errors ?? {})
    .flatMap((messages) => Array.isArray(messages) ? messages : [messages])
    .filter(Boolean)

  return details.length > 0 ? details.join('\n') : apiError.message || fallback
}
