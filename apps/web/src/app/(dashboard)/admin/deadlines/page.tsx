import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { DeadlinesAdminPage } from '@/components/admin/deadlines-admin-page'
import { authOptions } from '@/lib/auth'

export const metadata: Metadata = { title: 'Délais de promptitude' }

export default async function DeadlinesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  return <DeadlinesAdminPage role={session.user.role} />
}
