// All prices are Sri Lankan rupees (LKR). The database stores cents (1/100 rupee).
const lkr = new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 })

/** 18500000 -> "Rs. 185,000" */
export function formatPrice(cents) {
  if (cents == null || cents === '') return '—'
  return `Rs. ${lkr.format(cents / 100)}`
}

/** "185,000" or "185000.50" -> cents */
export function toCents(value) {
  if (value === '' || value == null) return null
  const n = Number(String(value).replace(/[\s,]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

/** 18500000 -> "185000" for input fields */
export function fromCents(cents) {
  if (cents == null) return ''
  const v = cents / 100
  return Number.isInteger(v) ? String(v) : v.toFixed(2)
}

export function savingsPercent(price, original) {
  if (!price || !original || original <= price) return null
  return Math.round((1 - price / original) * 100)
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?'
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
export function timeAgo(date) {
  if (!date) return ''
  let value = (new Date(date).getTime() - Date.now()) / 1000
  const steps = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']]
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return rtf.format(Math.round(value), unit)
    value /= size
  }
  return ''
}

/** Turn a Supabase/Postgres error into a sentence a user can read. */
export function errorMessage(err) {
  if (!err) return 'Something went wrong.'
  const msg = err.message || String(err)
  if (msg.includes('listings_publish_requirements')) return 'Confirm the data wipe and ownership before publishing.'
  if (msg.includes('Invalid login credentials')) return 'Email or password is incorrect.'
  if (/rate limit|security purposes/i.test(msg)) return 'Too many emails were sent. Please wait a few minutes and try again.'
  if (msg.includes('User already registered')) return 'An account with this email already exists. Try logging in.'
  if (msg.includes('row-level security')) return 'You do not have permission to do that.'
  return msg
}
