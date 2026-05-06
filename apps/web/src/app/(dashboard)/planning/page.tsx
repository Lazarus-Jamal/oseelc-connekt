import type { Metadata } from 'next'
import { PlanningPage } from '@/components/planning/planning-page'

export const metadata: Metadata = { title: 'Planning & Agenda' }

export default function PlanningRoutePage() {
  return <PlanningPage />
}
