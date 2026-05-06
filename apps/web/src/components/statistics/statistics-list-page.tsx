'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Pencil } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageHeader } from '@/components/ui/page-header'
import { formatPercentage, getMonthLabel } from '@care-connekt/shared'

interface StatSheet {
  id: string
  reference: string
  month: number
  year: number
  status: string
  completeness: number | null
  submittedAt: string | null
  facility: { name: string; type: string }
  dataManager: { name: string }
}

export function StatisticsListPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [sheets, setSheets] = useState<StatSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const role = session?.user?.role
  const canCreate = ['DATA_MANAGER', 'SUPER_ADMIN'].includes(role || '')

  useEffect(() => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    fetch(`/api/statistics?${params}`)
      .then((r) => r.json())
      .then((d) => { setSheets(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [statusFilter])

  const columns: Column<StatSheet>[] = [
    { key: 'reference', header: 'Référence', cell: (row) => <span className="font-mono text-xs font-semibold">{row.reference}</span> },
    {
      key: 'facility',
      header: 'Formation sanitaire',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">{row.facility.name}</p>
          <p className="text-xs text-gray-500">{row.facility.type === 'HOSPITAL' ? 'Hôpital' : 'Centre de Santé'}</p>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Période',
      cell: (row) => <span className="text-sm">{getMonthLabel(row.month, row.year)}</span>,
    },
    {
      key: 'completeness',
      header: 'Complétude',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 w-20">
            <div
              className={`h-1.5 rounded-full ${(row.completeness || 0) >= 80 ? 'bg-green-500' : (row.completeness || 0) >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
              style={{ width: `${row.completeness || 0}%` }}
            />
          </div>
          <span className="text-xs font-medium">{formatPercentage(row.completeness || 0)}</span>
        </div>
      ),
    },
    { key: 'status', header: 'Statut', cell: (row) => <StatusBadge status={row.status} type="stat" />, className: 'text-center' },
    { key: 'manager', header: 'Responsable', cell: (row) => <span className="text-sm text-gray-500">{row.dataManager.name}</span> },
    {
      key: 'actions',
      header: '',
      cell: (row) =>
        row.status === 'DRAFT' && canCreate ? (
          <Link
            href={`/statistics/${row.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-700 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition"
          >
            <Pencil className="w-3 h-3" />
            Continuer
          </Link>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Statistiques sanitaires"
        description="Suivi des fiches de collecte de données mensuelles"
        action={
          canCreate ? (
            <Link
              href="/statistics/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Nouvelle fiche
            </Link>
          ) : undefined
        }
      />

      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="SUBMITTED">Soumis</option>
          <option value="VALIDATED">Validé</option>
          <option value="REJECTED">Rejeté</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={sheets}
        isLoading={loading}
        emptyMessage="Aucune fiche statistique trouvée"
        onRowClick={(row) => router.push(`/statistics/${row.id}`)}
      />
    </div>
  )
}
