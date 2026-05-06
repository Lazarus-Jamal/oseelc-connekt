import type { Metadata } from 'next'
import { IndicatorsAdminPage } from '@/components/admin/indicators-admin-page'

export const metadata: Metadata = { title: 'Indicateurs statistiques' }

export default function IndicatorsPage() {
  return <IndicatorsAdminPage />
}
