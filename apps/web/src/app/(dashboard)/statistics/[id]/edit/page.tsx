import type { Metadata } from 'next'
import { StatSheetEditPage } from '@/components/statistics/stat-sheet-edit-page'

export const metadata: Metadata = { title: 'Continuer la saisie' }

export default async function StatSheetEditRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StatSheetEditPage id={id} />
}
