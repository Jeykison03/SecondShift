import { useId } from 'react'

/** Label + hint + error wrapper. Children receive the generated id via render prop or `id` prop. */
export function Field({ label, hint, error, required, children, className = '', id: idProp }) {
  const auto = useId()
  const id = idProp || auto
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}{required && <span className="req" aria-hidden>*</span>}
        </label>
      )}
      {typeof children === 'function' ? children({ id, invalid: !!error }) : children}
      {error ? <span className="field-error" role="alert">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

export function Input({ label, hint, error, required, suffix, prefix, className = '', ...props }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {({ id, invalid }) => {
        const input = (
          <input id={id} className={`input ${prefix ? 'has-prefix' : ''}`} aria-invalid={invalid || undefined} required={required} {...props} />
        )
        if (!suffix && !prefix) return input
        return (
          <div className="input-group">
            {prefix && <span className="input-prefix">{prefix}</span>}
            {input}
            {suffix && <span className="input-affix">{suffix}</span>}
          </div>
        )
      }}
    </Field>
  )
}

export function Textarea({ label, hint, error, required, className = '', maxLength, value, ...props }) {
  const counter = maxLength && typeof value === 'string' ? `${value.length}/${maxLength}` : null
  return (
    <Field label={label} hint={error ? hint : (hint || counter) && [hint, counter].filter(Boolean).join(' · ')} error={error} required={required} className={className}>
      {({ id, invalid }) => (
        <textarea id={id} className="textarea" aria-invalid={invalid || undefined} required={required} maxLength={maxLength} value={value} {...props} />
      )}
    </Field>
  )
}

/** options: [{value,label}] or ['a','b'] */
export function Select({ label, hint, error, required, options = [], placeholder, className = '', ...props }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {({ id, invalid }) => (
        <select id={id} className="select" aria-invalid={invalid || undefined} required={required} {...props}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o
            return <option key={opt.value} value={opt.value}>{opt.label}</option>
          })}
        </select>
      )}
    </Field>
  )
}

export function Checkbox({ label, description, className = '', ...props }) {
  return (
    <label className={`check ${className}`}>
      <input type="checkbox" {...props} />
      <span>
        <strong>{label}</strong>
        {description && <span className="muted" style={{ display: 'block', marginTop: 2 }}>{description}</span>}
      </span>
    </label>
  )
}

export function Switch({ label, checked, onChange, ...props }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={!!checked} onChange={(e) => onChange?.(e.target.checked)} {...props} />
      <span className="switch-track" aria-hidden />
      {label}
    </label>
  )
}

/** Radio group rendered as selectable cards. */
export function ChoiceGroup({ value, onChange, options, label, columns, name }) {
  return (
    <div className="field" role="radiogroup" aria-label={label}>
      {label && <span className="field-label">{label}</span>}
      <div className="choice-grid" style={columns ? { gridTemplateColumns: `repeat(auto-fill, minmax(${columns}, 1fr))` } : undefined}>
        {options.map((o) => {
          const Icon = o.icon
          const selected = value === o.value
          return (
            <button
              key={o.value} type="button" role="radio" name={name} aria-checked={selected}
              className={`choice ${selected ? 'is-selected' : ''}`}
              onClick={() => onChange(o.value)}
            >
              {Icon && <span className="choice-icon"><Icon size={20} /></span>}
              {o.badge}
              <span className="choice-title">{o.label}</span>
              {o.desc && <span className="choice-desc">{o.desc}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
