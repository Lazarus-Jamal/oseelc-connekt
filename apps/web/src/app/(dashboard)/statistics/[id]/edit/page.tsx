import type { Metadata } from 'next'
import { StatSheetEditPage } from '@/components/statistics/stat-sheet-edit-page'

export const metadata: Metadata = { title: 'Continuer la saisie' }

export default function StatSheetEditRoutePage({ params }: { params: { id: string } }) {
  return <StatSheetEditPage id={params.id} />
}
