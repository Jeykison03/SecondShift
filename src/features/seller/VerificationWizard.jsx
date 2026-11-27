import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, FileText, ShieldCheck, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { errorMessage } from '../../lib/format'
import { uploadFile } from '../../lib/storage'
import { BUCKETS, VERIFICATION_DOC_TYPES } from '../../lib/constants'
import { useAuth } from '../../context/AuthContext'
import { Alert, Button, Checkbox, Input, Select, useToast } from '../../components/ui'
import { CompanyFields, companyPayload, companyToForm, validateCompany } from './CompanyFields'

const STEPS = ['Company details', 'Registration & tax']
const emptyDocs = { registration_number: '', tax_id: '', vat_id: '', document_type: 'br_certificate' }

/**
 * Two steps to the verified-seller badge.
 *  1. Company details: type, size, industry, website, about, address, phone, contact person + position
 *     (company name + email are already known from registration)
 *  2. Registration & tax: BR number, TIN, VAT number, official document
 * Used in the dashboard pop-up and on the Verification page.
 */
export function VerificationWizard({ onDone, onLater }) {
  const { company, refresh } = useAuth()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => companyToForm(company))
  const [docs, setDocs] = useState(emptyDocs)
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [hasPickup, setHasPickup] = useState(true)
  const [addPickup, setAddPickup] = useState(true)

  useEffect(() => {
    supabase.from('pickup_locations').select('id', { count: 'exact', head: true }).eq('company_id', company.id)
      .then(({ count }) => setHasPickup(!!count))
  }, [company.id])

  async function saveDetails(e) {
    e.preventDefault()
    const errs = validateCompany(form, { forVerification: true })
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const payload = companyPayload(form)
      const { error } = await supabase.from('companies').update(payload).eq('id', company.id)
      if (error) throw error
      if (!hasPickup && addPickup) {
        const { error: pErr } = await supabase.from('pickup_locations').insert({
          company_id: company.id, label: 'Main office', is_default: true, country_code: 'LK',
          street: payload.street, city: payload.city, district: payload.region, postal_code: payload.postal_code,
        })
        if (pErr) throw pErr
        setHasPickup(true)
      }
      await refresh()
      setStep(1)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!docs.registration_number.trim()) errs.registration_number = 'Enter your business registration number.'
    if (!docs.tax_id.trim()) errs.tax_id = 'Enter your TIN.'
    if (!file) errs.file = 'Upload a document (PDF, JPG or PNG).'
    else if (file.size > 10 * 1024 * 1024) errs.file = 'File must be smaller than 10 MB.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const path = await uploadFile(BUCKETS.verificationDocs, company.id, file)
      const { error } = await supabase.from('seller_verifications').insert({
        company_id: company.id,
        registration_number: docs.registration_number.trim(),
        tax_id: docs.tax_id.trim(),
        vat_id: docs.vat_id.trim() || null,
        document_type: docs.document_type,
        document_path: path,
      })
      if (error) throw error
      await refresh()
      toast('Submitted — we will review your company within 1–2 working days')
      onDone?.()
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const setDoc = (k) => (e) => setDocs({ ...docs, [k]: e.target.value })

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        <div className="row" style={{ gap: 8 }}>
          {STEPS.map((label, i) => (
            <span key={label} className={`step ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`} style={{ cursor: 'default' }}>
              <span className="step-num">{i < step ? <Check /> : i + 1}</span>{label}
            </span>
          ))}
        </div>
        <div className="progress"><span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      </div>

      {step === 0 ? (
        <form className="stack-lg" onSubmit={saveDetails} noValidate>
          <Alert tone="info">
            <strong>{company.name}</strong>{company.contact_email && <> · {company.contact_email}</>}
            <div className="small">Your company name and email are taken from your registration.</div>
          </Alert>
          <section className="stack">
            <h4>Contact</h4>
            <CompanyFields value={form} onChange={setForm} errors={errors} section="contact" />
          </section>
          <section className="stack">
            <h4>Address</h4>
            <CompanyFields value={form} onChange={setForm} errors={errors} section="address" />
            {!hasPickup && (
              <Checkbox checked={addPickup} onChange={(e) => setAddPickup(e.target.checked)}
                label="Buyers can pick up devices at this address" description="Saved as your default pickup location. You can change it later." />
            )}
          </section>
          <section className="stack">
            <h4>About the company</h4>
            <CompanyFields value={form} onChange={setForm} errors={errors} section="basics" showName={false} />
          </section>
          <div className="row-between">
            {onLater ? <Button variant="ghost" onClick={onLater}>Later</Button> : <span />}
            <Button type="submit" variant="primary" iconRight={ArrowRight} loading={busy}>Save and continue</Button>
          </div>
        </form>
      ) : (
        <form className="stack-lg" onSubmit={submit} noValidate>
          <p className="small muted">Only our review team sees these details and documents. They are never shown to buyers.</p>
          <div className="grid-2">
            <Input label="Business registration (BR) number" required placeholder="PV 00123456" value={docs.registration_number}
              onChange={setDoc('registration_number')} error={errors.registration_number} hint="From the Registrar of Companies or your BR certificate" />
            <Input label="Taxpayer Identification Number (TIN)" required placeholder="123456789" value={docs.tax_id}
              onChange={setDoc('tax_id')} error={errors.tax_id} hint="Issued by the Inland Revenue Department" />
            <Input label="VAT registration number" placeholder="123456789-7000" value={docs.vat_id} onChange={setDoc('vat_id')} hint="Only if your company is VAT registered" />
            <Select label="Document type" value={docs.document_type} onChange={setDoc('document_type')} options={VERIFICATION_DOC_TYPES} />
          </div>
          <div className="field">
            <span className="field-label">Document<span className="req">*</span></span>
            <label className="dropzone" style={{ padding: '24px 16px' }}>
              <span className="dropzone-icon">{file ? <FileText /> : <Upload />}</span>
              {file ? <strong>{file.name}</strong> : <span><strong>Choose a file</strong> · PDF, JPG or PNG up to 10 MB</span>}
              <input type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            {errors.file && <span className="field-error">{errors.file}</span>}
          </div>
          <div className="row-between">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => { setErrors({}); setStep(0) }}>Back</Button>
            <Button type="submit" variant="primary" icon={ShieldCheck} loading={busy}>Submit for review</Button>
          </div>
        </form>
      )}
    </div>
  )
}
