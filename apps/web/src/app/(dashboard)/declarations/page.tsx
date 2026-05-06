import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DeclarationsListPage } from '@/components/declarations/declarations-list-page'

export const metadata: Metadata = { title: 'Déclarations de recettes' }

export default async function DeclarationsPage() {
  const session = await getServerSession(authOptions)
  const userRole = (session?.user?.role ?? '') as string
  const userRegionId = ((session?.user as any)?.regionId ?? null) as string | null
  return <DeclarationsListPage userRole={userRole} userRegionId={userRegionId} />
}
