import type { Metadata } from 'next'
import { DeadlinesAdminPage } from '@/components/admin/deadlines-admin-page'

export const metadata: Metadata = { title: 'Délais de promptitude' }

export default function DeadlinesPage() {
  return <DeadlinesAdminPage />
}
