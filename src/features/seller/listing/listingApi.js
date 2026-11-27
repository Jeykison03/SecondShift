import { supabase, unwrap } from '../../../lib/supabase'
import { toCents } from '../../../lib/format'
import { imageSize, removeFiles, uploadFile } from '../../../lib/storage'
import { BUCKETS } from '../../../lib/constants'
import { toPayload } from './listingModel'

export async function loadListing(id) {
  const [listing, photos, tiers] = await Promise.all([
    supabase.from('listings').select('*').eq('id', id).single().then(unwrap),
    supabase.from('listing_photos').select('*').eq('listing_id', id).order('position').then(unwrap),
    supabase.from('listing_price_tiers').select('*').eq('listing_id', id).then(unwrap),
  ])
  return { listing, photos, tiers }
}

/**
 * Save everything that belongs to a listing.
 * photos: [{ id?, storage_path?, file?, previewUrl }] in display order; first = cover.
 * removedPhotos: rows that existed before and were removed in the UI.
 * certificateFile: optional new wipe certificate.
 */
export async function saveListing({ form, status, companyId, photos, removedPhotos, certificateFile }) {
  const isNew = !form.id
  const row = { ...toPayload(form, { isNew }), status }

  // 1. listing row
  let listingId = form.id
  if (isNew) {
    const created = unwrap(await supabase.from('listings').insert({ ...row, company_id: companyId }).select('id').single())
    listingId = created.id
  } else {
    unwrap(await supabase.from('listings').update(row).eq('id', listingId))
  }
  const folder = `${companyId}/${listingId}`

  // 2. photos: delete removed, upload new, then fix order + cover
  if (removedPhotos.length) {
    unwrap(await supabase.from('listing_photos').delete().in('id', removedPhotos.map((p) => p.id)))
    await removeFiles(BUCKETS.listingPhotos, removedPhotos.map((p) => p.storage_path))
  }
  const saved = []
  for (const p of photos) {
    if (p.id) { saved.push(p); continue }
    const storage_path = await uploadFile(BUCKETS.listingPhotos, folder, p.file)
    const { width, height } = await imageSize(p.file)
    const inserted = unwrap(await supabase.from('listing_photos')
      .insert({ listing_id: listingId, storage_path, position: 0, width, height })
      .select('id, storage_path').single())
    saved.push({ ...p, ...inserted, file: undefined })
  }
  // only one cover allowed: clear first, then set positions + cover
  unwrap(await supabase.from('listing_photos').update({ is_cover: false }).eq('listing_id', listingId).eq('is_cover', true))
  await Promise.all(saved.map((p, i) =>
    supabase.from('listing_photos').update({ position: i, is_cover: i === 0 }).eq('id', p.id).then(unwrap)))

  // 3. price tiers: replace all
  unwrap(await supabase.from('listing_price_tiers').delete().eq('listing_id', listingId))
  const tiers = form.bulk
    ? form.tiers.filter((t) => t.min_quantity && t.price).map((t) => ({
      listing_id: listingId, min_quantity: Number.parseInt(t.min_quantity, 10), unit_price_cents: toCents(t.price),
    }))
    : []
  if (tiers.length) unwrap(await supabase.from('listing_price_tiers').insert(tiers))

  // 4. data-wipe certificate (private bucket)
  if (certificateFile) {
    const path = await uploadFile(BUCKETS.wipeCertificates, folder, certificateFile)
    unwrap(await supabase.from('listings').update({ data_wipe_certificate_path: path }).eq('id', listingId))
    await removeFiles(BUCKETS.wipeCertificates, [form.data_wipe_certificate_path])
  }

  return { id: listingId, photos: saved }
}

export async function setListingStatus(id, status, extra = {}) {
  unwrap(await supabase.from('listings').update({ status, ...extra }).eq('id', id))
}

export async function deleteListing(listing) {
  const photos = unwrap(await supabase.from('listing_photos').select('storage_path').eq('listing_id', listing.id))
  unwrap(await supabase.from('listings').delete().eq('id', listing.id))
  await removeFiles(BUCKETS.listingPhotos, photos.map((p) => p.storage_path))
  await removeFiles(BUCKETS.wipeCertificates, [listing.data_wipe_certificate_path])
}

/** Copy a listing as a new draft (handy for similar bulk batches). Photos are not copied. */
export async function duplicateListing(id, companyId) {
  const src = unwrap(await supabase.from('listings').select('*').eq('id', id).single())
  const omit = ['id', 'created_at', 'updated_at', 'published_at', 'sold_at', 'view_count', 'search', 'confirmed_at', 'confirmed_by', 'created_by', 'data_wipe_certificate_path']
  const copy = Object.fromEntries(Object.entries(src).filter(([k]) => !omit.includes(k)))
  copy.title = `${src.title} (copy)`.slice(0, 140)
  copy.status = 'draft'
  copy.company_id = companyId
  copy.quantity_available = copy.quantity_total
  copy.data_wiped_confirmed = false
  copy.ownership_confirmed = false
  return unwrap(await supabase.from('listings').insert(copy).select('id').single()).id
}
