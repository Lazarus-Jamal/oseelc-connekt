'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Clock, Scale, BarChart3, FileText } from 'lucide-react'
import { KpiCardComponent } from '@/components/ui/kpi-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency, formatDate } from '@care-connekt/shared'

export function FacilityChiefDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => { setData(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord — Chef de centre"
        description="Suivi financier et statistique de votre formation sanitaire"
      />

      {/* KPIs financiers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCardComponent
          label="Recettes ce mois"
          value={formatCurrency(data?.totalRevenueMTD || 0)}
          color="green"
          icon={TrendingUp}
        />
        <KpiCardComponent
          label="Dépenses ce mois"
          value={formatCurrency(data?.totalExpenseMTD || 0)}
          color="orange"
          icon={TrendingDown}
        />
        <KpiCardComponent
          label="Solde net ce mois"
          value={formatCurrency((data?.totalRevenueMTD || 0) - (data?.totalExpenseMTD || 0))}
          color={(data?.totalRevenueMTD || 0) >= (data?.totalExpenseMTD || 0) ? 'green' : 'red'}
          icon={Scale}
        />
      </div>

      {/* KPIs statuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCardComponent
          label="Déclarations en attente"
          value={data?.pendingDeclarations || 0}
          color={data?.pendingDeclarations > 0 ? 'orange' : 'green'}
          icon={Clock}
        />
        <KpiCardComponent
          label="Validées"
          value={data?.validatedDeclarations || 0}
          color="green"
          icon={FileText}
        />
        <KpiCardComponent
          label="Rejetées"
          value={data?.rejectedDeclarations || 0}
          color={data?.rejectedDeclarations > 0 ? 'red' : 'green'}
          icon={BarChart3}
        />
      </div>

      {/* Vue d'ensemble des déclarations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Dernières déclarations</h2>
            <Link href="/declarations" className="text-sm text-brand-600 hover:text-brand-700 font-medium">Voir tout →</Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {(data?.recentDeclarations || []).map((d: any) => (
              <Link
                key={d.id}
                href={`/declarations/${d.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{d.reference}</p>
                  <p className="text-xs text-gray-500">{d.submittedAt ? formatDate(d.submittedAt) : '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{formatCurrency(d.totalAmount)}</span>
                  <StatusBadge status={d.status} />
                </div>
              </Link>
            ))}
            {(!data?.recentDeclarations || data.recentDeclarations.length === 0) && (
              <p className="px-5 py-6 text-center text-sm text-gray-400">Aucune déclaration</p>
            )}
          </div>
        </div>

        {/* Liens rapides */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Actions rapides</h2>
          <div className="space-y-2">
            <Link href="/declarations" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Réviser les déclarations</p>
                <p className="text-xs text-gray-500">{data?.pendingDeclarations || 0} en attente</p>
              </div>
            </Link>
            <Link href="/expenses" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Dépenses</p>
                <p className="text-xs text-gray-500">Voir les déclarations de dépenses</p>
              </div>
            </Link>
            <Link href="/statistics" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Fiches statistiques</p>
                <p className="text-xs text-gray-500">Suivre la complétude</p>
              </div>
            </Link>
            <Link href="/reports" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Rapports financiers</p>
                <p className="text-xs text-gray-500">Exports PDF et Excel</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
