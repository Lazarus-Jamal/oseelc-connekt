'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, FileCheck, TrendingUp, TrendingDown, Clock, Plus, AlertTriangle, CalendarClock } from 'lucide-react'
import { KpiCardComponent } from '@/components/ui/kpi-card'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency } from '@care-connekt/shared'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'

export function DataManagerDashboardPage() {
  const [stats,   setStats]   = useState<any>(null)
  const [report,  setReport]  = useState<any>(null)
  const [alerts,  setAlerts]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then((r) => r.json()),
      fetch('/api/reports/financial').then((r) => r.json()),
      fetch('/api/admin/deadlines/alerts').then((r) => r.json()),
    ]).then(([dashData, repData, alertData]) => {
      setStats(dashData.data)
      setReport(repData.data)
      setAlerts(alertData.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Statistiques de complétude
  const totalFacilities = stats?.totalFacilities || 0
  const totalRevenue = report?.summary?.totalRevenue || 0
  const totalExpense = report?.summary?.totalExpense || 0
  const revenueCount = report?.summary?.revenueCount || 0
  const expenseCount = report?.summary?.expenseCount || 0

  // Top formations par recettes
  const topFacilities = report?.revenue?.byFacility?.slice(0, 10) || []

  // Comparaison mensuelle
  const comparison = report?.comparison || []

  // Répartition par catégorie (dépenses)
  const expenseByCategory = report?.expense?.byCategory || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord — Data Manager"
        description="Analyse de la complétude et de la qualité des données"
        action={
          <Link
            href="/statistics/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Nouvelle fiche stat.
          </Link>
        }
      />

      {/* Deadline alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a: any) => (
            <div key={a.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
              a.isMissed
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300'
            }`}>
              {a.isMissed ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <CalendarClock className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <div>
                <span className="font-semibold">{a.isMissed ? 'Échéance dépassée' : `Échéance dans ${a.diffDays} jour(s)`}</span>
                {a.note && <span className="ml-2 opacity-75">— {a.note}</span>}
                <span className="ml-2 opacity-60">· Date limite : {new Date(a.dueDate).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCardComponent
          label="Formations sanitaires"
          value={totalFacilities}
          color="blue"
          icon={BarChart3}
        />
        <KpiCardComponent
          label="Décl. recettes validées"
          value={revenueCount}
          color="green"
          icon={TrendingUp}
        />
        <KpiCardComponent
          label="Décl. dépenses validées"
          value={expenseCount}
          color="orange"
          icon={TrendingDown}
        />
        <KpiCardComponent
          label="Décl. en attente"
          value={stats?.pendingValidations || 0}
          color={stats?.pendingValidations > 0 ? 'orange' : 'green'}
          icon={Clock}
        />
      </div>

      {/* Comparaison mensuelle Recettes vs Dépenses */}
      {comparison.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Évolution mensuelle — Recettes vs Dépenses</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={comparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="revenue" name="Recettes" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Dépenses" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solde net mensuel */}
        {comparison.length > 1 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Solde net mensuel</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={comparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="net" name="Solde net" stroke="#3b82f6" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Dépenses par catégorie */}
        {expenseByCategory.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Dépenses validées par catégorie</h2>
            <div className="space-y-2 overflow-y-auto max-h-52">
              {expenseByCategory.map((c: any, i: number) => {
                const pct = totalExpense > 0 ? Math.round((c.total / totalExpense) * 100) : 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-28 truncate flex-shrink-0">{c.category}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-10 text-right">{pct}%</span>
                    <span className="text-xs text-gray-400 w-24 text-right">{formatCurrency(c.total)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top formations — activité déclarative */}
      {topFacilities.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Activité par formation sanitaire</h2>
            <Link href="/reports" className="text-sm text-brand-600 hover:text-brand-700 font-medium">Rapport complet →</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Formation</th>
                <th className="px-4 py-3 text-right">Déclarations</th>
                <th className="px-4 py-3 text-right">Recettes validées</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {topFacilities.map((f: any, i: number) => (
                <tr key={f.facilityId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-gray-400 text-xs font-bold">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{f.name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{f.count}</td>
                  <td className="px-4 py-3 text-right font-semibold text-teal-600 dark:text-teal-400">{formatCurrency(f.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link href="/statistics" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 text-sm font-medium rounded-lg border border-brand-200 dark:border-brand-800 hover:bg-brand-100 transition">
          <BarChart3 className="w-4 h-4" /> Fiches statistiques
        </Link>
        <Link href="/reports" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 transition">
          Rapports financiers
        </Link>
        <Link href="/budget" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-sm font-medium rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition">
          <FileCheck className="w-4 h-4" /> Suivi budgétaire
        </Link>
      </div>
    </div>
  )
}
