import type { Survey } from '@/types'

export const SURVEY_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const value = `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 === 0 ? '00' : '30'}`
  return { value, label: `${value} WIB` }
})

export function combineLocalDateTime(date: string, time: string): string {
  return date && time ? `${date}T${time}` : ''
}

export function formatDateLabel(value: string): string {
  if (!value) return 'Pilih tanggal'
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function scheduledTimeLabel(value?: string | null): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    const match = value.match(/(?:T|\s)(\d{2}:\d{2})/)
    return match?.[1] ?? ''
  }
  return parsed.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace('.', ':')
}

export function requestedScheduleParts(survey: Survey): { date: string; time: string } | null {
  if (!survey.requested_date) return null
  const time = (survey.requested_time || '').slice(0, 5)
  const date = survey.requested_date.includes('T')
    ? survey.requested_date.slice(0, 10)
    : survey.requested_date

  return { date, time }
}

export function toLocalInput(value: string): string {
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
