/**
 * formatScan — shared label helpers for past scans.
 *
 * Produces strings like "Scan from Wednesday April 29" with an optional
 * place-name suffix when geotag info is available.
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatScanDate(input) {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  return `${DAY_NAMES[d.getDay()]} ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
}

export function formatScanLabel(scan) {
  if (!scan) return ''
  const date = formatScanDate(scan.created_at)
  const place = (scan.location_label || '').trim()
  const datePart = date ? `Scan from ${date}` : 'Scan'
  return place ? `${datePart} · ${place}` : datePart
}
