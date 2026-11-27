import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Archive, BadgeCheck, Copy, Eye, ImageIcon, Inbox, MoreHorizontal, Package, Pencil, Play, Plus, Rocket, Search,
  ShieldCheck, Tag, Trash2,
} from 'lucide-react'
import { supabase, unwrap } from '../../lib/supabase'
import { errorMessage, formatPrice, timeAgo } from '../../lib/format'
import { publicUrl } from '../../lib/storage'
import { BUCKETS, LISTING_STATUS } from '../../lib/constants'
import { useAuth } from '../../context/AuthContext'
import {
  Alert, Button, Card, EmptyState, GradeBadge, Input, Modal, Spinner, StatusBadge, useToast,
} from '../../components/ui'
import { PageHeader } from './PageHeader'
import { deleteListing, duplicateListing, setListingStatus } from './listing/listingApi'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Drafts' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'sold', label: 'Sold' },
  { key: 'archived', label: 'Paused' },
]

export default function DashboardPage() {
  const { company, profile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [listings, setListings] = useState(null)
  const [requests, setRequests] = useState(0)
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [selling, setSelling] = useState(null)   // listing in "mark as sold" modal
  const [deleting, setDeleting] = useState(null) // listing in delete modal

  const load = useCallback(async () => {
    try {
      const [rows, reqs] = await Promise.all([
        supabase.from('listings')
          .select('id, title, status, condition_grade, unit_price_cents, quantity_total, quantity_available, view_count, updated_at, published_at, data_wiped_confirmed, ownership_confirmed, data_wipe_certificate_path, photos:listing_photos(storage_path, is_cover, position)')
          .eq('company_id', company.id)
          .order('updated_at', { ascending: false })
          .then(unwrap),
        supabase.from('purchase_requests').select('id', { count: 'exact', head: true })
          .eq('seller_company_id', company.id).eq('status', 'pending'),
      ])
      setListings(rows)
      setRequests(reqs.count ?? 0)
    } catch (e) {
      toast(errorMessage(e), 'error'); setListings([])
    }
  }, [company.id, toast])

  useEffect(() => { load() }, [load])

  const counts = useMemo(() => {
    const c = { all: listings?.length ?? 0 }
    for (const l of listings ?? []) c[l.status] = (c[l.status] ?? 0) + 1
    return c
  }, [listings])

  const stats = useMemo(() => {
    const live = (listings ?? []).filter((l) => l.status === 'active' || l.status === 'reserved')
    return {
      active: counts.active ?? 0,
      units: live.reduce((s, l) => s + l.quantity_available, 0),
      value: live.reduce((s, l) => s + l.quantity_available * l.unit_price_cents, 0),
      views: (listings ?? []).reduce((s, l) => s + l.view_count, 0),
    }
  }, [listings, counts])

  const visible = (listings ?? []).filter((l) =>
    (tab === 'all' || l.status === tab) && (!query || l.title.toLowerCase().includes(query.toLowerCase())))

  async function run(fn, success) {
    try { await fn(); toast(success); await load() } catch (e) { toast(errorMessage(e), 'error') }
  }

  const actions = {
    publish: (l) => (l.data_wiped_confirmed && l.ownership_confirmed
      ? run(() => setListingStatus(l.id, 'active'), 'Listing is live')
      : navigate(`/seller/listings/${l.id}/edit`, { state: { step: 5 } })),
    pause: (l) => run(() => setListingStatus(l.id, 'archived'), 'Listing paused — buyers no longer see it'),
    resume: (l) => run(() => setListingStatus(l.id, 'active'), 'Listing is live again'),
    duplicate: (l) => run(async () => {
      const id = await duplicateListing(l.id, company.id)
      navigate(`/seller/listings/${id}/edit`)
    }, 'Copied as a new draft'),
  }

  const firstName = profile?.full_name?.split(' ')[0]

  return (
    <>
      <PageHeader
        title={location.state?.welcome ? `Welcome${firstName ? `, ${firstName}` : ''}! 👋` : 'My listings'}
        description={location.state?.welcome ? 'Your company is set up. Create your first listing in a few minutes.' : 'Manage everything your company is selling.'}
        actions={<Button variant="primary" icon={Plus} to="/seller/listings/new">New listing</Button>}
      />

      {company.verification_status === 'unverified' && (
        <div style={{ marginBottom: 20 }}>
          <Alert tone="info" title="Become a verified seller" action={<Button size="sm" to="/seller/verification">Verify</Button>}>
            Upload your trade register extract to get the <BadgeCheck size={14} style={{ verticalAlign: -2 }} /> badge on all your listings.
          </Alert>
        </div>
      )}

      <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 24 }}>
        <Stat icon={Rocket} label="Active listings" value={stats.active} />
        <Stat icon={Package} label="Units for sale" value={stats.units} />
        <Stat icon={Tag} label="Value listed" value={formatPrice(stats.value)} />
        <Stat icon={requests ? Inbox : Eye} label={requests ? 'Open requests' : 'Total views'} value={requests || stats.views} highlight={requests > 0} />
      </div>

      <Card bodyClassName="" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--line)' }} className="stack">
          <div className="row-between">
            <div className="chips" role="tablist">
              {TABS.map((t) => (
                <button key={t.key} role="tab" aria-selected={tab === t.key} className={`chip ${tab === t.key ? 'is-active' : ''}`} onClick={() => setTab(t.key)}>
                  {t.label}<span className="chip-count">{counts[t.key] ?? 0}</span>
                </button>
              ))}
            </div>
            <div style={{ flex: '0 1 260px' }}>
              <Input aria-label="Search listings" placeholder="Search by title" prefix={<Search size={16} />} value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
        </div>

        {listings === null ? <Spinner center /> : visible.length === 0 ? (
          listings.length === 0 ? (
            <EmptyState icon={Package} title="No listings yet" action={<Button variant="primary" icon={Plus} to="/seller/listings/new">Create your first listing</Button>}>
              Add photos, specs and a price. Bulk listings let you sell many identical devices at once.
            </EmptyState>
          ) : (
            <EmptyState icon={Search} title="Nothing here">No listings match this filter.</EmptyState>
          )
        ) : (
          <div>
            {visible.map((l) => <ListingRow key={l.id} listing={l} actions={actions} onSold={setSelling} onDelete={setDeleting} />)}
          </div>
        )}
      </Card>

      {selling && <SoldModal listing={selling} onClose={() => setSelling(null)} onDone={() => { setSelling(null); load() }} />}
      {deleting && (
        <Modal open title="Delete listing?" onClose={() => setDeleting(null)}
          footer={<>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" icon={Trash2} onClick={() => { const l = deleting; setDeleting(null); run(() => deleteListing(l), 'Listing deleted') }}>Delete permanently</Button>
          </>}>
          <p>“{deleting.title}” and its photos will be removed. This cannot be undone.</p>
          {deleting.status !== 'draft' && <p className="small muted" style={{ marginTop: 8 }}>Tip: use <strong>Pause</strong> instead to hide it but keep the history.</p>}
        </Modal>
      )}
    </>
  )
}

