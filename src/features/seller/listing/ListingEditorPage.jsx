import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CircleCheck, CircleDashed, Rocket, Save } from 'lucide-react'
import { supabase, unwrap } from '../../../lib/supabase'
import { errorMessage, toCents } from '../../../lib/format'
import { publicUrl } from '../../../lib/storage'
import { BUCKETS } from '../../../lib/constants'
import { useAuth } from '../../../context/AuthContext'
import { Alert, Button, Card, ProductCard, Spinner, StatusBadge, useToast } from '../../../components/ui'
import { PageHeader } from '../PageHeader'
import { STEPS, emptyListing, firstStepWithErrors, fromRow, hasErrors, validate } from './listingModel'
import { loadListing, saveListing } from './listingApi'
import { ConfirmStep, PhotosStep, PricingStep, ProductStep, SpecsStep, UsageStep } from './steps'

export default function ListingEditorPage() {
  const { id } = useParams()
  const isNew = !id
  const { company } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState(emptyListing)
  const [photos, setPhotos] = useState([])
  const [removedPhotos, setRemovedPhotos] = useState([])
  const [certificateFile, setCertificateFile] = useState(null)
  const routerLocation = useLocation()
  const [step, setStep] = useState(routerLocation.state?.step ?? 0) // kept when a new draft is saved
  const [visited, setVisited] = useState(new Set([0]))
  const [showErrors, setShowErrors] = useState(false)
  const [publishTried, setPublishTried] = useState(false)
  const [saving, setSaving] = useState(null) // 'draft' | 'publish' | null
  const [dirty, setDirty] = useState(false)

  // ---------- load ----------
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [cats, locs] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order').then(unwrap),
          supabase.from('pickup_locations').select('*').eq('company_id', company.id).order('is_default', { ascending: false }).then(unwrap),
        ])
        if (!alive) return
        setCategories(cats); setLocations(locs)
        if (isNew) {
          const def = locs.find((l) => l.is_default) ?? locs[0]
          setForm({ ...emptyListing, pickup_location_id: def?.id ?? '' })
        } else {
          const { listing, photos: ph, tiers } = await loadListing(id)
          if (!alive) return
          setForm(fromRow(listing, tiers))
          setPhotos(ph.map((p) => ({ ...p, key: p.id, previewUrl: publicUrl(BUCKETS.listingPhotos, p.storage_path) })))
          setVisited(new Set(STEPS.map((_, i) => i)))
        }
      } catch (e) {
        if (alive) setLoadError(errorMessage(e))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id, isNew, company.id])

  // warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const category = categories.find((c) => String(c.id) === String(form.category_id))
  const errors = useMemo(
    () => validate(form, { photos, category, forPublish: publishTried }),
    [form, photos, category, publishTried],
  )
  const publishErrors = useMemo(() => validate(form, { photos, category, forPublish: true }), [form, photos, category])
  const stepKey = STEPS[step].key
  const isLive = ['active', 'reserved'].includes(form.status)

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setDirty(true) }
  const updatePhotos = (next) => { setPhotos(next); setDirty(true) }
  const removePhoto = (i) => {
    const p = photos[i]
    if (p.id) setRemovedPhotos((r) => [...r, p])
    else URL.revokeObjectURL(p.previewUrl)
    updatePhotos(photos.filter((_, j) => j !== i))
  }

  function goTo(i) {
    setStep(i)
    setVisited((v) => new Set(v).add(i))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function next() {
    if (hasErrors(errors[stepKey])) { setShowErrors(true); return }
    setShowErrors(false)
    goTo(Math.min(step + 1, STEPS.length - 1))
  }

  async function save(mode) {
    const forPublish = mode === 'publish' || isLive
    const errs = validate(form, { photos, category, forPublish })
    const bad = firstStepWithErrors(errs)
    if (bad !== -1) {
      setPublishTried(forPublish); setShowErrors(true); goTo(bad)
      toast(forPublish ? 'A few things are missing before publishing' : 'Please fix the highlighted fields', 'error')
      return
    }
    setSaving(mode)
    try {
      const status = mode === 'publish' ? 'active' : form.status
      const res = await saveListing({ form, status, companyId: company.id, photos, removedPhotos, certificateFile })
      setDirty(false)
      if (mode === 'publish' || isLive) {
        toast(mode === 'publish' && !isLive ? 'Listing published 🎉' : 'Changes saved')
        navigate('/seller', { replace: true })
      } else {
        toast('Draft saved')
        setRemovedPhotos([]); setCertificateFile(null)
        setPhotos(res.photos.map((p) => ({ ...p, key: p.id, previewUrl: p.previewUrl ?? publicUrl(BUCKETS.listingPhotos, p.storage_path) })))
        if (isNew) navigate(`/seller/listings/${res.id}/edit`, { replace: true, state: { step } })
        else setForm((f) => ({ ...f, id: res.id }))
      }
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <Spinner center />
  if (loadError) return <Alert tone="danger" title="Could not load listing">{loadError}</Alert>

  const stepErrors = showErrors || publishTried ? errors[stepKey] : {}
  const location = locations.find((l) => l.id === form.pickup_location_id)
  const stepProps = { form, set, errors: stepErrors, category, categories, isNew }

  return (
    <>
      <PageHeader
        back={{ to: '/seller', label: 'My listings' }}
        title={isNew ? 'New listing' : form.title || 'Edit listing'}
        actions={!isNew && <StatusBadge status={form.status} />}
      />

      <div className="stack" style={{ marginBottom: 24 }}>
        <nav className="stepper" aria-label="Listing steps">
          {STEPS.map((s, i) => {
            const done = visited.has(i) && i !== step && !hasErrors(publishErrors[s.key])
            return (
              <button key={s.key} type="button" className={`step ${i === step ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
                onClick={() => goTo(i)} aria-current={i === step ? 'step' : undefined}>
                <span className="step-num">{done ? <Check /> : i + 1}</span>{s.label}
              </button>
            )
          })}
        </nav>
        <div className="progress"><span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      </div>

      <div className="editor">
        <div key={stepKey} className="fade-in">
          {stepKey === 'product' && <ProductStep {...stepProps} />}
          {stepKey === 'specs' && <SpecsStep {...stepProps} />}
          {stepKey === 'photos' && <PhotosStep {...stepProps} photos={photos} setPhotos={updatePhotos} removePhoto={removePhoto} />}
          {stepKey === 'pricing' && <PricingStep {...stepProps} />}
          {stepKey === 'usage' && <UsageStep {...stepProps} />}
          {stepKey === 'confirm' && (
            <ConfirmStep {...stepProps} locations={locations} company={company}
              certificateFile={certificateFile} setCertificateFile={(f) => { setCertificateFile(f); setDirty(true) }} />
          )}

          <div className="action-bar">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => goTo(step - 1)} disabled={step === 0}>
              <span className="hide-sm">Back</span>
            </Button>
            <div className="row" style={{ gap: 8 }}>
              {!isLive && <Button icon={Save} loading={saving === 'draft'} disabled={!!saving} onClick={() => save('draft')}>Save draft</Button>}
              {step < STEPS.length - 1 ? (
                <Button variant="primary" iconRight={ArrowRight} onClick={next}>Next</Button>
              ) : isLive ? (
                <Button variant="primary" icon={Save} loading={saving === 'draft'} disabled={!!saving} onClick={() => save('draft')}>Save changes</Button>
              ) : (
                <Button variant="primary" icon={Rocket} loading={saving === 'publish'} disabled={!!saving} onClick={() => save('publish')}>Publish</Button>
              )}
            </div>
          </div>
        </div>

        <aside className="editor-aside stack">
          <span className="section-title">Buyer preview</span>
          <ProductCard
            title={form.title} imageUrl={photos[0]?.previewUrl} grade={form.condition_grade}
            priceCents={toCents(form.price)} originalPriceCents={toCents(form.original_price)}
            quantity={form.bulk ? Number(form.quantity_available) || Number(form.quantity_total) : 1}
            minOrder={Number(form.min_order_quantity)} city={location?.city ?? company.city}
            verified={company.verification_status === 'verified'} companyName={company.name}
          />
          <Card title="Ready to publish?" bodyClassName="stack-sm">
            {STEPS.map((s, i) => {
              const ok = !hasErrors(publishErrors[s.key])
              return (
                <button key={s.key} type="button" className="menu-item" style={{ padding: '6px 4px' }} onClick={() => goTo(i)}>
                  {ok ? <CircleCheck color="var(--success)" /> : <CircleDashed />}
                  <span style={{ color: ok ? 'var(--ink-900)' : 'var(--ink-500)' }}>{s.label}</span>
                </button>
              )
            })}
          </Card>
        </aside>
      </div>
    </>
  )
}
