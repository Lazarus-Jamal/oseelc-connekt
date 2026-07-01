import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { PermissionsAdminPage } from '@/components/admin/permissions-admin-page'

export const metadata = { title: 'Gestion des droits' }

export default async function Page() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/dashboard')
  return <PermissionsAdminPage />
}
