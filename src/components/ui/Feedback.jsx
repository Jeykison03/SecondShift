import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, ShieldCheck, X } from 'lucide-react'
import { CONDITION_GRADES, LISTING_STATUS, VERIFICATION_STATUS } from '../../lib/constants'

/* ---------- Card ---------- */
export function Card({ title, description, action, footer, children, className = '', bodyClassName = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {(title || action) && (
        <div className="card-header">
          <div>
            {title && <h3>{title}</h3>}
            {description && <p className="muted small">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children && <div className={`card-body ${bodyClassName}`}>{children}</div>}
      {footer && <div className="card-footer">{footer}</div>}
    </section>
  )
}

/* ---------- Badges ---------- */
const toneClass = { neutral: '', success: 'badge-success', warning: 'badge-warning', danger: 'badge-danger', info: 'badge-info', brand: 'badge-brand' }

export function Badge({ tone = 'neutral', icon: Icon, children, className = '' }) {
  return <span className={`badge ${toneClass[tone] ?? ''} ${className}`}>{Icon && <Icon aria-hidden />}{children}</span>
}

export function GradeBadge({ grade }) {
  const g = CONDITION_GRADES.find((x) => x.value === grade)
  if (!g) return null
  return <span className={`badge grade-${grade}`}>{g.short} · {g.label}</span>
}

export function StatusBadge({ status }) {
  const s = LISTING_STATUS[status] ?? { label: status, tone: 'neutral' }
  return <Badge tone={s.tone}>{s.label}</Badge>
}

export function VerifiedBadge({ status, showUnverified = true }) {
  const s = VERIFICATION_STATUS[status] ?? VERIFICATION_STATUS.unverified
  if (status !== 'verified' && !showUnverified) return null
  return <Badge tone={s.tone} icon={status === 'verified' ? ShieldCheck : undefined}>{s.label}</Badge>
}

/* ---------- Alert ---------- */
const alertIcon = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: AlertCircle }
export function Alert({ tone = 'info', title, children, action }) {
  const Icon = alertIcon[tone]
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon aria-hidden />
      <div style={{ flex: 1 }}>
        {title && <div className="alert-title">{title}</div>}
        {children}
      </div>
      {action}
    </div>
  )
}

/* ---------- Spinner / Empty ---------- */
export function Spinner({ label = 'Loading…', center }) {
  const el = <span className="spinner spinner-lg" role="status" aria-label={label} />
  return center ? <div style={{ display: 'grid', placeItems: 'center', padding: 64 }}>{el}</div> : el
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty fade-in">
      {Icon && <div className="empty-icon"><Icon aria-hidden /></div>}
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  )
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="card-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="card-body">{children}</div>
        {footer && <div className="card-footer">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, tone = 'success') => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.tone === 'error' ? <AlertCircle /> : <CheckCircle2 />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
