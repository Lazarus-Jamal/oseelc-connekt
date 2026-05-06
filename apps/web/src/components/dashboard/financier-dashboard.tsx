'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, Plus, Scale } from 'lucide-react'
import { KpiCardComponent } from '@/components/ui/kpi-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency, formatDate } from '@care-connekt/shared'

export function FinancierDashboardPage() {
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

  const net = (data?.totalRevenueMTD || 0) - (data?.totalExpenseMTD || 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord — Financier"
        description="Suivi de vos déclarations de recettes et dépenses"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/declarations/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Nouvelle déclaration
            </Link>
            <Link
              href="/expenses/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Nouvelle dépense
            </Link>
          </div>
        }
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
          value={formatCurrency(net)}
          color={net >= 0 ? 'green' : 'red'}
          icon={Scale}
        />
      </div>

      {/* KPIs statuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCardComponent
          label="En attente de validation"
          value={data?.pendingDeclarations || 0}
          color="orange"
          icon={Clock}
        />
        <KpiCardComponent
          label="Déclarations validées"
          value={data?.validatedDeclarations || 0}
          color="green"
          icon={CheckCircle2}
        />
        <KpiCardComponent
          label="Déclarations rejetées"
          value={data?.rejectedDeclarations || 0}
          color={data?.rejectedDeclarations > 0 ? 'red' : 'green'}
          icon={XCircle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Déclarations de recettes récentes */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Déclarations récentes</h2>
            <Link href="/declarations" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              Voir tout →
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {(data?.recentDeclarations || []).map((d: any) => (
              <Link
                key={d.id}
                href={`/declarations/${d.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-brand-600">{d.reference}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(d.periodStart)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">{formatCurrency(d.totalAmount)}</p>
                  <StatusBadge status={d.status} />
                </div>
              </Link>
            ))}
            {(!data?.recentDeclarations || data.recentDeclarations.length === 0) && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                Aucune déclaration. <Link href="/declarations/new" className="text-brand-600 hover:underline">Créer la première</Link>
              </div>
            )}
          </div>
        </div>

        {/* Dépenses récentes */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Dépenses récentes</h2>
            <Link href="/expenses" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              Voir tout →
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {(data?.recentExpenses || []).map((d: any) => (
              <Link
                key={d.id}
                href={`/expenses/${d.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-orange-600">{d.reference}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(d.periodStart)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(d.totalAmount)}</p>
                  <StatusBadge status={d.status} />
                </div>
              </Link>
            ))}
            {(!data?.recentExpenses || data.recentExpenses.length === 0) && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                Aucune dépense. <Link href="/expenses/new" className="text-orange-600 hover:underline">Créer la première</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
