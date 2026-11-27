import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Camera, KeyRound, LogOut, Repeat, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { errorMessage } from '../../lib/format'
import { publicUrl, removeFiles, uploadFile } from '../../lib/storage'
import { BUCKETS } from '../../lib/constants'
import { useAuth } from '../../context/AuthContext'
import { Alert, Button, Card, Input, VerifiedBadge, useToast } from '../../components/ui'
import { PasswordInput } from '../auth/PasswordInput'
import { CompanyFields, companyPayload, companyToForm, validateCompany } from './CompanyFields'
import { PageHeader } from './PageHeader'

/** Company profile + the signed-in person's account (name, password). Only companies sell, so one page. */
export default function CompanyProfilePage() {
  const { company, refresh } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState(() => companyToForm(company))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const fileRef = useRef(null)
  const canEdit = company?.role === 'owner' || company?.role === 'admin'

  useEffect(() => { if (company) setForm(companyToForm(company)) }, [company])

  async function onSave(e) {
    e.preventDefault()
    const errs = validateCompany(form)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    const { error } = await supabase.from('companies').update(companyPayload(form)).eq('id', company.id)
    setBusy(false)
    if (error) return toast(errorMessage(error), 'error')
    await refresh()
    toast('Company profile saved')
  }

  async function onLogo(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return toast('Logo must be smaller than 2 MB', 'error')
    setLogoBusy(true)
    try {
      const path = await uploadFile(BUCKETS.companyLogos, company.id, file)
      const { error } = await supabase.from('companies').update({ logo_path: path }).eq('id', company.id)
      if (error) throw error
      await removeFiles(BUCKETS.companyLogos, [company.logo_path])
      await refresh()
      toast('Logo updated')
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setLogoBusy(false)
    }
  }

  if (!company) return null
  const logo = publicUrl(BUCKETS.companyLogos, company.logo_path)

  return (
    <>
      <PageHeader title="Company profile" description="Your company as buyers see it, and your own login details." />
      {!canEdit && <div style={{ marginBottom: 16 }}><Alert tone="info">Only company owners and admins can edit the company profile.</Alert></div>}

      <div className="stack-lg">
        <form className="stack-lg" onSubmit={onSave} noValidate>
          <Card>
            <div className="row" style={{ gap: 20 }}>
              <div style={{ position: 'relative' }}>
                <div className="listing-thumb" style={{ width: 88, height: 88, borderRadius: 20 }}>
                  {logo ? <img src={logo} alt={`${company.name} logo`} /> : <Building2 size={32} />}
                </div>
                {canEdit && (
                  <button type="button" className="btn btn-secondary btn-icon btn-sm" style={{ position: 'absolute', right: -6, bottom: -6 }}
                    onClick={() => fileRef.current?.click()} aria-label="Upload logo" disabled={logoBusy}>
                    {logoBusy ? <span className="spinner" /> : <Camera />}
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onLogo} />
              </div>
              <div className="stack-sm" style={{ gap: 6 }}>
                <h2>{company.name}</h2>
                <div className="row" style={{ gap: 8 }}>
                  <VerifiedBadge status={company.verification_status} />
                  {company.city && <span className="muted small">{[company.city, company.region].filter(Boolean).join(', ')}</span>}
                </div>
              </div>
            </div>
          </Card>

          <fieldset disabled={!canEdit} className="stack-lg" style={{ border: 0, padding: 0, margin: 0 }}>
            <Card title="Company details"><CompanyFields value={form} onChange={setForm} errors={errors} section="basics" /></Card>
            <Card title="Contact"><CompanyFields value={form} onChange={setForm} errors={errors} section="contact" /></Card>
            <Card title="Address" description="Buyers see your city. The full address is only shared for pickups.">
              <CompanyFields value={form} onChange={setForm} errors={errors} section="address" />
            </Card>
          </fieldset>

          {canEdit && (
            <div className="action-bar">
              <span className="small muted">Changes are visible to buyers right away.</span>
              <Button type="submit" variant="primary" icon={Save} loading={busy}>Save company</Button>
            </div>
          )}
        </form>

        <AccountSection />
      </div>
    </>
  )
}

function AccountSection() {
  const { user, profile, refresh, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', job_title: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [pw, setPw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name ?? '', job_title: profile.job_title ?? '', phone: profile.phone ?? '' })
  }, [profile])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function onSave(e) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name.trim() || null, job_title: form.job_title.trim() || null, phone: form.phone.trim() || null,
    }).eq('id', user.id)
    setBusy(false)
    if (error) return toast(errorMessage(error), 'error')
    await refresh(); toast('Your details were saved')
  }

  async function onPassword(e) {
    e.preventDefault()
    if (pw.length < 8) return toast('Use at least 8 characters', 'error')
    setPwBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwBusy(false)
    if (error) return toast(errorMessage(error), 'error')
    setPw(''); toast('Password changed')
  }

  return (
    <>
      <Card title="Your login" description={`You log in with ${user?.email}. Buyers see your name when you message them.`}>
        <form className="stack" onSubmit={onSave}>
          <div className="grid-3">
            <Input label="Your full name" value={form.full_name} onChange={set('full_name')} />
            <Input label="Your position" placeholder="IT Manager" value={form.job_title} onChange={set('job_title')} />
            <Input label="Your phone" type="tel" placeholder="+94 77 123 4567" value={form.phone} onChange={set('phone')} />
          </div>
          <div><Button type="submit" icon={Save} loading={busy}>Save my details</Button></div>
        </form>
      </Card>

      <Card title="Change password">
        <form className="row" style={{ alignItems: 'flex-end' }} onSubmit={onPassword}>
          <div style={{ flex: '1 1 260px' }}><PasswordInput label="New password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <Button type="submit" icon={KeyRound} loading={pwBusy}>Update password</Button>
        </form>
      </Card>

      <Card title="Buying" description="Sellers can also buy. Switch to the buyer side to browse devices from other companies.">
        <div className="row">
          <Button icon={Repeat} onClick={() => navigate('/buyer')}>Switch to buying</Button>
          <Button variant="danger" icon={LogOut} onClick={signOut}>Log out</Button>
        </div>
      </Card>
    </>
  )
}
