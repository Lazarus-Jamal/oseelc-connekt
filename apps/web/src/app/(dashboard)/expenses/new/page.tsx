import type { Metadata } from 'next'
import { ExpenseFormPage } from '@/components/expenses/expense-form-page'

export const metadata: Metadata = { title: 'Nouvelle dépense' }

export default function NewExpensePage() {
  return <ExpenseFormPage />
}
