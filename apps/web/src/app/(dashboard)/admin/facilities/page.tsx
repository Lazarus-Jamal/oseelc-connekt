import type { Metadata } from 'next'
import { FacilitiesAdminPage } from '@/components/admin/facilities-admin-page'

export const metadata: Metadata = { title: 'Gestion des formations sanitaires' }

export default function FacilitiesPage() {
  return <FacilitiesAdminPage />
}
