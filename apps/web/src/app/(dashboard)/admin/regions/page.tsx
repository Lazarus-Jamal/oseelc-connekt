import type { Metadata } from 'next'
import { RegionsAdminPage } from '@/components/admin/regions-admin-page'

export const metadata: Metadata = { title: 'Régions sanitaires' }

export default function RegionsPage() {
  return <RegionsAdminPage />
}
