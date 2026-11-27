import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { errorMessage } from '../../lib/format'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Alert, Button, Input } from '../../components/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ busy: false, sent: false, error: null })

  async function onSubmit(e) {
    e.preventDefault()
    setState({ busy: true, sent: false, error: null })
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${window.location.pathname}#/seller/company`,
    })
    setState({ busy: false, sent: !error, error: error && errorMessage(error) })
  }

  return (
    <AuthLayout>
      <header>
        <h1>Reset your password</h1>
        <p>We will email you a link to set a new one.</p>
      </header>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.sent ? (
        <Alert tone="success" title="Email sent">If an account exists for {email}, a reset link is on its way.</Alert>
      ) : (
        <form className="stack" onSubmit={onSubmit}>
          <Input label="Work email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" variant="primary" size="lg" block loading={state.busy} disabled={!email}>Send reset link</Button>
        </form>
      )}
      <p className="auth-footer"><Link to="/login">Back to log in</Link></p>
    </AuthLayout>
  )
}
