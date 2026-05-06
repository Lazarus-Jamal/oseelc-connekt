import type { Metadata } from 'next'
import { StatSheetFormPage } from '@/components/statistics/stat-sheet-form-page'

export const metadata: Metadata = { title: 'Nouvelle fiche statistique' }

export default function NewStatSheetPage() {
  return <StatSheetFormPage />
}
