import type { Metadata } from 'next'
import { BenchmarkingPage } from '@/components/benchmarking/benchmarking-page'

export const metadata: Metadata = { title: 'Comparaison inter-établissements' }

export default function BenchmarkingRoutePage() {
  return <BenchmarkingPage />
}
