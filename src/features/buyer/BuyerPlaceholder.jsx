import { Hammer, Store } from 'lucide-react'
import { homePathFor, useAuth } from '../../context/AuthContext'
import { Button, EmptyState, Logo } from '../../components/ui'

/**
 * Placeholder for the buyer side (Person B).
 * Replace this with the buyer routes. Reuse:
 *  - components/ui (Button, Card, ProductCard, GradeBadge, …)
 *  - styles/tokens.css for colours/spacing
 *  - the public.listing_cards view for the browse page
 * Rules: buyers never see the seller side. Sellers can browse here and switch back
 * with the "Back to selling" button (accountType === 'seller').
 */
export default function BuyerPlaceholder() {
  const auth = useAuth()
  const isSeller = auth.accountType === 'seller'
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <nav className="landing-nav" style={{ width: '100%' }}>
        <Logo />
        {isSeller && <Button variant="secondary" size="sm" icon={Store} to={homePathFor(auth)}>Back to selling</Button>}
      </nav>
      <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <EmptyState
          icon={Hammer} title="Buyer side is under construction"
          action={
            <div className="row" style={{ justifyContent: 'center' }}>
              {isSeller && <Button variant="primary" icon={Store} to={homePathFor(auth)}>Back to seller dashboard</Button>}
              <Button variant="ghost" onClick={auth.signOut}>Log out</Button>
            </div>
          }
        >
          Browsing and buying is coming soon.
        </EmptyState>
      </div>
    </div>
  )
}
