import type { Metadata } from 'next'
import { UsersAdminPage } from '@/components/admin/users-admin-page'

export const metadata: Metadata = { title: 'Gestion des utilisateurs' }

export default function UsersPage() {
  return <UsersAdminPage />
}
