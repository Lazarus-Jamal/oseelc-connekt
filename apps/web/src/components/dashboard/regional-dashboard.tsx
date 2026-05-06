'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, FileCheck, TrendingUp, TrendingDown, Clock, Scale } from 'lucide-react'
import { KpiCardComponent } from '@/components/ui/kpi-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency, formatDate, FACILITY_TYPE_LABELS } from '@care-connekt/shared'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export function RegionalDashboardPage() {
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

  const net = (data?.totalRegionalRevenue || 0) - (data?.totalRegionalExpense || 0)

  // Prépare les données pour le graphique par formation
  const facilityChartData = (data?.facilitiesStatus || []).map((f: any) => ({
    name: f.name.length > 14 ? f.name.slice(0, 12) + '…' : f.name,
    fullName: f.name,
    recettes: f.revenue || 0,
    dépenses: f.expense || 0,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord — Région"
        description="Suivi des centres et hôpitaux de votre région sanitaire"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCardComponent
          label="Recettes régionales (mois)"
          value={formatCurrency(data?.totalRegionalRevenue || 0)}
          color="green"
          icon={TrendingUp}
        />
        <KpiCardComponent
          label="Dépenses régionales (mois)"
          value={formatCurrency(data?.totalRegionalExpense || 0)}
          color="orange"
          icon={TrendingDown}
        />
        <KpiCardComponent
          label="Solde net (mois)"
          value={formatCurrency(net)}
          color={net >= 0 ? 'green' : 'red'}
          icon={Scale}
        />
        <KpiCardComponent
          label="En attente de révision"
          value={data?.pendingReview || 0}
          color={data?.pendingReview > 0 ? 'orange' : 'green'}
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCardComponent
          label="Formations sanitaires"
          value={data?.facilitiesCount || 0}
          color="blue"
          icon={Building2}
        />
        <KpiCardComponent
          label="Taux de conformité"
          value={`${data?.complianceRate || 0}%`}
          color={data?.complianceRate >= 80 ? 'green' : 'orange'}
          icon={FileCheck}
        />
      </div>

      {/* Graphique Recettes vs Dépenses par formation */}
      {facilityChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Recettes vs Dépenses par formation sanitaire</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={facilityChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend formatter={(v: string) => v === 'recettes' ? 'Recettes' : 'Dépenses'} />
              <Bar dataKey="recettes" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="dépenses" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tableau des formations sanitaires */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">État des formations sanitaires</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 text-left">Formation</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Recettes (mois)</th>
                <th className="px-4 py-3 text-right">Dépenses (mois)</th>
                <th className="px-4 py-3 text-right">Solde</th>
                <th className="px-4 py-3 text-center">Dernière décl.</th>
                <th className="px-4 py-3 text-right">En attente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(data?.facilitiesStatus || []).map((f: any) => {
                const solde = (f.revenue || 0) - (f.expense || 0)
                return (
                  <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{f.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {FACILITY_TYPE_LABELS[f.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-teal-600 dark:text-teal-400">
                      {formatCurrency(f.revenue || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-orange-600 dark:text-orange-400">
                      {formatCurrency(f.expense || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={solde >= 0 ? 'text-green-600' : 'text-red-500'}>{formatCurrency(solde)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {f.declarations?.[0] ? (
                        <StatusBadge status={f.declarations[0].status} />
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {f._count?.declarations > 0 ? (
                        <span className="text-xs font-semibold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                          {f._count.declarations}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">0</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {(!data?.facilitiesStatus || data.facilitiesStatus.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Aucune donnée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link href="/declarations" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-sm font-medium rounded-lg border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition">
          <TrendingUp className="w-4 h-4" /> Déclarations de recettes
        </Link>
        <Link href="/expenses" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-sm font-medium rounded-lg border border-orange-200 dark:border-orange-800 hover:bg-orange-100 transition">
          <TrendingDown className="w-4 h-4" /> Dépenses
        </Link>
      </div>
    </div>
  )
}
