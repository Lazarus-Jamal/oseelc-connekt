import type { Metadata } from 'next'
import { ConfigAdminPage } from '@/components/admin/config-admin-page'

export const metadata: Metadata = { title: 'Configuration' }

export default function ConfigPage() {
  return <ConfigAdminPage />
}
