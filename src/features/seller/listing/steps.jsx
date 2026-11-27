import { Link } from 'react-router-dom'
import {
  Battery, Boxes, Cpu, FileCheck2, Headphones, Keyboard, Laptop, Monitor, Mouse, Network, Package, Plug,
  Plus, Printer, ShieldCheck, Smartphone, Tablet, Trash2, Upload, Video, X,
} from 'lucide-react'
import {
  ACCESSORY_SUGGESTIONS, CONDITION_GRADES, USAGE_INTENSITY, WARRANTY_TYPES, WIPE_METHODS,
} from '../../../lib/constants'
import { formatPrice, savingsPercent, toCents } from '../../../lib/format'
import {
  Alert, Card, Checkbox, ChoiceGroup, Field, Input, Select, Switch, Textarea,
} from '../../../components/ui'
import { BATTERY_CATEGORIES } from './listingModel'
import { PhotoUploader } from './PhotoUploader'

const CATEGORY_ICONS = {
  laptop: Laptop, cpu: Cpu, monitor: Monitor, keyboard: Keyboard, mouse: Mouse, plug: Plug, tablet: Tablet,
  smartphone: Smartphone, headphones: Headphones, video: Video, network: Network, printer: Printer, package: Package,
}

/* ===================== 1. Product ===================== */
export function ProductStep({ form, set, errors, categories }) {
  const year = new Date().getFullYear()
  return (
    <div className="stack-lg">
      <Card title="What are you selling?">
        <ChoiceGroup
          label="Category" value={String(form.category_id)} onChange={(v) => set({ category_id: v, specs: {} })} columns="130px"
          options={categories.map((c) => ({ value: String(c.id), label: c.name, icon: CATEGORY_ICONS[c.icon] ?? Package }))}
        />
        {errors.category_id && <p className="field-error" style={{ marginTop: 8 }}>{errors.category_id}</p>}
      </Card>

      <Card title="Product details" bodyClassName="stack">
        <Input label="Title" required maxLength={140} placeholder="Lenovo ThinkPad T14 Gen 3 – i5, 16 GB, 512 GB SSD"
          hint="Brand, model and the key specs buyers search for." value={form.title} onChange={(e) => set({ title: e.target.value })} error={errors.title} />
        <div className="grid-3">
          <Input label="Brand" placeholder="Lenovo" value={form.brand} onChange={(e) => set({ brand: e.target.value })} />
          <Input label="Model" placeholder="ThinkPad T14 Gen 3" value={form.model} onChange={(e) => set({ model: e.target.value })} />
          <Input label="Release year" type="number" inputMode="numeric" min={1990} max={year + 1} placeholder={String(year - 3)}
            value={form.release_year} onChange={(e) => set({ release_year: e.target.value })} error={errors.release_year} />
        </div>
        <Textarea label="Description" rows={5} maxLength={5000} value={form.description} onChange={(e) => set({ description: e.target.value })}
          placeholder="Why are you selling? What is included? Anything a buyer should know?" />
      </Card>

      <Card title="Condition grade" description="Be honest — buyers can report listings that do not match.">
        <ChoiceGroup
          label="Condition grade" value={form.condition_grade} onChange={(v) => set({ condition_grade: v })} columns="200px"
          options={CONDITION_GRADES.map((g) => ({
            value: g.value, label: g.label, desc: g.desc,
            badge: <span className={`badge grade-${g.value}`} style={{ alignSelf: 'flex-start', marginBottom: 4 }}>Grade {g.short}</span>,
          }))}
        />
        {errors.condition_grade && <p className="field-error" style={{ marginTop: 8 }}>{errors.condition_grade}</p>}
      </Card>
    </div>
  )
}

