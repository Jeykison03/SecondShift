import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, MailCheck, RotateCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { errorMessage } from '../../lib/format'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Alert, Button, Input } from '../../components/ui'
import { PasswordInput } from './PasswordInput'

/**
 * One login for sellers and buyers — the account type decides where they land
 * (sellers → seller dashboard, buyers → buyer side).
 * New accounts are activated here with the code from the confirmation email.
 */
export default function LoginPage() {
  const { state } = useLocation()
  const [email, setEmail] = useState(state?.verifyEmail ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [verifyFor, setVerifyFor] = useState(state?.verifyEmail ?? null)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (!error) return // RedirectIfAuthed sends the user to their side
    if (/email not confirmed/i.test(error.message)) {
      await supabase.auth.resend({ type: 'signup', email: email.trim() })
      setVerifyFor(email.trim())
      return
    }
    setError(errorMessage(error))
  }

  if (verifyFor) return <VerifyCode email={verifyFor} justRegistered={!!state?.verifyEmail} onBack={() => setVerifyFor(null)} />

  return (
    <AuthLayout>
      <header>
        <h1>Welcome back</h1>
        <p>Log in as a seller or buyer — we take you to the right place.</p>
      </header>
      {error && <Alert tone="danger">{error}</Alert>}
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.lk" />
        <PasswordInput label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div style={{ textAlign: 'right', marginTop: -8 }}>
          <Link to="/forgot-password" className="small">Forgot password?</Link>
        </div>
        <Button type="submit" variant="primary" size="lg" block loading={busy} iconRight={ArrowRight} disabled={!email || !password}>
          Log in
        </Button>
      </form>
      <p className="auth-footer">New to SecondShift? <Link to="/register">Create an account</Link></p>
    </AuthLayout>
  )
}

const RESEND_SECONDS = 60

function VerifyCode({ email, justRegistered, onBack }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  async function onVerify(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'signup' })
    setBusy(false)
    if (error) setError(/expired|invalid/i.test(error.message) ? 'This code is wrong or has expired. Request a new one.' : errorMessage(error))
    // success: the user is signed in and RedirectIfAuthed moves on
  }

  async function onResend() {
    setError(null); setInfo(null)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) return setError(errorMessage(error))
    setInfo('A new code is on its way.')
    setWait(RESEND_SECONDS)
  }

  return (
    <AuthLayout>
      <header>
        <span className="feature-icon" style={{ marginBottom: 16 }}><MailCheck size={22} /></span>
        <h1>Verify your email</h1>
        <p>
          {justRegistered ? 'Your account was created. ' : 'Your account is not activated yet. '}
          We sent a verification code to <strong>{email}</strong>. Enter it below to activate your account.
        </p>
      </header>
      {error && <Alert tone="danger">{error}</Alert>}
      {info && <Alert tone="success">{info}</Alert>}
      <form className="stack" onSubmit={onVerify} noValidate>
        <Input
          label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={10}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456" style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }}
        />
        <Button type="submit" variant="primary" size="lg" block loading={busy} disabled={code.length < 6} iconRight={ArrowRight}>
          Verify and continue
        </Button>
        <div className="row-between">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack}>Back to log in</Button>
          <Button variant="ghost" size="sm" icon={RotateCw} onClick={onResend} disabled={wait > 0}>
            {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
          </Button>
        </div>
      </form>
      <p className="xs muted">Can't find it? Check your spam folder. You can also click the link in the email.</p>
    </AuthLayout>
  )
}
