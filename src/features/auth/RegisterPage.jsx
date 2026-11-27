import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ShoppingBag, Store } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { errorMessage } from '../../lib/format'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Alert, Button, Checkbox, ChoiceGroup, Input } from '../../components/ui'
import { PasswordInput, passwordScore } from './PasswordInput'

const strengthLabel = ['Too short', 'Weak', 'Okay', 'Good', 'Strong']
const strengthColor = ['var(--danger)', 'var(--danger)', 'var(--warning)', 'var(--brand-500)', 'var(--success)']
const EMAIL = /^\S+@\S+\.\S+$/

/**
 * One registration page for everyone.
 *  - Seller: always a company → full name, company name, company email, password.
 *  - Buyer:  company or private person → company name is optional;
 *            with a company name the email is the company email, otherwise a private email.
 * The account is verified with the emailed code on the login page.
 */
export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ type: 'seller', fullName: '', companyName: '', email: '', password: '', terms: false })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const score = passwordScore(form.password)
  const isSeller = form.type === 'seller'
  const hasCompany = isSeller || form.companyName.trim() !== ''

  function validate() {
    const e = {}
    if (form.fullName.trim().length < 2) e.fullName = 'Please enter your full name.'
    const company = form.companyName.trim()
    if (isSeller && company.length < 2) e.companyName = 'Sellers must be a registered company.'
    else if (company && company.length < 2) e.companyName = 'Enter the full company name.'
    if (!EMAIL.test(form.email.trim())) e.email = hasCompany ? 'Enter your company email address.' : 'Enter a valid email address.'
    if (form.password.length < 8) e.password = 'Use at least 8 characters.'
    if (!form.terms) e.terms = 'Please accept the terms to continue.'
    setErrors(e)
    return !Object.keys(e).length
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setBusy(true); setError(null)
    const email = form.email.trim()
    const { data, error } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName.trim(),
          account_type: form.type,
          company_name: form.companyName.trim() || null,
        },
        emailRedirectTo: `${window.location.origin}${window.location.pathname}#/login`,
      },
    })
    setBusy(false)
    if (error) return setError(errorMessage(error))
    // Supabase returns a user without identities when the email is already registered
    if (data.user && data.user.identities?.length === 0) return setError('An account with this email already exists. Try logging in.')
    if (!data.session) navigate('/login', { state: { verifyEmail: email, accountType: form.type } })
    // with a session (email confirmation off) RedirectIfAuthed takes over
  }

  return (
    <AuthLayout wide>
      <header>
        <h1>Create your account</h1>
        <p>Companies sell their used devices. Companies, startups and private buyers buy them for less.</p>
      </header>
      {error && <Alert tone="danger">{error}</Alert>}
      <form className="stack" onSubmit={onSubmit} noValidate>
        <ChoiceGroup
          label="I am registering as" value={form.type} columns="200px"
          onChange={(type) => { setForm((f) => ({ ...f, type })); setErrors({}) }}
          options={[
            { value: 'seller', icon: Store, label: 'Seller', desc: 'A company selling used laptops, monitors and other devices.' },
            { value: 'buyer', icon: ShoppingBag, label: 'Buyer', desc: 'A company or private person looking for good used devices.' },
          ]}
        />

        <Input label="Full name" autoComplete="name" required value={form.fullName} onChange={set('fullName')} error={errors.fullName} placeholder="Nimal Perera" />
        <Input
          label="Company name" autoComplete="organization" required={isSeller}
          value={form.companyName} onChange={set('companyName')} error={errors.companyName}
          placeholder="Lanka Tech Solutions (Pvt) Ltd"
          hint={isSeller ? undefined : 'Leave empty if you are buying as a private person.'}
        />
        <Input
          label={hasCompany ? 'Company email' : 'Email'} type="email" autoComplete="email" required
          value={form.email} onChange={set('email')} error={errors.email}
          placeholder={hasCompany ? 'you@company.lk' : 'you@gmail.com'}
        />
        <div className="stack-sm">
          <PasswordInput label="Password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
          {form.password && (
            <div className="row" style={{ gap: 8 }}>
              <div className="progress" style={{ flex: 1 }}>
                <span style={{ width: `${(score / 4) * 100}%`, background: strengthColor[score] }} />
              </div>
              <span className="xs" style={{ color: strengthColor[score], fontWeight: 600, minWidth: 64 }}>{strengthLabel[score]}</span>
            </div>
          )}
        </div>
        <div className="stack-sm">
          <Checkbox
            checked={form.terms} onChange={set('terms')}
            label="I agree to the Terms and Privacy Policy"
            description={hasCompany ? 'I am registering on behalf of this company.' : undefined}
          />
          {errors.terms && <span className="field-error">{errors.terms}</span>}
        </div>
        <Button type="submit" variant="primary" size="lg" block loading={busy} iconRight={ArrowRight}>
          {isSeller ? 'Create seller account' : 'Create buyer account'}
        </Button>
      </form>
      <p className="auth-footer">Already have an account? <Link to="/login">Log in</Link></p>
    </AuthLayout>
  )
}
