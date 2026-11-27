import { useCallback, useEffect, useState } from 'react'
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { errorMessage } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Spinner, Textarea, useToast } from '../../components/ui'
import { DISTRICTS } from '../../lib/constants'
import { PageHeader } from './PageHeader'

const empty = { label: '', street: '', postal_code: '', city: '', district: '', country_code: 'LK', opening_hours: '', instructions: '' }

export default function PickupLocationsPage() {
  const { company } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [editing, setEditing] = useState(null) // null | {…location}

  const load = useCallback(async () => {
    const { data } = await supabase.from('pickup_locations').select('*').eq('company_id', company.id)
      .order('is_default', { ascending: false }).order('created_at')
    setItems(data ?? [])
  }, [company?.id])
  useEffect(() => { if (company) load() }, [company, load])

  async function makeDefault(loc) {
    // unique index allows one default per company: unset first, then set
    await supabase.from('pickup_locations').update({ is_default: false }).eq('company_id', company.id).eq('is_default', true)
    const { error } = await supabase.from('pickup_locations').update({ is_default: true }).eq('id', loc.id)
    if (error) toast(errorMessage(error), 'error'); else toast(`${loc.label} is now your default`)
    load()
  }

  async function remove(loc) {
    if (!window.confirm(`Delete “${loc.label}”? Listings using it will have no pickup location.`)) return
    const { error } = await supabase.from('pickup_locations').delete().eq('id', loc.id)
    if (error) toast(errorMessage(error), 'error'); else toast('Pickup location deleted')
    load()
  }

  return (
    <>
      <PageHeader
        title="Pickup locations"
        description="Where buyers collect their equipment. The exact address is shared once you accept a request."
        actions={<Button variant="primary" icon={Plus} onClick={() => setEditing({ ...empty, is_default: !items?.length })}>Add location</Button>}
      />
      {items === null ? <Spinner center /> : items.length === 0 ? (
        <Card><EmptyState icon={MapPin} title="No pickup locations yet" action={<Button variant="primary" icon={Plus} onClick={() => setEditing({ ...empty, is_default: true })}>Add your first location</Button>}>
          Add at least one location so buyers know where to collect items.
        </EmptyState></Card>
      ) : (
        <div className="grid-2">
          {items.map((loc) => (
            <Card key={loc.id} className="fade-in" bodyClassName="stack-sm">
              <div className="row-between">
                <strong style={{ color: 'var(--ink-900)' }} className="row"><MapPin size={18} color="var(--brand-600)" />{loc.label}</strong>
                {loc.is_default && <Badge tone="success">Default</Badge>}
              </div>
              <p className="small">{loc.street}<br />{[loc.city, loc.district && `${loc.district} District`, loc.postal_code].filter(Boolean).join(', ')}</p>
              {loc.opening_hours && <p className="small muted">🕑 {loc.opening_hours}</p>}
              {loc.instructions && <p className="small muted">{loc.instructions}</p>}
              <div className="row" style={{ marginTop: 8 }}>
                <Button size="sm" icon={Pencil} onClick={() => setEditing(loc)}>Edit</Button>
                {!loc.is_default && <Button size="sm" variant="ghost" icon={Star} onClick={() => makeDefault(loc)}>Make default</Button>}
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(loc)} aria-label={`Delete ${loc.label}`} />
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <LocationModal value={editing} companyId={company.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </>
  )
}

function LocationModal({ value, companyId, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({ ...empty, ...value })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function onSubmit(e) {
    e.preventDefault()
    const errs = {}
    for (const k of ['label', 'street', 'city', 'district']) if (!form[k]?.trim()) errs[k] = 'Required'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    const payload = {
      label: form.label.trim(), street: form.street.trim(), postal_code: form.postal_code?.trim() || null, city: form.city.trim(),
      district: form.district, country_code: 'LK', opening_hours: form.opening_hours?.trim() || null, instructions: form.instructions?.trim() || null,
    }
    const { error } = value.id
      ? await supabase.from('pickup_locations').update(payload).eq('id', value.id)
      : await supabase.from('pickup_locations').insert({ ...payload, company_id: companyId, is_default: !!value.is_default })
    setBusy(false)
    if (error) return toast(errorMessage(error), 'error')
    toast(value.id ? 'Location updated' : 'Location added')
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={value.id ? 'Edit pickup location' : 'Add pickup location'}>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Input label="Name" required placeholder="Head office" value={form.label} onChange={set('label')} error={errors.label} />
        <Input label="Address" required placeholder="No. 25, Galle Road" value={form.street} onChange={set('street')} error={errors.street} />
        <div className="grid-2">
          <Input label="City / town" required placeholder="Colombo 03" value={form.city} onChange={set('city')} error={errors.city} />
          <Select label="District" required value={form.district ?? ''} onChange={set('district')} placeholder="Select…" options={DISTRICTS} error={errors.district} />
          <Input label="Postal code" placeholder="00300" value={form.postal_code ?? ''} onChange={set('postal_code')} />
        </div>
        <Input label="Opening hours" placeholder="Mon–Fri 9.00 a.m.–4.00 p.m." value={form.opening_hours ?? ''} onChange={set('opening_hours')} />
        <Textarea label="Pickup instructions" rows={2} placeholder="Show the security desk your order message and ask for the IT department" value={form.instructions ?? ''} onChange={set('instructions')} maxLength={1000} />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy}>Save location</Button>
        </div>
      </form>
    </Modal>
  )
}
