import type { Metadata } from 'next'
import { DeclarationDetailPage } from '@/components/declarations/declaration-detail-page'

export const metadata: Metadata = { title: 'Détail déclaration' }

export default async function DeclarationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DeclarationDetailPage id={id} />
}
