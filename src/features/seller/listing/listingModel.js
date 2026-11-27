import { fromCents, toCents } from '../../../lib/format'

export const STEPS = [
  { key: 'product', label: 'Product' },
  { key: 'specs', label: 'Specs' },
  { key: 'photos', label: 'Photos & condition' },
  { key: 'pricing', label: 'Quantity & price' },
  { key: 'usage', label: 'Usage & warranty' },
  { key: 'confirm', label: 'Pickup & publish' },
]

/** Categories where battery health makes sense. */
export const BATTERY_CATEGORIES = ['laptops', 'tablets', 'smartphones']

/** Form state uses strings for inputs; converted to DB types in toPayload(). */
export const emptyListing = {
  id: null,
  status: 'draft',
  category_id: '',
  title: '',
  brand: '',
  model: '',
  release_year: '',
  description: '',
  condition_grade: '',
  specs: {},
  condition_notes: '',
  cosmetic_defects: '',
  functional_defects: '',
  bulk: false,
  quantity_total: '1',
  quantity_available: '1',
  min_order_quantity: '1',
  price: '',
  original_price: '',
  price_includes_vat: true,
  price_negotiable: false,
  tiers: [], // [{ min_quantity: '10', price: '199.00' }]
  purchased_on: '',
  usage_months: '',
  usage_intensity: '',
  battery_health_pct: '',
  accessories_included: [],
  original_packaging: false,
  warranty_type: 'none',
  warranty_until: '',
  warranty_notes: '',
  returns_accepted: false,
  return_window_days: '14',
  return_conditions: '',
  pickup_location_id: '',
  pickup_notes: '',
  data_wipe_method: '',
  data_wipe_certificate_path: null,
  data_wiped_confirmed: false,
  ownership_confirmed: false,
}

const str = (v) => (v == null ? '' : String(v))

export function fromRow(row, tiers = []) {
  return {
    ...emptyListing,
    id: row.id,
    status: row.status,
    category_id: str(row.category_id),
    title: row.title ?? '',
    brand: row.brand ?? '',
    model: row.model ?? '',
    release_year: str(row.release_year),
    description: row.description ?? '',
    condition_grade: row.condition_grade ?? '',
    specs: row.specs ?? {},
    condition_notes: row.condition_notes ?? '',
    cosmetic_defects: row.cosmetic_defects ?? '',
    functional_defects: row.functional_defects ?? '',
    bulk: row.quantity_total > 1,
    quantity_total: str(row.quantity_total),
    quantity_available: str(row.quantity_available),
    min_order_quantity: str(row.min_order_quantity),
    price: fromCents(row.unit_price_cents),
    original_price: fromCents(row.original_price_cents),
    price_includes_vat: row.price_includes_vat,
    price_negotiable: row.price_negotiable,
    tiers: tiers.sort((a, b) => a.min_quantity - b.min_quantity).map((t) => ({ min_quantity: str(t.min_quantity), price: fromCents(t.unit_price_cents) })),
    purchased_on: row.purchased_on ? row.purchased_on.slice(0, 7) : '',
    usage_months: str(row.usage_months),
    usage_intensity: row.usage_intensity ?? '',
    battery_health_pct: str(row.battery_health_pct),
    accessories_included: row.accessories_included ?? [],
    original_packaging: row.original_packaging,
    warranty_type: row.warranty_type,
    warranty_until: row.warranty_until ?? '',
    warranty_notes: row.warranty_notes ?? '',
    returns_accepted: row.returns_accepted,
    return_window_days: str(row.return_window_days ?? 14),
    return_conditions: row.return_conditions ?? '',
    pickup_location_id: row.pickup_location_id ?? '',
    pickup_notes: row.pickup_notes ?? '',
    data_wipe_method: row.data_wipe_method ?? '',
    data_wipe_certificate_path: row.data_wipe_certificate_path,
    data_wiped_confirmed: row.data_wiped_confirmed,
    ownership_confirmed: row.ownership_confirmed,
  }
}

const int = (v) => (v === '' || v == null ? null : Number.parseInt(v, 10))
const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** Remove empty spec values so the JSON stays tidy. */
function cleanSpecs(specs) {
  return Object.fromEntries(Object.entries(specs).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length)))
}

