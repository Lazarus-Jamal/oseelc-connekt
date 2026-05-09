import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { UsersAdminPage } from '@/components/admin/users-admin-page'
import { authOptions } from '@/lib/auth'

export const metadata: Metadata = { title: 'Gestion des utilisateurs' }

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  return (
    <div className="space-y-4">
      <UsersAdminPage role={session.user.role} currentUserId={session.user.id} />
    </div>
  )
}
