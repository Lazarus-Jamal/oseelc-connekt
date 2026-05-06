import type { Metadata } from 'next'
import { StatImportPage } from '@/components/statistics/stat-import-page'

export const metadata: Metadata = { title: 'Importation en masse — Statistiques' }

export default function StatImportRoutePage() {
  return <StatImportPage />
}
