import { ExpenseFormPage } from '@/components/expenses/expense-form-page'

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ExpenseFormPage editId={id} />
}
