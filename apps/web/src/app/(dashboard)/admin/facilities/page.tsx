import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { FacilitiesAdminPage } from '@/components/admin/facilities-admin-page'
import { authOptions } from '@/lib/auth'

export const metadata: Metadata = { title: 'Gestion des formations sanitaires' }

export default async function FacilitiesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  return <FacilitiesAdminPage role={session.user.role} />
}
