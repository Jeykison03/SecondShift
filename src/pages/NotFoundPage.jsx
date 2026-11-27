import { Compass } from 'lucide-react'
import { Button, EmptyState } from '../components/ui'

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <EmptyState icon={Compass} title="Page not found" action={<Button variant="primary" to="/">Go home</Button>}>
        The page you are looking for does not exist or was moved.
      </EmptyState>
    </div>
  )
}
