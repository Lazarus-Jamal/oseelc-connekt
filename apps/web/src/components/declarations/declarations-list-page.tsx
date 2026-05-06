'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, MapPin, Building2, Calendar, X } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency, formatDate, PERIOD_TYPE_LABELS, MONTHS_FR } from '@care-connekt/shared'

interface Declaration {
  id: string
  reference: string
  periodType: string
  periodStart: string
  periodEnd: string
  totalAmount: number
  status: string
  submittedAt?: string | null
  createdAt: string
  facility: { id: string; name: string; type: string; region?: { id: string; name: string } }
  submittedBy: { name: string }
}

const SCOPE_SHOW_REGION   = ['SUPER_ADMIN', 'DIRECTION']
const SCOPE_SHOW_FACILITY = ['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR']

export function DeclarationsListPage({ userRole = '', userRegionId }: { userRole?: string; userRegionId?: string | null }) {
  const router = useRouter()

  const role = userRole
  const showRegionFilter   = SCOPE_SHOW_REGION.includes(role)
  const showFacilityFilter = SCOPE_SHOW_FACILITY.includes(role)

  // Filters
  const [search,     setSearch]     = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [year,       setYear]       = useState<string>('')
  const [month,      setMonth]      = useState<string>('')
  const [regionId,   setRegionId]   = useState('')
  const [facilityId, setFacilityId] = useState('')

  // Options
  const [regions,    setRegions]    = useState<{ id: string; name: string }[]>([])
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([])

  // Data
  const [declarations, setDeclarations] = useState<Declaration[]>([])
  const [loading,      setLoading]      = useState(true)

  // Load regions
  useEffect(() => {
    if (!showRegionFilter) return
    fetch('/api/admin/regions?limit=100').then((r) => r.json()).then((d) => {
      if (d.success) setRegions(d.data || [])
    })
  }, [showRegionFilter])

  // Load facilities based on selected region (or user region for REGIONAL_DIRECTOR)
  useEffect(() => {
    if (!showFacilityFilter) return
    const params = new URLSearchParams({ limit: '100' })
    if (regionId) params.set('regionId', regionId)
    else if (role === 'REGIONAL_DIRECTOR' && userRegionId) {
      params.set('regionId', userRegionId)
    }
    fetch(`/api/facilities?${params}`).then((r) => r.json()).then((d) => {
      if (d.success) setFacilities(d.data || [])
    })
    setFacilityId('')
  }, [regionId, showFacilityFilter, role, userRegionId])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ declarationType: 'REVENUE' })
    if (statusFilter) params.set('status', statusFilter)
    if (facilityId)   params.set('facilityId', facilityId)
    if (regionId && !facilityId) params.set('regionId', regionId)
    if (year) {
      const y = Number(year)
      const m = month ? Number(month) : null
      if (m) {
        const from = new Date(y, m - 1, 1).toISOString()
        const to   = new Date(y, m, 0, 23, 59, 59).toISOString()
        params.set('from', from); params.set('to', to)
      } else {
        params.set('from', new Date(y, 0, 1).toISOString())
        params.set('to',   new Date(y, 11, 31, 23, 59, 59).toISOString())
      }
    }
    fetch(`/api/declarations?${params}`)
      .then((r) => r.json())
      .then((d) => setDeclarations(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [statusFilter, facilityId, regionId, year, month])

  useEffect(() => { load() }, [load])

  const hasActiveFilters = !!(statusFilter || year || regionId || facilityId)

  const clearFilters = () => {
    setStatus(''); setYear(''); setMonth(''); setRegionId(''); setFacilityId('')
  }

  const filtered = declarations.filter((d) =>
    !search ||
    d.reference.toLowerCase().includes(search.toLowerCase()) ||
    d.facility.name.toLowerCase().includes(search.toLowerCase())
  )

  const years = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i))

  const columns: Column<Declaration>[] = [
    {
      key: 'reference',
      header: 'Référence',
      cell: (row) => <span className="font-mono text-xs font-semibold text-gray-900 dark:text-white">{row.reference}</span>,
    },
    {
      key: 'facility',
      header: 'Formation sanitaire',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">{row.facility.name}</p>
          <p className="text-xs text-gray-400">
            {row.facility.type === 'HOSPITAL' ? 'Hôpital' : 'Centre de Santé'}
            {row.facility.region && <span className="ml-1">· {row.facility.region.name}</span>}
          </p>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Période',
      cell: (row) => (
        <div>
          <p className="text-sm text-gray-900 dark:text-white">{formatDate(row.periodStart)}</p>
          <p className="text-xs text-gray-500">{PERIOD_TYPE_LABELS[row.periodType]}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Montant',
      cell: (row) => <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(row.totalAmount)}</span>,
      className: 'text-right',
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (row) => <StatusBadge status={row.status} />,
      className: 'text-center',
    },
    {
      key: 'submittedAt',
      header: 'Date',
      cell: (row) => (
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {row.submittedAt ? formatDate(row.submittedAt) : formatDate(row.createdAt)}
          </p>
          <p className="text-xs text-gray-400">{row.submittedAt ? 'Soumis le' : 'Créé le'}</p>
        </div>
      ),
    },
  ]

  const canCreate = ['FINANCIER', 'SUPER_ADMIN'].includes(role)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Déclarations de recettes"
        description="Suivi des déclarations par formation sanitaire"
        action={canCreate ? (
          <Link href="/declarations/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition">
            <Plus className="w-4 h-4" /> Nouvelle déclaration
          </Link>
        ) : undefined}
      />

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
        {/* Ligne 1 : recherche + statut */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Référence, centre…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="">Tous les statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="SUBMITTED">Soumis</option>
            <option value="REVIEWED">Examiné</option>
            <option value="VALIDATED">Validé</option>
            <option value="REJECTED">Rejeté</option>
          </select>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <X className="w-3.5 h-3.5" /> Réinitialiser
            </button>
          )}
        </div>

        {/* Ligne 2 : période + région + centre */}
        <div className="flex flex-wrap gap-3">
          {/* Période */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select value={year} onChange={(e) => { setYear(e.target.value); if (!e.target.value) setMonth('') }}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
              <option value="">Toutes les années</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {year && (
              <select value={month} onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="">Tous les mois</option>
                {MONTHS_FR.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
              </select>
            )}
          </div>

          {/* Région */}
          {showRegionFilter && regions.length > 0 && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select value={regionId} onChange={(e) => setRegionId(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="">Toutes les régions</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}

          {/* Centre */}
          {showFacilityFilter && facilities.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="">Tous les centres</option>
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Résumé des filtres actifs */}
        {hasActiveFilters && (
          <p className="text-xs text-gray-400">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''} · filtres actifs
          </p>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={loading}
        emptyMessage="Aucune déclaration trouvée"
        onRowClick={(row) => router.push(`/declarations/${row.id}`)}
      />
    </div>
  )
}
