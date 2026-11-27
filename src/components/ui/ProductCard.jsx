import { ImageIcon, MapPin, Package, ShieldCheck } from 'lucide-react'
import { formatPrice, savingsPercent } from '../../lib/format'
import { GradeBadge } from './Feedback'

/**
 * Listing card used in the seller preview AND meant for the buyer browse page,
 * so both sides show products the same way.
 */
export function ProductCard({ title, imageUrl, grade, priceCents, originalPriceCents, quantity, minOrder, city, verified, companyName }) {
  const save = savingsPercent(priceCents, originalPriceCents)
  return (
    <article className="card product-card">
      <div className="product-card-media">
        {imageUrl ? <img src={imageUrl} alt="" /> : <ImageIcon size={36} aria-hidden />}
        {grade && <GradeBadge grade={grade} />}
      </div>
      <div className="product-card-body">
        <div className="product-card-title">{title || 'Untitled listing'}</div>
        <div className="row" style={{ gap: 8 }}>
          <span className="price">{formatPrice(priceCents)}</span>
          {save && <span className="save-tag">−{save}%</span>}
        </div>
        {originalPriceCents > priceCents && <span className="xs muted">New: <s>{formatPrice(originalPriceCents)}</s> · per unit</span>}
        <div className="listing-meta" style={{ marginTop: 0 }}>
          {quantity > 0 && <span className="row" style={{ gap: 4 }}><Package size={14} /> {quantity} available{minOrder > 1 ? ` · min ${minOrder}` : ''}</span>}
          {city && <span className="row" style={{ gap: 4 }}><MapPin size={14} /> {city}</span>}
        </div>
        {companyName && (
          <div className="row xs" style={{ gap: 6, color: verified ? 'var(--success)' : 'var(--ink-500)', fontWeight: 600 }}>
            {verified && <ShieldCheck size={14} />} {companyName}
          </div>
        )}
      </div>
    </article>
  )
}
