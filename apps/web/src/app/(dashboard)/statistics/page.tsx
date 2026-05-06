import type { Metadata } from 'next'
import { StatisticsListPage } from '@/components/statistics/statistics-list-page'

export const metadata: Metadata = { title: 'Statistiques sanitaires' }

export default function StatisticsPage() {
  return <StatisticsListPage />
}
