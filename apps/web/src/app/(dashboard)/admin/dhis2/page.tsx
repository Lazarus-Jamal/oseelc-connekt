import type { Metadata } from 'next'
import { DHIS2Page } from '@/components/admin/dhis2-page'

export const metadata: Metadata = { title: 'Intégration DHIS2' }

export default function DHIS2RoutePage() {
  return <DHIS2Page />
}
