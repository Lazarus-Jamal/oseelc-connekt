import type { Metadata } from 'next'
import { ExpenseDetailPage } from '@/components/expenses/expense-detail-page'

export const metadata: Metadata = { title: 'Détail de la dépense' }

export default async function ExpenseDetailPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ExpenseDetailPage id={id} />
}