function Stat({ icon: Icon, label, value, highlight }) {
  return (
    <div className="card stat" style={highlight ? { borderColor: 'var(--brand-500)', background: 'var(--brand-50)' } : undefined}>
      <span className="stat-label"><Icon />{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

function ListingRow({ listing: l, actions, onSold, onDelete }) {
  const [menu, setMenu] = useState(false)
  const cover = [...(l.photos ?? [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position)[0]
  const img = publicUrl(BUCKETS.listingPhotos, cover?.storage_path)
  const live = l.status === 'active' || l.status === 'reserved'

  return (
    <div className="listing-row fade-in">
      <div className="listing-thumb">{img ? <img src={img} alt="" loading="lazy" /> : <ImageIcon size={24} />}</div>
      <div style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
          <span className="listing-title">{l.title}</span>
        </div>
        <div className="listing-meta">
          <StatusBadge status={l.status} />
          <GradeBadge grade={l.condition_grade} />
          <strong style={{ color: 'var(--ink-900)' }}>{formatPrice(l.unit_price_cents)}{l.quantity_total > 1 && <span className="muted" style={{ fontWeight: 400 }}> / unit</span>}</strong>
          <span>{l.quantity_total > 1 ? `${l.quantity_available} of ${l.quantity_total} left` : l.quantity_available ? '1 item' : 'Sold out'}</span>
          {live && <span className="row" style={{ gap: 4 }}><Eye size={14} />{l.view_count}</span>}
          <span className="xs">Updated {timeAgo(l.updated_at)}</span>
          {l.data_wiped_confirmed && l.ownership_confirmed && <span className="row xs" style={{ gap: 4, color: 'var(--success)' }}><ShieldCheck size={14} />Confirmed</span>}
        </div>
      </div>
      <div className="listing-actions">
        <Button size="sm" icon={Pencil} to={`/seller/listings/${l.id}/edit`}>Edit</Button>
        {l.status === 'draft' && <Button size="sm" variant="primary" icon={Rocket} onClick={() => actions.publish(l)}>Publish</Button>}
        {live && <Button size="sm" icon={Tag} onClick={() => onSold(l)}>Mark as sold</Button>}
        {l.status === 'archived' && <Button size="sm" icon={Play} onClick={() => actions.resume(l)}>Resume</Button>}
        <div className="menu">
          <Button size="sm" variant="ghost" icon={MoreHorizontal} aria-label="More actions" aria-expanded={menu} onClick={() => setMenu((m) => !m)} />
          {menu && (
            <div className="menu-panel" role="menu" onMouseLeave={() => setMenu(false)}>
              {live && <button className="menu-item" role="menuitem" onClick={() => { setMenu(false); actions.pause(l) }}><Archive />Pause listing</button>}
              <button className="menu-item" role="menuitem" onClick={() => { setMenu(false); actions.duplicate(l) }}><Copy />Duplicate as draft</button>
              <button className="menu-item" role="menuitem" style={{ color: 'var(--danger)' }} onClick={() => { setMenu(false); onDelete(l) }}><Trash2 color="var(--danger)" />Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Mark all or some units as sold (sold outside the platform or after pickup). */
function SoldModal({ listing, onClose, onDone }) {
  const toast = useToast()
  const bulk = listing.quantity_total > 1
  const [units, setUnits] = useState(String(listing.quantity_available))
  const [busy, setBusy] = useState(false)
  const n = Math.max(0, Math.min(listing.quantity_available, Number.parseInt(units, 10) || 0))
  const remaining = listing.quantity_available - n

  async function confirm() {
    setBusy(true)
    try {
      if (remaining === 0) await setListingStatus(listing.id, 'sold', { quantity_available: 0 })
      else await setListingStatus(listing.id, listing.status, { quantity_available: remaining })
      toast(remaining === 0 ? 'Marked as sold' : `${n} unit${n === 1 ? '' : 's'} marked as sold`)
      onDone()
    } catch (e) {
      toast(errorMessage(e), 'error'); setBusy(false)
    }
  }

  return (
    <Modal open title="Mark as sold" onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={Tag} loading={busy} disabled={bulk && n === 0} onClick={confirm}>
          {remaining === 0 ? 'Mark as sold' : `Mark ${n} sold`}
        </Button>
      </>}>
      <div className="stack">
        <p><strong>{listing.title}</strong></p>
        {bulk ? (
          <>
            <Input label="Units sold" type="number" min={1} max={listing.quantity_available} value={units} onChange={(e) => setUnits(e.target.value)}
              hint={`${listing.quantity_available} currently available`} />
            <p className="small muted">
              {remaining === 0 ? 'All units sold — the listing will move to “Sold” and buyers can no longer request it.' : `${remaining} unit${remaining === 1 ? '' : 's'} will stay listed.`}
            </p>
          </>
        ) : (
          <p className="small muted">The listing moves to “Sold” and is no longer shown to buyers as available.</p>
        )}
        <p className="xs muted">Status: {LISTING_STATUS[listing.status]?.label}</p>
      </div>
    </Modal>
  )
}
