'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Building2, FileCheck, TrendingUp, TrendingDown, Scale, AlertCircle, RefreshCw, Calendar } from 'lucide-react'
import { KpiCardComponent } from '@/components/ui/kpi-card'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency } from '@care-connekt/shared'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const REGION_COLORS = ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

type Period = 'daily' | 'monthly' | 'annual' | 'custom'

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'daily',   label: 'Journalier'    },
  { key: 'monthly', label: 'Mensuel'       },
  { key: 'annual',  label: 'Annuel'        },
  { key: 'custom',  label: 'Personnalisé'  },
]

function getPeriodLabel(period: Period, from: string, to: string): string {
  const now = new Date()
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString('fr-FR', opts)

  if (period === 'daily')
    return fmt(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  if (period === 'annual')
    return `Année ${now.getFullYear()}`
  if (period === 'custom' && from) {
    const fmtShort = (s: string) =>
      fmt(new Date(s), { day: 'numeric', month: 'short', year: 'numeric' })
    return to ? `${fmtShort(from)} → ${fmtShort(to)}` : `Depuis le ${fmtShort(from)}`
  }
  return fmt(now, { month: 'long', year: 'numeric' })
}

export function DirectionDashboardPage() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [period,     setPeriod]     = useState<Period>('monthly')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  // The from/to actually sent to the API (applied on button click for custom)
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo,   setAppliedTo]   = useState('')

  const fetchData = useCallback((p: Period, from = '', to = '') => {
    setLoading(true)
    const params = new URLSearchParams({ period: p })
    if (p === 'custom') {
      if (from) params.set('from', from)
      if (to)   params.set('to',   to)
    }
    fetch(`/api/dashboard?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d.data ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Re-fetch when non-custom period changes
  useEffect(() => {
    if (period !== 'custom') fetchData(period)
  }, [period, fetchData])

  const applyCustom = () => {
    setAppliedFrom(customFrom)
    setAppliedTo(customTo)
    fetchData('custom', customFrom, customTo)
  }

  const periodLabel = getPeriodLabel(
    period,
    period === 'custom' ? appliedFrom : '',
    period === 'custom' ? appliedTo   : ''
  )

  const net = (data?.totalNationalRevenue || 0) - (data?.totalNationalExpense || 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord — Direction"
        description="Vue nationale consolidée de l'Oeuvre de Santé"
      />

      {/* ── Barre de filtre ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            Période :
          </div>

          {/* Pills de période */}
          <div className="flex gap-2 flex-wrap">
            {PERIOD_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  period === key
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-300 hover:text-brand-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Saisie de dates pour la période personnalisée */}
          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 ml-1">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Du</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Au</label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                onClick={applyCustom}
                disabled={!customFrom}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Appliquer
              </button>
            </div>
          )}

          {/* Label période courante + bouton rafraîchir */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400 italic capitalize">{periodLabel}</span>
            {period !== 'custom' && (
              <button
                onClick={() => fetchData(period)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition"
                title="Actualiser"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPIs principaux */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCardComponent
              label="Recettes nationales"
              value={formatCurrency(data?.totalNationalRevenue || 0)}
              color="green"
              icon={TrendingUp}
            />
            <KpiCardComponent
              label="Dépenses nationales"
              value={formatCurrency(data?.totalNationalExpense || 0)}
              color="orange"
              icon={TrendingDown}
            />
            <KpiCardComponent
              label="Solde net"
              value={formatCurrency(net)}
              color={net >= 0 ? 'green' : 'red'}
              icon={Scale}
            />
            <KpiCardComponent
              label="Validations en attente"
              value={data?.pendingValidations || 0}
              color={data?.pendingValidations > 0 ? 'orange' : 'green'}
              icon={FileCheck}
            />
          </div>

          {/* KPIs secondaires */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiCardComponent
              label="Formations sanitaires actives"
              value={data?.totalFacilities || 0}
              color="blue"
              icon={Building2}
            />
            <KpiCardComponent
              label="Régions sanitaires"
              value={data?.regionsOverview?.length || 0}
              color="purple"
              icon={AlertCircle}
            />
          </div>

          {/* Recettes vs Dépenses par région */}
          {(data?.regionsOverview?.length || 0) > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Recettes vs Dépenses par région</h2>
              <p className="text-xs text-gray-400 mb-4 italic capitalize">{periodLabel}</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.regionsOverview} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="regionName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="totalRevenue" name="Recettes" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalExpense" name="Dépenses" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tableau régions */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Vue par région sanitaire</h2>
              <span className="text-xs text-gray-400 italic capitalize">{periodLabel}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 text-left font-semibold">Région</th>
                    <th className="px-4 py-3 text-right font-semibold">Centres</th>
                    <th className="px-4 py-3 text-right font-semibold">Recettes</th>
                    <th className="px-4 py-3 text-right font-semibold">Dépenses</th>
                    <th className="px-4 py-3 text-right font-semibold">Solde net</th>
                    <th className="px-4 py-3 text-right font-semibold">Taux décl.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(data?.regionsOverview || []).map((r: any) => (
                    <tr key={r.regionId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.regionName}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{r.facilitiesCount}</td>
                      <td className="px-4 py-3 text-right font-medium text-teal-600 dark:text-teal-400">{formatCurrency(r.totalRevenue)}</td>
                      <td className="px-4 py-3 text-right font-medium text-orange-600 dark:text-orange-400">{formatCurrency(r.totalExpense)}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span className={r.netBalance >= 0 ? 'text-green-600' : 'text-red-500'}>
                          {formatCurrency(r.netBalance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${r.declarationRate >= 80 ? 'text-green-600' : r.declarationRate >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                          {r.declarationRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!data?.regionsOverview || data.regionsOverview.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        Aucune donnée pour cette période
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top formations + donut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(data?.facilitiesPerf?.length || 0) > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Top formations — Recettes</h2>
                  <p className="text-xs text-gray-400 mt-0.5 italic capitalize">{periodLabel}</p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.facilitiesPerf.slice(0, 8).map((f: any, i: number) => (
                    <div key={f.id} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.name}</p>
                        <p className="text-xs text-gray-400">{f.region} · {f.type === 'HOSPITAL' ? 'Hôpital' : 'Centre'}</p>
                      </div>
                      <span className="text-sm font-semibold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                        {formatCurrency(f.totalRevenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(data?.regionsOverview?.length || 0) > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Répartition des recettes</h2>
                <p className="text-xs text-gray-400 mb-3 italic capitalize">{periodLabel}</p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.regionsOverview}
                      dataKey="totalRevenue"
                      nameKey="regionName"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      label={({ name, percent }: any) => percent > 0.03 ? `${name}: ${Math.round(percent * 100)}%` : ''}
                      labelLine={false}
                    >
                      {data.regionsOverview.map((_: any, index: number) => (
                        <Cell key={index} fill={REGION_COLORS[index % REGION_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-3">
            <Link href="/declarations" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-sm font-medium rounded-lg border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition">
              <TrendingUp className="w-4 h-4" /> Toutes les déclarations
            </Link>
            <Link href="/expenses" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-sm font-medium rounded-lg border border-orange-200 dark:border-orange-800 hover:bg-orange-100 transition">
              <TrendingDown className="w-4 h-4" /> Toutes les dépenses
            </Link>
            <Link href="/reports" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 transition">
              Rapport financier
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
