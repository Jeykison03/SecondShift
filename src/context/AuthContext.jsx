import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Shared auth state for seller + buyer side.
 *  - user / session: Supabase auth
 *  - profile: public.profiles row
 *  - accountType: 'seller' | 'buyer' (public.profiles.account_type, chosen at registration, fixed)
 *    Sellers may also browse the buyer side; buyers can't open the seller side.
 *  - companies: companies the user belongs to (with role)
 *  - company: the active company
 */
const AuthCtx = createContext(null)
const ACTIVE_KEY = 'secondshift.activeCompany'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [companies, setCompanies] = useState([])
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY))
  const [loading, setLoading] = useState(true)

  const user = session?.user ?? null

  const loadedUid = useRef(undefined)

  const loadUserData = useCallback(async (uid) => {
    loadedUid.current = uid ?? null
    if (!uid) { setProfile(null); setCompanies([]); return }
    const [{ data: prof }, { data: members }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('company_members').select('role, company:companies(*)').eq('user_id', uid),
    ])
    setProfile(prof)
    setCompanies((members ?? []).filter((m) => m.company).map((m) => ({ ...m.company, role: m.role })))
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      await loadUserData(data.session?.user?.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      const uid = s?.user?.id ?? null
      if ((event === 'SIGNED_IN' || event === 'SIGNED_OUT') && uid !== loadedUid.current) {
        // A different user: block routing until their companies are loaded.
        // Deferred so we don't call Supabase inside the auth callback (lock deadlock).
        setLoading(true)
        setTimeout(() => loadUserData(uid).finally(() => setLoading(false)), 0)
      }
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [loadUserData])

  const company = useMemo(
    () => companies.find((c) => c.id === activeId) ?? companies[0] ?? null,
    [companies, activeId],
  )

  const value = useMemo(() => ({
    loading,
    session,
    user,
    profile,
    companies,
    company,
    accountType: profile?.account_type ?? (user?.user_metadata?.account_type === 'seller' ? 'seller' : 'buyer'),
    refresh: () => loadUserData(user?.id),
    selectCompany: (id) => { localStorage.setItem(ACTIVE_KEY, id); setActiveId(id) },
    async signOut() {
      await supabase.auth.signOut()
      localStorage.removeItem(ACTIVE_KEY)
    },
  }), [loading, session, user, profile, companies, company, loadUserData])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Where a signed-in user should land. */
export function homePathFor({ accountType, companies }) {
  if (accountType === 'seller') return companies.length ? '/seller' : '/seller/setup'
  return '/buyer'
}
