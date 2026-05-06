'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, MapPin, Building2, Calendar, X, TrendingDown } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency, formatDate, PERIOD_TYPE_LABELS, MONTHS_FR } from '@care-connekt/shared'

interface Expense {
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

export function ExpenseListPage({ userRole = '', userRegionId }: { userRole?: string; userRegionId?: string | null }) {
  const router = useRouter()

  const role = userRole
  const showRegionFilter   = SCOPE_SHOW_REGION.includes(role)
  const showFacilityFilter = SCOPE_SHOW_FACILITY.includes(role)

  // Filters
  const [search,       setSearch]     = useState('')
  const [statusFilter, setStatus]     = useState('')
  const [year,         setYear]       = useState<string>('')
  const [month,        setMonth]      = useState<string>('')
  const [regionId,     setRegionId]   = useState('')
  const [facilityId,   setFacilityId] = useState('')

  // Options
  const [regions,    setRegions]    = useState<{ id: string; name: string }[]>([])
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([])

  // Data
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading,  setLoading]  = useState(true)

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
    const params = new URLSearchParams({ declarationType: 'EXPENSE' })
    if (statusFilter) params.set('status', statusFilter)
    if (facilityId)   params.set('facilityId', facilityId)
    if (regionId && !facilityId) params.set('regionId', regionId)
    if (year) {
      const y = Number(year)
      const m = month ? Number(month) : null
      if (m) {
        params.set('from', new Date(y, m - 1, 1).toISOString())
        params.set('to',   new Date(y, m, 0, 23, 59, 59).toISOString())
      } else {
        params.set('from', new Date(y, 0, 1).toISOString())
        params.set('to',   new Date(y, 11, 31, 23, 59, 59).toISOString())
      }
    }
    fetch(`/api/declarations?${params}`)
      .then((r) => r.json())
      .then((d) => setExpenses(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [statusFilter, facilityId, regionId, year, month])

  useEffect(() => { load() }, [load])

  const hasActiveFilters = !!(statusFilter || year || regionId || facilityId)

  const clearFilters = () => {
    setStatus(''); setYear(''); setMonth(''); setRegionId(''); setFacilityId('')
  }

  const filtered = expenses.filter((d) =>
    !search ||
    d.reference.toLowerCase().includes(search.toLowerCase()) ||
    d.facility.name.toLowerCase().includes(search.toLowerCase())
  )

  const years = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i))

  const canCreate = ['FINANCIER', 'SUPER_ADMIN'].includes(role)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Déclarations de dépenses"
        description="Suivi des dépenses par formation sanitaire"
        action={canCreate ? (
          <Link href="/expenses/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition">
            <Plus className="w-4 h-4" /> Nouvelle dépense
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
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400">
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
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">Toutes les années</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {year && (
              <select value={month} onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400">
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
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400">
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
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400">
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

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Référence</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Formation sanitaire</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Période</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((d) => (
                <tr key={d.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition cursor-pointer"
                  onClick={() => router.push(`/expenses/${d.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                        <TrendingDown className="w-3.5 h-3.5 text-orange-600" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-gray-900 dark:text-white">{d.reference}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{d.facility.name}</p>
                    <p className="text-xs text-gray-400">
                      {d.facility.type === 'HOSPITAL' ? 'Hôpital' : 'Centre de Santé'}
                      {d.facility.region && <span className="ml-1">· {d.facility.region.name}</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{PERIOD_TYPE_LABELS[d.periodType]}</span>
                    <span className="ml-2">{formatDate(d.periodStart)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(d.totalAmount)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {d.submittedAt ? formatDate(d.submittedAt) : formatDate(d.createdAt)}
                    </p>
                    <p className="text-xs text-gray-400">{d.submittedAt ? 'Soumis le' : 'Créé le'}</p>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Aucune déclaration de dépenses trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