/* ===================== 2. Specs ===================== */
export function SpecsStep({ form, set, errors, category }) {
  const schema = category?.spec_schema ?? []
  const setSpec = (key, value) => set({ specs: { ...form.specs, [key]: value } })

  if (!category) return <Alert tone="info">Choose a category in the first step to see the matching spec fields.</Alert>

  return (
    <Card title={`${category.name} specifications`} description="Buyers filter by these fields, so fill in as many as you can.">
      <div className="grid-2">
        {schema.map((f) => {
          const v = form.specs[f.key]
          const err = errors[f.key]
          if (f.type === 'boolean') {
            return (
              <div key={f.key} className="field" style={{ justifyContent: 'center', minHeight: 72 }}>
                <Switch label={f.label} checked={!!v} onChange={(c) => setSpec(f.key, c)} />
                {err && <span className="field-error">{err}</span>}
              </div>
            )
          }
          if (f.type === 'select') {
            return <Select key={f.key} label={f.label} required={f.required} value={v ?? ''} placeholder="Select…" options={f.options} onChange={(e) => setSpec(f.key, e.target.value)} error={err} />
          }
          if (f.type === 'multiselect') {
            const arr = Array.isArray(v) ? v : []
            return (
              <Field key={f.key} label={f.label} required={f.required} error={err} className="span-2">
                <div className="chips">
                  {f.options.map((o) => {
                    const on = arr.includes(o)
                    return <button key={o} type="button" className={`chip ${on ? 'is-active' : ''}`} aria-pressed={on}
                      onClick={() => setSpec(f.key, on ? arr.filter((x) => x !== o) : [...arr, o])}>{o}</button>
                  })}
                </div>
              </Field>
            )
          }
          return (
            <Input key={f.key} label={f.label} required={f.required} type={f.type === 'number' ? 'number' : 'text'}
              inputMode={f.type === 'number' ? 'decimal' : undefined} min={f.type === 'number' ? 0 : undefined}
              placeholder={f.placeholder} suffix={f.unit} value={v ?? ''} error={err}
              onChange={(e) => setSpec(f.key, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />
          )
        })}
      </div>
    </Card>
  )
}

/* ===================== 3. Photos & condition ===================== */
export function PhotosStep({ form, set, errors, photos, setPhotos, removePhoto }) {
  return (
    <div className="stack-lg">
      <Card title="Photos" description="The first photo is the cover. Use real photos of the actual items — no stock images.">
        <PhotoUploader photos={photos} onChange={setPhotos} onRemove={removePhoto} error={errors.photos} />
      </Card>
      <Card title="Condition details" description={form.bulk ? 'For bulk listings, describe the typical condition and the worst unit.' : undefined} bodyClassName="stack">
        <Textarea label="Cosmetic defects" rows={2} maxLength={1000} placeholder="Light scratches on the lid, small dent on bottom-left corner"
          value={form.cosmetic_defects} onChange={(e) => set({ cosmetic_defects: e.target.value })} />
        <Textarea label="Functional defects" rows={2} maxLength={1000} placeholder="None — or e.g. ‘F7 key sticks occasionally’"
          value={form.functional_defects} onChange={(e) => set({ functional_defects: e.target.value })} />
        <Textarea label="Other condition notes" rows={2} maxLength={2000} placeholder="Freshly cleaned, new thermal paste, keyboard replaced in 2025…"
          value={form.condition_notes} onChange={(e) => set({ condition_notes: e.target.value })} />
      </Card>
    </div>
  )
}

/* ===================== 4. Quantity & price ===================== */
export function PricingStep({ form, set, errors, isNew }) {
  const save = savingsPercent(toCents(form.price), toCents(form.original_price))
  const total = Number.parseInt(form.quantity_total, 10) || 0
  const setTier = (i, patch) => set({ tiers: form.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) })

  return (
    <div className="stack-lg">
      <Card title="How many units?">
        <ChoiceGroup
          label="Listing type" value={form.bulk ? 'bulk' : 'single'} columns="220px"
          onChange={(v) => set(v === 'bulk' ? { bulk: true, quantity_total: total > 1 ? form.quantity_total : '10', quantity_available: total > 1 ? form.quantity_available : '10' } : { bulk: false, quantity_total: '1', min_order_quantity: '1', tiers: [] })}
          options={[
            { value: 'single', icon: Package, label: 'Single item', desc: 'One device, sold to one buyer.' },
            { value: 'bulk', icon: Boxes, label: 'Bulk — identical units', desc: 'Same model and specs. Buyers choose a quantity.' },
          ]}
        />
        {form.bulk && (
          <div className="grid-3" style={{ marginTop: 20 }}>
            <Input label="Total units" type="number" inputMode="numeric" min={2} required value={form.quantity_total} error={errors.quantity_total}
              onChange={(e) => set({ quantity_total: e.target.value, ...(isNew ? { quantity_available: e.target.value } : {}) })} />
            {!isNew && <Input label="Still available" type="number" inputMode="numeric" min={0} max={total} value={form.quantity_available}
              hint="Lower this if units were sold elsewhere." onChange={(e) => set({ quantity_available: e.target.value })} />}
            <Input label="Minimum order" type="number" inputMode="numeric" min={1} value={form.min_order_quantity} error={errors.min_order_quantity}
              hint="Smallest quantity per buyer" onChange={(e) => set({ min_order_quantity: e.target.value })} />
          </div>
        )}
      </Card>

      <Card title="Price" bodyClassName="stack">
        <div className="grid-2">
          <Input label={form.bulk ? 'Price per unit' : 'Price'} required inputMode="decimal" prefix="Rs." placeholder="0"
            value={form.price} onChange={(e) => set({ price: e.target.value })} error={errors.price} />
          <Input label="Original price when new" inputMode="decimal" prefix="Rs." placeholder="optional"
            hint={save ? `Buyers save ${save}% vs. new` : 'Shows buyers how much they save.'}
            value={form.original_price} onChange={(e) => set({ original_price: e.target.value })} error={errors.original_price} />
        </div>
        <div className="row" style={{ gap: 24 }}>
          <Switch label="Price includes VAT" checked={form.price_includes_vat} onChange={(c) => set({ price_includes_vat: c })} />
          <Switch label="Open to offers" checked={form.price_negotiable} onChange={(c) => set({ price_negotiable: c })} />
        </div>
      </Card>

      {form.bulk && (
        <Card title="Volume discounts" description="Optional. Lower unit prices for larger orders." bodyClassName="stack">
          {form.tiers.map((t, i) => (
            <div key={i} className="stack-sm">
              <div className="row" style={{ alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 120px' }}><Input label="From quantity" type="number" min={2} max={total} value={t.min_quantity} onChange={(e) => setTier(i, { min_quantity: e.target.value })} /></div>
                <div style={{ flex: '1 1 140px' }}><Input label="Price per unit" prefix="Rs." inputMode="decimal" value={t.price} onChange={(e) => setTier(i, { price: e.target.value })} /></div>
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove tier" onClick={() => set({ tiers: form.tiers.filter((_, j) => j !== i) })}><Trash2 /></button>
              </div>
              {errors[`tier_${i}`] && <span className="field-error">{errors[`tier_${i}`]}</span>}
            </div>
          ))}
          {form.tiers.length < 4 && (
            <div><button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ tiers: [...form.tiers, { min_quantity: '', price: '' }] })}><Plus />Add discount tier</button></div>
          )}
          {form.tiers.length > 0 && toCents(form.price) > 0 && (
            <p className="small muted">
              1–{Math.max(1, (Number(form.tiers[0]?.min_quantity) || 2) - 1)} units: {formatPrice(toCents(form.price))} ·{' '}
              {form.tiers.filter((t) => toCents(t.price)).map((t) => `${t.min_quantity}+ units: ${formatPrice(toCents(t.price))}`).join(' · ')}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}

/* ===================== 5. Usage, warranty, returns ===================== */
export function UsageStep({ form, set, errors, category }) {
  const showBattery = BATTERY_CATEGORIES.includes(category?.slug)
  const toggleAccessory = (a) => set({
    accessories_included: form.accessories_included.includes(a)
      ? form.accessories_included.filter((x) => x !== a)
      : [...form.accessories_included, a],
  })
  const custom = form.accessories_included.filter((a) => !ACCESSORY_SUGGESTIONS.includes(a))

  return (
    <div className="stack-lg">
      <Card title="Usage history" bodyClassName="stack">
        <div className="grid-3">
          <Input label="Purchased" type="month" value={form.purchased_on} max={new Date().toISOString().slice(0, 7)} onChange={(e) => set({ purchased_on: e.target.value })} />
          <Input label="Time in use" type="number" inputMode="numeric" min={0} suffix="months" value={form.usage_months} onChange={(e) => set({ usage_months: e.target.value })} />
          {showBattery && (
            <Input label="Battery health" type="number" inputMode="numeric" min={0} max={100} suffix="%" placeholder="e.g. 87"
              hint={<span className="row" style={{ gap: 4 }}><Battery size={12} /> Max capacity vs. new</span>}
              value={form.battery_health_pct} onChange={(e) => set({ battery_health_pct: e.target.value })} error={errors.battery_health_pct} />
          )}
        </div>
        <ChoiceGroup label="How intensively was it used?" value={form.usage_intensity} onChange={(v) => set({ usage_intensity: v })} columns="160px" options={USAGE_INTENSITY} />
        <Field label="Included accessories">
          <div className="chips">
            {[...ACCESSORY_SUGGESTIONS, ...custom].map((a) => {
              const on = form.accessories_included.includes(a)
              return <button key={a} type="button" className={`chip ${on ? 'is-active' : ''}`} aria-pressed={on} onClick={() => toggleAccessory(a)}>{a}{on && !ACCESSORY_SUGGESTIONS.includes(a) && <X size={14} />}</button>
            })}
            <AddChip onAdd={(a) => !form.accessories_included.includes(a) && set({ accessories_included: [...form.accessories_included, a] })} />
          </div>
        </Field>
        <Switch label="Original packaging available" checked={form.original_packaging} onChange={(c) => set({ original_packaging: c })} />
      </Card>

      <Card title="Warranty" bodyClassName="stack">
        <ChoiceGroup label="Warranty" value={form.warranty_type} onChange={(v) => set({ warranty_type: v })} columns="160px" options={WARRANTY_TYPES} />
        {form.warranty_type !== 'none' && (
          <div className="grid-2 fade-in">
            <Input label="Warranty valid until" type="date" required value={form.warranty_until} onChange={(e) => set({ warranty_until: e.target.value })} error={errors.warranty_until} />
            <Input label="Warranty details" placeholder="Lenovo Premier Support, on-site" value={form.warranty_notes} onChange={(e) => set({ warranty_notes: e.target.value })} />
          </div>
        )}
      </Card>

      <Card title="Returns" bodyClassName="stack">
        <Switch label="I accept returns" checked={form.returns_accepted} onChange={(c) => set({ returns_accepted: c })} />
        {form.returns_accepted && (
          <div className="grid-2 fade-in">
            <Input label="Return window" type="number" min={1} max={365} suffix="days" required value={form.return_window_days} onChange={(e) => set({ return_window_days: e.target.value })} error={errors.return_window_days} />
            <Input label="Return conditions" placeholder="Only if not as described, in original condition" value={form.return_conditions} onChange={(e) => set({ return_conditions: e.target.value })} />
          </div>
        )}
        {!form.returns_accepted && <p className="small muted">Buyers will see “No returns”. Listings with returns usually sell faster.</p>}
      </Card>
    </div>
  )
}

function AddChip({ onAdd }) {
  return (
    <form className="row" style={{ gap: 4 }} onSubmit={(e) => {
      e.preventDefault()
      const v = e.currentTarget.elements.acc.value.trim()
      if (v) { onAdd(v); e.currentTarget.reset() }
    }}>
      <input name="acc" className="input" style={{ minHeight: 36, width: 150, borderRadius: 999, padding: '6px 14px', fontSize: 14 }} placeholder="Other…" maxLength={40} />
    </form>
  )
}

/* ===================== 6. Pickup & confirmations ===================== */
export function ConfirmStep({ form, set, errors, locations, certificateFile, setCertificateFile, company }) {
  return (
    <div className="stack-lg">
      <Card title="Pickup" description="Buyers collect items at this location. No shipping in V1." bodyClassName="stack">
        {locations.length === 0 ? (
          <Alert tone="warning" title="No pickup location yet">
            <Link to="/seller/pickup-locations">Add a pickup location</Link> first — your draft is kept.
          </Alert>
        ) : (
          <Select label="Pickup location" required value={form.pickup_location_id} placeholder="Select…" error={errors.pickup_location_id}
            onChange={(e) => set({ pickup_location_id: e.target.value })}
            options={locations.map((l) => ({ value: l.id, label: `${l.label} — ${l.street}, ${l.city}` }))} />
        )}
        <Textarea label="Pickup notes" rows={2} maxLength={1000} placeholder="Items are on a pallet, bring a van for 20+ units"
          value={form.pickup_notes} onChange={(e) => set({ pickup_notes: e.target.value })} />
      </Card>

      <Card title="Data protection" description="Business devices often hold personal data. Buyers need to know it is gone." bodyClassName="stack">
        <Select label="How was the data removed?" required value={form.data_wipe_method} placeholder="Select…" options={WIPE_METHODS}
          onChange={(e) => set({ data_wipe_method: e.target.value })} error={errors.data_wipe_method} />
        <Field label="Erasure certificate" hint="Optional · PDF, JPG or PNG · only shown to buyers you accept">
          <label className="dropzone" style={{ padding: '16px', flexDirection: 'row' }}>
            {certificateFile || form.data_wipe_certificate_path ? <FileCheck2 color="var(--success)" /> : <Upload />}
            <span>{certificateFile?.name ?? (form.data_wipe_certificate_path ? 'Certificate uploaded — click to replace' : 'Upload certificate')}</span>
            <input type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={(e) => setCertificateFile(e.target.files?.[0] ?? null)} />
          </label>
        </Field>
      </Card>

      <Card title="Seller confirmations" description="Required before the listing goes live." bodyClassName="stack">
        <div className="stack-sm">
          <Checkbox checked={form.data_wiped_confirmed} onChange={(e) => set({ data_wiped_confirmed: e.target.checked })}
            label="All data has been permanently erased"
            description="Every storage device in this listing was wiped (or removed). No personal or company data can be recovered. Devices are removed from MDM, iCloud/Google and BIOS passwords." />
          {errors.data_wiped_confirmed && <span className="field-error">{errors.data_wiped_confirmed}</span>}
        </div>
        <div className="stack-sm">
          <Checkbox checked={form.ownership_confirmed} onChange={(e) => set({ ownership_confirmed: e.target.checked })}
            label={`${company?.name ?? 'My company'} owns these items and may sell them`}
            description="The items are not leased, financed or stolen, and are free of third-party rights." />
          {errors.ownership_confirmed && <span className="field-error">{errors.ownership_confirmed}</span>}
        </div>
        <p className="xs muted row" style={{ gap: 6 }}><ShieldCheck size={14} />Your confirmation is stored with a timestamp and your name.</p>
      </Card>
    </div>
  )
}
