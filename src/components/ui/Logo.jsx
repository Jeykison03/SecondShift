import { Link } from 'react-router-dom'

export function LogoMark({ className = 'logo-mark' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#0f6b4f" />
      <path d="M10 20.5c1.2 1.6 3.3 2.5 5.8 2.5 3.4 0 5.7-1.7 5.7-4.3 0-2.3-1.6-3.4-4.6-4l-2-.4c-1.5-.3-2.1-.8-2.1-1.6 0-1 1-1.7 2.6-1.7 1.6 0 2.8.7 3.4 1.8"
        fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="22.5" cy="9.5" r="2.5" fill="#b7f171" />
    </svg>
  )
}

export function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className={`logo ${light ? 'logo-light' : ''}`} aria-label="SecondShift home">
      <LogoMark />
      <span>SecondShift</span>
    </Link>
  )
}
