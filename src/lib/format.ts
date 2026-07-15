/** Format a number as FCFA with thousand separators */
export function formatFcfa(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '0 FCFA'
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

/** Format a percentage */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return '0%'
  return `${(value * 100).toFixed(decimals)}%`
}

/** Format a date in French locale */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/** Format a short date */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Get month name in French */
export function getMonthName(month: number): string {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]
  return months[month] || ''
}

/** Parse a date string safely */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

/** Calculate seniority in years */
export function calculateSeniorityYears(hireDate: Date, referenceDate: Date): number {
  const diffMs = referenceDate.getTime() - hireDate.getTime()
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000))
}