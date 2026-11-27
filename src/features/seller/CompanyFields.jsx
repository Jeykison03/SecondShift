import { COMPANY_SIZES, COMPANY_TYPES, DISTRICTS, INDUSTRIES } from '../../lib/constants'
import { Input, Select, Textarea } from '../../components/ui'

export const emptyCompany = {
  name: '', legal_name: '', company_type: 'sme', company_size: '', industry: '', description: '', website: '',
  contact_email: '', contact_phone: '', contact_person: '', contact_position: '',
  street: '', city: '', region: '', postal_code: '', country_code: 'LK',
}

/** Company row -> form state (null -> ''). */
export const companyToForm = (c) =>
  ({ ...emptyCompany, ...Object.fromEntries(Object.entries(c ?? {}).filter(([k]) => k in emptyCompany).map(([k, v]) => [k, v ?? ''])) })

const PHONE = /^\+?[0-9 ()-]{9,16}$/

/**
 * forVerification: the details a seller must give in verification step 1
 * (address, phone, contact person). Name/email were given at registration.
 */
export function validateCompany(c, { forVerification = false } = {}) {
  const e = {}
  if (!c.name?.trim() || c.name.trim().length < 2) e.name = 'Company name is required.'
  if (c.contact_email && !/^\S+@\S+\.\S+$/.test(c.contact_email)) e.contact_email = 'Enter a valid email.'
  if (c.website && !/^https?:\/\/\S+\.\S+/.test(c.website)) e.website = 'Start with https://'
  if (c.contact_phone && !PHONE.test(c.contact_phone.trim())) e.contact_phone = 'Enter a valid phone number, e.g. +94 77 123 4567.'
  if (forVerification) {
    if (!c.contact_phone?.trim()) e.contact_phone = 'Phone number is required.'
    if (!c.street?.trim()) e.street = 'Address is required.'
    if (!c.city?.trim()) e.city = 'City is required.'
    if (!c.region) e.region = 'Select a district.'
    if (!c.contact_person?.trim()) e.contact_person = 'Who should we contact?'
    if (!c.contact_position?.trim()) e.contact_position = 'Position is required.'
    if (!c.company_type) e.company_type = 'Select a company type.'
  }
  return e
}

/** Turn '' into null so optional enum/text columns stay clean. */
export function companyPayload(c) {
  const out = {}
  for (const k of Object.keys(emptyCompany)) {
    const v = typeof c[k] === 'string' ? c[k].trim() : c[k]
    out[k] = v === '' ? null : v
  }
  out.country_code = 'LK'
  out.company_type = out.company_type || 'sme'
  return out
}

/**
 * Shared company form fields.
 * section: 'basics' (who you are) | 'contact' (phone + contact person) | 'address' | 'all'
 */
export function CompanyFields({ value, onChange, errors = {}, section = 'all', showName = true }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  const show = (s) => section === 'all' || section === s
  return (
    <div className="stack-lg">
      {show('basics') && (
        <div className="grid-2">
          {showName && <Input className="span-2" label="Company name" required value={value.name} onChange={set('name')} error={errors.name} placeholder="Lanka Tech Solutions (Pvt) Ltd" />}
          <Input label="Legal name" hint="As on your business registration, if different" value={value.legal_name ?? ''} onChange={set('legal_name')} />
          <Select label="Company type" required value={value.company_type} onChange={set('company_type')} options={COMPANY_TYPES} error={errors.company_type} />
          <Select label="Industry" value={value.industry ?? ''} onChange={set('industry')} placeholder="Select…" options={INDUSTRIES} />
          <Select label="Company size" value={value.company_size ?? ''} onChange={set('company_size')} placeholder="Select…" options={COMPANY_SIZES.map((s) => ({ value: s, label: `${s} employees` }))} />
          <Input className="span-2" label="Website" type="url" value={value.website ?? ''} onChange={set('website')} error={errors.website} placeholder="https://company.lk" />
          <Textarea className="span-2" label="About the company" rows={3} maxLength={2000} value={value.description ?? ''} onChange={set('description')} placeholder="What does your company do? Why are you selling equipment?" />
        </div>
      )}
      {show('contact') && (
        <div className="grid-2">
          <Input label="Contact person" required value={value.contact_person ?? ''} onChange={set('contact_person')} error={errors.contact_person} placeholder="Nimal Perera" autoComplete="name" />
          <Input label="Position" required value={value.contact_position ?? ''} onChange={set('contact_position')} error={errors.contact_position} placeholder="IT Manager" autoComplete="organization-title" />
          <Input label="Phone number" required type="tel" value={value.contact_phone ?? ''} onChange={set('contact_phone')} error={errors.contact_phone} placeholder="+94 77 123 4567" autoComplete="tel" />
          <Input label="Company email" type="email" value={value.contact_email ?? ''} onChange={set('contact_email')} error={errors.contact_email} placeholder="info@company.lk" />
        </div>
      )}
      {show('address') && (
        <div className="grid-2">
          <Input className="span-2" label="Address" required value={value.street ?? ''} onChange={set('street')} error={errors.street} placeholder="No. 25, Galle Road" autoComplete="street-address" />
          <Input label="City / town" required value={value.city ?? ''} onChange={set('city')} error={errors.city} placeholder="Colombo 03" autoComplete="address-level2" />
          <Select label="District" required value={value.region ?? ''} onChange={set('region')} error={errors.region} placeholder="Select…" options={DISTRICTS} />
          <Input label="Postal code" value={value.postal_code ?? ''} onChange={set('postal_code')} placeholder="00300" autoComplete="postal-code" />
          <Input label="Country" value="Sri Lanka" disabled />
        </div>
      )}
    </div>
  )
}
