import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Building2, ChevronDown, LayoutGrid, LogOut, MapPin, Plus, Repeat, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { initials } from '../../lib/format'
import { publicUrl } from '../../lib/storage'
import { BUCKETS } from '../../lib/constants'
import { Badge, Button, Logo, Modal, VerifiedBadge } from '../../components/ui'
import { VerificationWizard } from './VerificationWizard'

const NAV = [
  { to: '/seller', label: 'Listings', icon: LayoutGrid, end: true },
  { to: '/seller/company', label: 'Company profile', icon: Building2 },
  { to: '/seller/verification', label: 'Verification', icon: ShieldCheck },
  { to: '/seller/pickup-locations', label: 'Pickup locations', icon: MapPin },
]

const LATER_KEY = 'secondshift.verifyLater'

export default function SellerLayout() {
  const { company } = useAuth()
  const location = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  // Pop up the 2-step verification on the dashboard until the company has applied.
  const canVerify = ['owner', 'admin'].includes(company?.role) && ['unverified', 'rejected'].includes(company?.verification_status)
  const [verifyOpen, setVerifyOpen] = useState(false)
  useEffect(() => {
    if (canVerify && location.pathname === '/seller' && sessionStorage.getItem(LATER_KEY) !== company.id) setVerifyOpen(true)
  }, [canVerify, location.pathname, company?.id])
  const later = () => { sessionStorage.setItem(LATER_KEY, company.id); setVerifyOpen(false) }

  return (
    <div className="shell">
      <header className="topbar">
        <Logo to="/seller" />
        <div className="topbar-right">
          <Badge tone="brand" className="mode-pill">Seller</Badge>
          <Button variant="primary" size="sm" icon={Plus} to="/seller/listings/new" className="mode-pill">New listing</Button>
          <UserMenu />
        </div>
      </header>

      <div className="shell-body">
        <aside className="sidebar" aria-label="Seller navigation">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link"><Icon aria-hidden />{label}</NavLink>
          ))}
          {company?.verification_status !== 'verified' && (
            <div className="sidebar-cta">
              <ShieldCheck size={22} color="var(--brand-600)" />
              <strong className="small" style={{ color: 'var(--ink-900)' }}>Get the verified badge</strong>
              <span className="xs muted">Verified sellers get more requests from buyers.</span>
              {canVerify ? <Button size="sm" onClick={() => setVerifyOpen(true)}>Verify company</Button>
                : <Button size="sm" to="/seller/verification">View status</Button>}
            </div>
          )}
        </aside>

        <main className="content">
          <div className="content-inner">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Seller navigation">
        <NavLink to="/seller" end className="bottom-link"><LayoutGrid />Listings</NavLink>
        <NavLink to="/seller/company" className="bottom-link"><Building2 />Company</NavLink>
        <NavLink to="/seller/listings/new" className="bottom-fab" aria-label="New listing"><Plus /></NavLink>
        <NavLink to="/seller/verification" className="bottom-link"><ShieldCheck />Verify</NavLink>
        <NavLink to="/seller/pickup-locations" className="bottom-link"><MapPin />Pickup</NavLink>
      </nav>

      <Modal open={verifyOpen} onClose={later} title="Become a verified seller" wide>
        <p className="small muted" style={{ marginBottom: 16 }}>Verified sellers get a badge on every listing and more requests from buyers. It takes about 3 minutes.</p>
        <VerificationWizard onLater={later} onDone={() => setVerifyOpen(false)} />
      </Modal>
    </div>
  )
}

function UserMenu() {
  const { profile, user, company, companies, selectCompany, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const name = profile?.full_name || user?.email
  const avatar = publicUrl(BUCKETS.avatars, profile?.avatar_path)

  return (
    <div className="menu" ref={ref}>
      <button className="btn btn-ghost btn-sm" style={{ paddingLeft: 4, gap: 6 }} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <span className="avatar">{avatar ? <img src={avatar} alt="" /> : initials(name)}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="menu-panel" role="menu">
          <div className="menu-head">
            <div style={{ fontWeight: 650, color: 'var(--ink-900)' }}>{name}</div>
            <div className="xs muted">{company?.name}</div>
            <div style={{ marginTop: 8 }}><VerifiedBadge status={company?.verification_status} /></div>
          </div>
          {companies.length > 1 && companies.map((c) => (
            <button key={c.id} className="menu-item" role="menuitem" onClick={() => { selectCompany(c.id); setOpen(false) }}>
              <Building2 />{c.name}{c.id === company?.id && ' ✓'}
            </button>
          ))}
          <button className="menu-item" role="menuitem" onClick={() => { setOpen(false); navigate('/seller/company') }}><Building2 />Company profile</button>
          <button className="menu-item" role="menuitem" onClick={() => navigate('/buyer')}><Repeat />Switch to buying</button>
          <button className="menu-item" role="menuitem" onClick={signOut}><LogOut />Log out</button>
        </div>
      )}
    </div>
  )
}
