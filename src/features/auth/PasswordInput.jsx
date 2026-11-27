import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Field } from '../../components/ui'

export function PasswordInput({ label = 'Password', hint, error, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} hint={hint} error={error} required>
      {({ id, invalid }) => (
        <div className="input-group">
          <input id={id} className="input" type={show ? 'text' : 'password'} aria-invalid={invalid || undefined} required {...props} />
          <button
            type="button" className="btn btn-ghost btn-icon btn-sm" style={{ position: 'absolute', right: 6 }}
            onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff /> : <Eye />}
          </button>
        </div>
      )}
    </Field>
  )
}

/** 0–4 rough strength score for the hint bar. */
export function passwordScore(pw) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++
  return s
}
