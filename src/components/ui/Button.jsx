import { Link } from 'react-router-dom'

/**
 * <Button variant="primary|secondary|ghost|danger|accent" size="sm|md|lg" loading block to="/path">
 * Renders a <Link> when `to` is given, otherwise a <button>.
 */
export function Button({
  variant = 'secondary', size = 'md', block, loading, icon: Icon, iconRight: IconRight,
  to, className = '', children, disabled, type = 'button', ...rest
}) {
  const cls = [
    'btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, block && 'btn-block',
    !children && 'btn-icon', className,
  ].filter(Boolean).join(' ')

  const content = (
    <>
      {loading ? <span className="spinner" aria-hidden /> : Icon && <Icon aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight aria-hidden />}
    </>
  )

  if (to) {
    return <Link to={to} className={cls} {...rest}>{content}</Link>
  }
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  )
}
