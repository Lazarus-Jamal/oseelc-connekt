import type { Metadata } from 'next'
import { ProfilePage } from '@/components/profile/profile-page'

export const metadata: Metadata = { title: 'Mon profil' }

export default function ProfilePageRoute() {
  return <ProfilePage />
}
