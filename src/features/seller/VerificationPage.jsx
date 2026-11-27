import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, Clock, FileText, ShieldCheck, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { errorMessage, timeAgo } from '../../lib/format'
import { signedUrl } from '../../lib/storage'
import { BUCKETS, VERIFICATION_DOC_TYPES } from '../../lib/constants'
import { useAuth } from '../../context/AuthContext'
import { Alert, Badge, Button, Card, EmptyState, Spinner, VerifiedBadge, useToast } from '../../components/ui'
import { VerificationWizard } from './VerificationWizard'
import { PageHeader } from './PageHeader'

const statusInfo = {
  unverified: { icon: ShieldCheck, tone: 'info', title: 'Get your verified-seller badge', text: 'Tell us about your company and upload your business registration. Our team reviews it, usually within 1–2 working days.' },
  pending: { icon: Clock, tone: 'warning', title: 'Verification in review', text: 'We received your documents and are checking them. You can keep listing in the meantime.' },
  verified: { icon: BadgeCheck, tone: 'success', title: 'Your company is verified', text: 'The verified-seller badge is shown on your profile and on every listing.' },
  rejected: { icon: XCircle, tone: 'danger', title: 'Verification was rejected', text: 'Please check the reviewer note below and submit a new document.' },
}

export default function VerificationPage() {
  const { company } = useAuth()
  const toast = useToast()
  const [history, setHistory] = useState(null)
  const canEdit = company?.role === 'owner' || company?.role === 'admin'

  const load = useCallback(async () => {
    const { data } = await supabase.from('seller_verifications').select('*').eq('company_id', company.id).order('created_at', { ascending: false })
    setHistory(data ?? [])
  }, [company?.id])

  useEffect(() => { if (company) load() }, [company, load])

  async function openDoc(path) {
    try { window.open(await signedUrl(BUCKETS.verificationDocs, path), '_blank', 'noopener') }
    catch (err) { toast(errorMessage(err), 'error') }
  }

  if (!company) return null
  const status = company.verification_status
  const info = statusInfo[status] ?? statusInfo.unverified
  const latest = history?.[0]
  const showForm = canEdit && (status === 'unverified' || status === 'rejected')

  return (
    <>
      <PageHeader title="Seller verification" description="Verified sellers get a badge on every listing and are trusted more by buyers." />
      <div className="stack-lg">
        <Alert tone={info.tone} title={info.title}>
          {info.text}
          {status === 'rejected' && latest?.reviewer_notes && <div style={{ marginTop: 8 }}><strong>Reviewer note:</strong> {latest.reviewer_notes}</div>}
        </Alert>

        {showForm && (
          <Card title="Become a verified seller" description="Two short steps: your company details, then your registration and tax numbers.">
            <VerificationWizard onDone={load} />
          </Card>
        )}

        {!canEdit && status !== 'verified' && <Alert tone="info">Ask a company owner or admin to submit the verification.</Alert>}

        <Card title="Submission history">
          {history === null ? <Spinner center /> : history.length === 0 ? (
            <EmptyState icon={FileText} title="No submissions yet">Your verification requests will appear here.</EmptyState>
          ) : (
            <div className="stack">
              {history.map((h) => (
                <div key={h.id} className="row-between" style={{ paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                  <div className="stack-sm" style={{ gap: 2 }}>
                    <strong style={{ color: 'var(--ink-900)' }}>{VERIFICATION_DOC_TYPES.find((d) => d.value === h.document_type)?.label ?? 'Document'}</strong>
                    <span className="small muted">{[h.registration_number && `BR ${h.registration_number}`, h.tax_id && `TIN ${h.tax_id}`, h.vat_id && `VAT ${h.vat_id}`].filter(Boolean).join(' · ')} · submitted {timeAgo(h.created_at)}</span>
                  </div>
                  <div className="row">
                    <VerifiedBadge status={h.status} />
                    {h.document_path && <Button size="sm" variant="ghost" icon={FileText} onClick={() => openDoc(h.document_path)}>View</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        {status === 'pending' && <p className="xs muted"><Badge>Demo note</Badge> A platform admin approves requests by setting the status to “verified” in the seller_verifications table.</p>}
      </div>
    </>
  )
}
