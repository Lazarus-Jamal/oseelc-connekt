import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ExpenseListPage } from '@/components/expenses/expense-list-page'

export const metadata: Metadata = { title: 'Déclarations de dépenses' }

export default async function ExpensesPage() {
  const session = await getServerSession(authOptions)
  const userRole = (session?.user?.role ?? '') as string
  const userRegionId = ((session?.user as any)?.regionId ?? null) as string | null
  return <ExpenseListPage userRole={userRole} userRegionId={userRegionId} />
}
