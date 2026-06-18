import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Care2xKeysPage } from '@/components/admin/care2x-keys-page'

export const metadata: Metadata = { title: 'Clés API Care2x — Connexion logiciels' }

export default async function Page() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')
  if (session.user.role !== 'SUPER_ADMIN') redirect('/dashboard')

  return <Care2xKeysPage />
}
