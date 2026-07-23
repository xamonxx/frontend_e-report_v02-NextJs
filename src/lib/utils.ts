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

/** Placeholder wilayah (provinsi/kota/kecamatan) yang belum diisi. */
export const PENDING_CONFIRMATION_LABEL = 'Belum konfirmasi'

/** Ejaan lama, masih ada pada data yang belum di-backfill. */
export const PENDING_CONFIRMATION_LEGACY_LABEL = 'Belum ada konfirmasi'

/** Kategori kebutuhan default ketika tidak ada yang dipilih. */
export const PENDING_NEEDS_CATEGORY_LABEL = 'Tidak konfirmasi'

export function isPendingConfirmation(value?: string | null): boolean {
  if (!value) return false
  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase()

  return [PENDING_CONFIRMATION_LABEL, PENDING_CONFIRMATION_LEGACY_LABEL].some(
    (label) => normalized === label.toLowerCase(),
  )
}

/**
 * Daftar nama kategori kebutuhan sebuah lead.
 *
 * Satu lead bisa punya banyak kategori (tabel pivot), tapi API juga masih
 * mengirim FK tunggal `needs_category` untuk data lama. Urutan sumber:
 * relasi jamak -> FK tunggal -> kosong.
 */
export function productCategoryNames(lead: {
  needs_categories?: { id: number; name: string }[] | null
  needs_category?: { id: number; name: string } | null
}): string[] {
  const many = lead.needs_categories
  if (many && many.length > 0) {
    return many.map((item) => item.name).filter(Boolean)
  }

  return lead.needs_category?.name ? [lead.needs_category.name] : []
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
export function formatPhoneInput(raw: string, previous?: string): string {
  if (!raw) return ''
  const hasPlus = raw.replace(/^\s+/, '').startsWith('+')
  // E.164 allows at most 15 digits — cap to stop runaway/garbage input.
  let digits = raw.replace(/\D/g, '').slice(0, 15)

  // Backspace trap: AsYouType adds grouping characters — "(0323)" for a partial
  // Indonesian area code, spaces and dashes elsewhere. Deleting one of those
  // leaves the digits unchanged, so re-formatting puts it straight back and the
  // caret never advances; the field becomes impossible to clear. When the value
  // got shorter but the digits did not, the user deleted a separator, so drop
  // the last digit instead — that is what they meant.
  if (previous !== undefined && raw.length < previous.length) {
    const previousHasPlus = previous.replace(/^\s+/, '').startsWith('+')
    const deletedThePlus = previousHasPlus && !hasPlus
    if (!deletedThePlus && digits === previous.replace(/\D/g, '')) {
      digits = digits.slice(0, -1)
    }
  }

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
