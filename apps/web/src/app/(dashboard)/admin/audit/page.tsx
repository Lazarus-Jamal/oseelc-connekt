import type { Metadata } from 'next'
import { AuditLogPage } from '@/components/admin/audit-log-page'

export const metadata: Metadata = { title: "Journal d'audit" }

export default function AuditPage() {
  return <AuditLogPage />
}
