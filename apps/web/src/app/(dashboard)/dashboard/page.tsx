import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { FinancierDashboardPage } from '@/components/dashboard/financier-dashboard'
import { FacilityChiefDashboardPage } from '@/components/dashboard/facility-chief-dashboard'
import { RegionalDashboardPage } from '@/components/dashboard/regional-dashboard'
import { DirectionDashboardPage } from '@/components/dashboard/direction-dashboard'
import { DataManagerDashboardPage } from '@/components/dashboard/data-manager-dashboard'

export const metadata: Metadata = { title: 'Tableau de bord' }

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role

  if (role === 'FINANCIER') return <FinancierDashboardPage />
  if (role === 'FACILITY_CHIEF') return <FacilityChiefDashboardPage />
  if (role === 'REGIONAL_DIRECTOR') return <RegionalDashboardPage />
  if (role === 'DIRECTION' || role === 'SUPER_ADMIN' || role === 'CONTROLEUR') return <DirectionDashboardPage />
  if (role === 'REGIONAL_DIRECTOR' || role === 'CONTROLEUR_REGIONAL') return <RegionalDashboardPage />
  if (role === 'DATA_ADMIN' || role === 'DATA_MANAGER') return <DataManagerDashboardPage />
  if (role === 'CAISSIER') return <FinancierDashboardPage />

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Rôle non reconnu. Contactez l&apos;administrateur.</p>
    </div>
  )
}
