import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { errorMessage } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Alert, Button, Input } from '../../components/ui'

/**
 * Fallback for seller accounts without a company (normally the company is created
 * at registration). Only name + email; the rest is asked during verification.
 */
export default function CompanySetupPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: auth.user?.user_metadata?.company_name ?? '', email: auth.user?.email ?? '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (auth.accountType !== 'seller') return <Navigate to="/buyer" replace />
  if (auth.companies.length && !busy) return <Navigate to="/seller" replace />

  async function onSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (form.name.trim().length < 2) errs.name = 'Company name is required.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Enter your company email.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true); setError(null)
    try {
      const { data: created, error: err } = await supabase
        .from('companies')
        .insert({ name: form.name.trim(), contact_email: form.email.trim(), is_seller: true, country_code: 'LK', created_by: auth.user.id })
        .select().single()
      if (err) throw err
      auth.selectCompany(created.id)
      await auth.refresh()
      navigate('/seller', { replace: true })
    } catch (err) {
      setError(errorMessage(err)); setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <header>
        <h1>Add your company</h1>
        <p>Only companies can sell on SecondShift. You add the address and registration details when you verify.</p>
      </header>
      {error && <Alert tone="danger">{error}</Alert>}
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Input label="Company name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="Lanka Tech Solutions (Pvt) Ltd" />
        <Input label="Company email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} placeholder="info@company.lk" />
        <Button type="submit" variant="primary" size="lg" block loading={busy} iconRight={ArrowRight}>Go to my dashboard</Button>
      </form>
    </AuthLayout>
  )
}
