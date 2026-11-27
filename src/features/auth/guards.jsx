import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { homePathFor, useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner center />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Seller area: only seller accounts (buyers are sent to the buyer side). Needs a company. */
export function RequireSeller() {
  const { accountType, companies, loading } = useAuth()
  if (loading) return <Spinner center />
  if (accountType !== 'seller') return <Navigate to="/buyer" replace />
  if (!companies.length) return <Navigate to="/seller/setup" replace />
  return <Outlet />
}

export function RedirectIfAuthed() {
  const auth = useAuth()
  if (auth.loading) return <Spinner center />
  if (auth.user) return <Navigate to={homePathFor(auth)} replace />
  return <Outlet />
}
