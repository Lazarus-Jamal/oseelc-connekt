import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RegionsAdminPage } from '@/components/admin/regions-admin-page'

export const metadata: Metadata = { title: 'Régions sanitaires' }

export default async function RegionsPage() {
  const session = await getServerSession(authOptions)
  return <RegionsAdminPage role={session?.user?.role || ''} />
}