/** Form -> listings row (without id/company/status). */
export function toPayload(f, { isNew }) {
  const total = f.bulk ? Math.max(1, int(f.quantity_total) || 1) : 1
  let available = isNew ? total : int(f.quantity_available)
  if (available == null || available > total) available = total
  const minOrder = f.bulk ? Math.min(total, Math.max(1, int(f.min_order_quantity) || 1)) : 1
  return {
    category_id: int(f.category_id),
    title: f.title.trim(),
    brand: text(f.brand),
    model: text(f.model),
    release_year: int(f.release_year),
    description: text(f.description),
    condition_grade: f.condition_grade || null,
    specs: cleanSpecs(f.specs),
    condition_notes: text(f.condition_notes),
    cosmetic_defects: text(f.cosmetic_defects),
    functional_defects: text(f.functional_defects),
    quantity_total: total,
    quantity_available: Math.max(0, available),
    min_order_quantity: minOrder,
    unit_price_cents: toCents(f.price) ?? 0,
    original_price_cents: toCents(f.original_price),
    price_includes_vat: f.price_includes_vat,
    price_negotiable: f.price_negotiable,
    purchased_on: f.purchased_on ? `${f.purchased_on}-01` : null,
    usage_months: int(f.usage_months),
    usage_intensity: f.usage_intensity || null,
    battery_health_pct: int(f.battery_health_pct),
    accessories_included: f.accessories_included,
    original_packaging: f.original_packaging,
    warranty_type: f.warranty_type,
    warranty_until: f.warranty_type === 'none' ? null : f.warranty_until || null,
    warranty_notes: f.warranty_type === 'none' ? null : text(f.warranty_notes),
    returns_accepted: f.returns_accepted,
    return_window_days: f.returns_accepted ? int(f.return_window_days) : null,
    return_conditions: f.returns_accepted ? text(f.return_conditions) : null,
    pickup_location_id: f.pickup_location_id || null,
    pickup_notes: text(f.pickup_notes),
    data_wipe_method: text(f.data_wipe_method),
    data_wiped_confirmed: f.data_wiped_confirmed,
    ownership_confirmed: f.ownership_confirmed,
  }
}

/**
 * Errors per step. `forPublish` adds the stricter checks needed to go live.
 * Returns { [stepKey]: { field: message } }.
 */
export function validate(f, { photos, category, forPublish }) {
  const e = Object.fromEntries(STEPS.map((s) => [s.key, {}]))
  const year = new Date().getFullYear()

  // product (also required for drafts — DB needs title, category, grade)
  if (!f.category_id) e.product.category_id = 'Choose a category.'
  if (f.title.trim().length < 3) e.product.title = 'Title needs at least 3 characters.'
  if (!f.condition_grade) e.product.condition_grade = 'Choose a condition grade.'
  if (f.release_year && (f.release_year < 1990 || f.release_year > year + 1)) e.product.release_year = `Between 1990 and ${year + 1}.`

  // pricing
  const price = toCents(f.price)
  if (f.price !== '' && price == null) e.pricing.price = 'Enter a valid price.'
  const total = int(f.quantity_total)
  if (f.bulk && (!total || total < 2)) e.pricing.quantity_total = 'Bulk listings need at least 2 units.'
  if (f.bulk && int(f.min_order_quantity) > total) e.pricing.min_order_quantity = 'Cannot be more than the total quantity.'
  if (f.original_price && toCents(f.original_price) == null) e.pricing.original_price = 'Enter a valid price.'
  f.tiers.forEach((t, i) => {
    const q = int(t.min_quantity)
    if (!q || q < 2 || (total && q > total)) e.pricing[`tier_${i}`] = `Quantity must be between 2 and ${total || 'the total'}.`
    else if (toCents(t.price) == null) e.pricing[`tier_${i}`] = 'Enter a unit price for this tier.'
    else if (price != null && toCents(t.price) >= price) e.pricing[`tier_${i}`] = 'Tier price should be lower than the base price.'
  })

  // usage & warranty
  if (f.battery_health_pct && (f.battery_health_pct < 0 || f.battery_health_pct > 100)) e.usage.battery_health_pct = '0–100 %'
  if (f.warranty_type !== 'none' && !f.warranty_until) e.usage.warranty_until = 'When does the warranty end?'
  if (f.returns_accepted && !int(f.return_window_days)) e.usage.return_window_days = 'How many days can buyers return it?'

  if (forPublish) {
    if (!price || price <= 0) e.pricing.price = 'Set a price per unit.'
    for (const field of category?.spec_schema ?? []) {
      if (field.required && (f.specs[field.key] === undefined || f.specs[field.key] === '' || f.specs[field.key] === null)) {
        e.specs[field.key] = `${field.label} is required.`
      }
    }
    if (!photos.length) e.photos.photos = 'Add at least one photo.'
    if (!f.pickup_location_id) e.confirm.pickup_location_id = 'Choose where buyers pick up the item.'
    if (!f.data_wipe_method) e.confirm.data_wipe_method = 'How was the data removed?'
    if (!f.data_wiped_confirmed) e.confirm.data_wiped_confirmed = 'Required to publish.'
    if (!f.ownership_confirmed) e.confirm.ownership_confirmed = 'Required to publish.'
  }
  return e
}

export const hasErrors = (stepErrors) => Object.keys(stepErrors ?? {}).length > 0
export const firstStepWithErrors = (errors) => STEPS.findIndex((s) => hasErrors(errors[s.key]))
