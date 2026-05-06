import type { Metadata } from 'next'
import { StatSheetDetailPage } from '@/components/statistics/stat-sheet-detail-page'

export const metadata: Metadata = { title: 'Fiche statistique' }

export default async function StatSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StatSheetDetailPage id={id} />
}
