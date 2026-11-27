import { ArrowRight, Boxes, HandCoins, ShieldCheck } from 'lucide-react'
import { homePathFor, useAuth } from '../context/AuthContext'
import { Button, Card, Logo, ProductCard } from '../components/ui'
import { formatPrice } from '../lib/format'

export default function LandingPage() {
  const auth = useAuth()
  const signedIn = !!auth.user

  return (
    <div style={{ background: 'var(--surface)', minHeight: '100dvh' }}>
      <nav className="landing-nav">
        <Logo />
        <div className="row">
          {signedIn ? (
            <Button variant="primary" to={homePathFor(auth)} iconRight={ArrowRight}>Open dashboard</Button>
          ) : (
            <>
              <Button variant="ghost" to="/login">Log in</Button>
              <Button variant="primary" to="/register">Get started</Button>
            </>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="fade-in">
          <span className="badge badge-success" style={{ marginBottom: 20 }}>B2B marketplace for used electronics</span>
          <h1>Your old office tech is <em>someone's next workstation.</em></h1>
          <p className="hero-lead">
            Companies list laptops, monitors and keyboards they no longer need. Startups, small businesses and private buyers across Sri Lanka get them for a fraction of the price — data-wiped and from verified sellers.
          </p>
          <div className="row" style={{ marginTop: 32 }}>
            <Button variant="primary" size="lg" to={signedIn ? homePathFor(auth) : '/register'} iconRight={ArrowRight}>Start selling</Button>
            <Button variant="secondary" size="lg" to={signedIn ? '/buyer' : '/register'}>Browse devices</Button>
          </div>
        </div>
        <div className="hero-visual" aria-hidden>
          <ProductCard title="Lenovo ThinkPad T14 Gen 3 · i5 · 16 GB" grade="very_good" priceCents={18500000} originalPriceCents={52000000} quantity={24} minOrder={2} city="Colombo 03" verified companyName="Lanka Tech Solutions (Pvt) Ltd" />
          <Card className="fade-in" bodyClassName="stack-sm">
            <div className="row-between">
              <strong style={{ color: 'var(--ink-900)' }}>Dell U2722D · 27&quot; QHD</strong>
              <span className="badge grade-like_new">A · Like new</span>
            </div>
            <span className="price">{formatPrice(6800000)}</span>
          </Card>
        </div>
      </section>

      <section className="features">
        <div className="grid-3">
          {[
            { icon: ShieldCheck, title: 'Trust built in', text: 'Verified-seller badge, mandatory data-wipe and ownership confirmation on every listing.' },
            { icon: Boxes, title: 'Made for bulk', text: 'List 50 identical laptops once, set volume prices, buyers request the quantity they need.' },
            { icon: HandCoins, title: 'Fair for both sides', text: 'Sellers recover value from surplus hardware. Buyers save up to 70% versus new.' },
          ].map(({ icon: Icon, title, text }) => (
            <Card key={title} bodyClassName="stack-sm">
              <div className="feature-icon"><Icon size={22} /></div>
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
