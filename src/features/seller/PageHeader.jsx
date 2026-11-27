import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export function PageHeader({ title, description, actions, back }) {
  return (
    <div className="page-header fade-in">
      <div>
        {back && <Link to={back.to} className="breadcrumb"><ChevronLeft />{back.label}</Link>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  )
}
