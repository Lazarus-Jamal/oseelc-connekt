import type { Metadata } from 'next'
import { BudgetPage } from '@/components/budget/budget-page'

export const metadata: Metadata = { title: 'Suivi budgétaire' }

export default function BudgetPageRoute() {
  return <BudgetPage />
}
