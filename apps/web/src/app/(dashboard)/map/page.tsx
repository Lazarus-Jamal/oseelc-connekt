import type { Metadata } from 'next'
import { FacilitiesMap } from '@/components/map/facilities-map'

export const metadata: Metadata = { title: 'Carte géographique' }

export default function MapPage() {
  return <FacilitiesMap />
}
