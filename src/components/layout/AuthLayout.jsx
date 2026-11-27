import { BadgeCheck, Leaf, Recycle, ShieldCheck } from 'lucide-react'
import { Logo } from '../ui'

/** Split-screen layout for login / register / onboarding (shared by both sides). */
export function AuthLayout({ children, wide }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <Logo light />
        <div>
          <h2>Give business tech a second shift.</h2>
          <ul>
            <li><ShieldCheck /><span><strong>Verified companies only</strong>Every seller is a registered business.</span></li>
            <li><BadgeCheck /><span><strong>Data wiped, ownership confirmed</strong>Sellers confirm both before a listing goes live.</span></li>
            <li><Recycle /><span><strong>Bulk-friendly</strong>List 1 or 200 identical laptops in one go.</span></li>
            <li><Leaf /><span><strong>Cheaper and greener</strong>Buyers save up to 70% vs. new hardware.</span></li>
          </ul>
        </div>
        <p className="quote">Made for businesses in Sri Lanka</p>
      </aside>
      <main className="auth-main">
        <Logo />
        <div className={`auth-card fade-in ${wide ? 'wide' : ''}`}>{children}</div>
      </main>
    </div>
  )
}
