'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, ComposedChart, Line,
} from 'recharts'
import {
  Trophy, TrendingUp, TrendingDown, Building2, RefreshCw,
  Filter, BarChart2, Activity,
} from 'lucide-react'
import { formatCurrency } from '@care-connekt/shared'

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const TYPE_LABELS: Record<string, string> = { HOSPITAL: 'Hôpital', HEALTH_CENTER: 'Centre de santé' }
const RANK_COLORS = ['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4']

// ── Linear regression y = slope·x + intercept ───────────────────────────────
function linearRegression(pts: { x: number; y: number }[]) {
  const n = pts.length
  if (n < 2) return { slope: 0, intercept: pts[0]?.y ?? 0, r2: 0 }
  const sx = pts.reduce((s, p) => s + p.x, 0)
  const sy = pts.reduce((s, p) => s + p.y, 0)
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0)
  const sx2 = pts.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sx2 - sx * sx
  if (denom === 0) return { slope: 0, intercept: sy / n, r2: 0 }
  const slope = (n * sxy - sx * sy) / denom
  const intercept = (sy - slope * sx) / n
  // R² coefficient of determination
  const yMean = sy / n
  const ssTot = pts.reduce((s, p) => s + (p.y - yMean) ** 2, 0)
  const ssRes = pts.reduce((s, p) => s + (p.y - (intercept + slope * p.x)) ** 2, 0)
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot)
  return { slope, intercept, r2 }
}

function fmt(v: number) {
  return v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : `${(v / 1_000).toFixed(0)}k`
}

const TABS = [
  { id: 'ranking', label: 'Classement', icon: Trophy },
  { id: 'comparison', label: 'Recettes vs Dépenses', icon: BarChart2 },
  { id: 'evolution', label: 'Évolution & Tendances', icon: Activity },
] as const
type Tab = typeof TABS[number]['id']

export function BenchmarkingPage() {
  const { data: session } = useSession()

  const [tab, setTab] = useState<Tab>('ranking')
  const [rankingData, setRankingData] = useState<any[]>([])
  const [evolutionData, setEvolutionData] = useState<any[]>([])
  const [loadingRank, setLoadingRank] = useState(true)
  const [loadingEvo, setLoadingEvo] = useState(false)

  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState<number | ''>('')
  const [rankType, setRankType] = useState<'financial' | 'statistical'>('financial')
  const [regions, setRegions] = useState<any[]>([])
  const [regionId, setRegionId] = useState('')

  const role = session?.user?.role ?? ''
  const isRegional = role === 'REGIONAL_DIRECTOR'

  useEffect(() => {
    if (['SUPER_ADMIN', 'DIRECTION', 'DATA_ADMIN'].includes(role)) {
      fetch('/api/regions').then(r => r.json()).then(d => setRegions(d.data ?? []))
    }
  }, [role])

  const loadRanking = useCallback(async () => {
    setLoadingRank(true)
    const p = new URLSearchParams({ year: String(year), type: rankType })
    if (month) p.set('month', String(month))
    if (regionId) p.set('regionId', regionId)
    const j = await fetch(`/api/benchmarking?${p}`).then(r => r.json())
    if (j.success) setRankingData(j.data)
    setLoadingRank(false)
  }, [year, month, rankType, regionId])

  const loadEvolution = useCallback(async () => {
    setLoadingEvo(true)
    const p = new URLSearchParams({ year: String(year) })
    if (regionId) p.set('regionId', regionId)
    const j = await fetch(`/api/benchmarking/evolution?${p}`).then(r => r.json())
    if (j.success) setEvolutionData(j.data)
    setLoadingEvo(false)
  }, [year, regionId])

  useEffect(() => {
    if (tab === 'evolution') loadEvolution()
    else loadRanking()
  }, [tab, loadRanking, loadEvolution])

  // ── Ranking tab ─────────────────────────────────────────────────────────────
  const sorted = useMemo(() =>
    [...rankingData].sort((a, b) =>
      rankType === 'financial' ? b.totalRevenue - a.totalRevenue : b.avgCompleteness - a.avgCompleteness
    ), [rankingData, rankType])

  const top10Chart = sorted.slice(0, 10).map((d, i) => ({
    name: d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name,
    fullName: d.name,
    value: rankType === 'financial' ? d.totalRevenue : d.avgCompleteness,
    color: RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)],
  }))

  const rankStats = rankingData.length > 0 ? {
    total: rankingData.length,
    withData: rankType === 'financial'
      ? rankingData.filter(d => d.declarationCount > 0).length
      : rankingData.filter(d => d.hasData).length,
    avg: rankType === 'financial'
      ? Math.round(rankingData.reduce((s, d) => s + d.totalRevenue, 0) / rankingData.length)
      : Math.round(rankingData.reduce((s, d) => s + d.avgCompleteness, 0) / rankingData.length),
  } : null

  // ── Comparison tab ──────────────────────────────────────────────────────────
  const compData = useMemo(() =>
    [...rankingData]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)
      .map(d => ({
        name: d.name.length > 16 ? d.name.slice(0, 14) + '…' : d.name,
        fullName: d.name,
        recettes: d.totalRevenue,
        dépenses: d.totalExpense,
        solde: d.netBalance,
      })), [rankingData])

  // ── Evolution + regression ──────────────────────────────────────────────────
  const { evoChart, revReg, expReg } = useMemo(() => {
    if (!evolutionData.length) return { evoChart: [], revReg: null, expReg: null }

    const revPts = evolutionData
      .filter(d => d.revenue > 0)
      .map(d => ({ x: d.month - 1, y: d.revenue }))
    const expPts = evolutionData
      .filter(d => d.expense > 0)
      .map(d => ({ x: d.month - 1, y: d.expense }))

    const revR = linearRegression(revPts)
    const expR = linearRegression(expPts)

    const chart = evolutionData.map((d, i) => ({
      label: d.label,
      recettes: d.revenue > 0 ? d.revenue : null,
      dépenses: d.expense > 0 ? d.expense : null,
      solde: (d.revenue > 0 || d.expense > 0) ? d.net : null,
      tendanceRecettes: revPts.length >= 2
        ? Math.max(0, Math.round(revR.intercept + revR.slope * i)) : undefined,
      tendanceDépenses: expPts.length >= 2
        ? Math.max(0, Math.round(expR.intercept + expR.slope * i)) : undefined,
    }))

    return { evoChart: chart, revReg: revPts.length >= 2 ? revR : null, expReg: expPts.length >= 2 ? expR : null }
  }, [evolutionData])

  const slopeLabel = (slope: number) => {
    if (Math.abs(slope) < 5_000) return 'Stable'
    return slope > 0
      ? `↗ +${formatCurrency(Math.round(slope))}/mois`
      : `↘ ${formatCurrency(Math.round(slope))}/mois`
  }

  const interpretation = revReg && expReg
    ? revReg.slope > 1000 && expReg.slope < -1000
      ? { text: 'Situation favorable : recettes en hausse, dépenses en baisse', ok: true }
      : revReg.slope > 1000
      ? { text: 'Recettes en hausse mais dépenses également — à surveiller', ok: null }
      : expReg.slope < -1000
      ? { text: 'Dépenses en baisse mais recettes aussi — activité en recul', ok: null }
      : { text: 'Situation défavorable : recettes stables ou en baisse, dépenses croissantes', ok: false }
    : null

  const isLoading = tab === 'evolution' ? loadingEvo : loadingRank
  const refresh = tab === 'evolution' ? loadEvolution : loadRanking

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
            <Trophy className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Comparaison inter-établissements</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{rankingData.length} formations sanitaires analysées</p>
          </div>
        </div>
        <button onClick={refresh} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id
                ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <Filter className="w-4 h-4" />
          Filtres
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tab === 'ranking' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type d'analyse</label>
              <select value={rankType} onChange={e => setRankType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="financial">Financier</option>
                <option value="statistical">Statistique</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Année</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {tab !== 'evolution' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mois (optionnel)</label>
              <select value={month} onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Toute l'année</option>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}
          {!isRegional && regions.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Région</label>
              <select value={regionId} onChange={e => setRegionId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Toutes les régions</option>
                {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── CLASSEMENT ────────────────────────────────────────────────────────── */}
      {tab === 'ranking' && (
        <>
          {rankStats && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total établissements', value: rankStats.total, icon: Building2 },
                { label: 'Avec données', value: rankStats.withData, icon: TrendingUp },
                {
                  label: rankType === 'financial' ? 'Revenu moyen' : 'Complétude moyenne',
                  value: rankType === 'financial' ? formatCurrency(rankStats.avg) : `${rankStats.avg}%`,
                  icon: Trophy,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-teal-500" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Top 10 — {rankType === 'financial' ? 'Recettes' : 'Complétude des fiches'}
            </h2>
            {loadingRank ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
              </div>
            ) : top10Chart.length === 0 ? (
              <div className="text-center py-16 text-gray-400">Aucune donnée disponible</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={top10Chart} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={rankType === 'financial' ? fmt : v => `${v}%`} />
                  <Tooltip formatter={(value: any, _: any, props: any) => [
                    rankType === 'financial' ? formatCurrency(value) : `${value}%`, props.payload.fullName,
                  ]} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {top10Chart.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Classement complet</h2>
            </div>
            {loadingRank ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-12">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Établissement</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Région</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Type</th>
                      {rankType === 'financial' ? (
                        <>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Recettes</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Dépenses</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Solde net</th>
                        </>
                      ) : (
                        <>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Fiches</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Complétude moy.</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Validées</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {sorted.map((row, i) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                        <td className="px-4 py-3">
                          <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${
                            i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-400'
                          }`}>{i + 1}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.name}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.region}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{TYPE_LABELS[row.type] ?? row.type}</td>
                        {rankType === 'financial' ? (
                          <>
                            <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(row.totalRevenue)}</td>
                            <td className="px-4 py-3 text-right font-medium text-red-500">{formatCurrency(row.totalExpense)}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${row.netBalance >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                              {formatCurrency(row.netBalance)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.sheetCount}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${row.avgCompleteness}%` }} />
                                </div>
                                <span className="text-gray-700 dark:text-gray-300 text-xs w-8 text-right">{row.avgCompleteness}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.validatedSheets}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── RECETTES vs DÉPENSES ──────────────────────────────────────────────── */}
      {tab === 'comparison' && (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-0.5">
              Recettes vs Dépenses — Top 10 établissements
            </h2>
            <p className="text-xs text-gray-400 mb-5">Comparaison directe par formation sanitaire</p>
            {loadingRank ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
              </div>
            ) : compData.length === 0 ? (
              <div className="text-center py-16 text-gray-400">Aucune donnée disponible</div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={compData} margin={{ top: 5, right: 20, left: 10, bottom: 80 }} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
                  <Tooltip
                    formatter={(value: any, name: string, props: any) => [
                      formatCurrency(value),
                      name === 'recettes' ? 'Recettes' : name === 'dépenses' ? 'Dépenses' : 'Solde net',
                    ]}
                    labelFormatter={(_: any, payload: any[]) => payload?.[0]?.payload?.fullName ?? ''}
                  />
                  <Legend formatter={v => v === 'recettes' ? 'Recettes' : v === 'dépenses' ? 'Dépenses' : 'Solde net'} />
                  <Bar dataKey="recettes" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="solde" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {!loadingRank && compData.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Détail recettes / dépenses</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Établissement</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Recettes</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Dépenses</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Solde net</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Ratio R/D</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {[...rankingData]
                      .sort((a, b) => b.totalRevenue - a.totalRevenue)
                      .slice(0, 10)
                      .map(row => (
                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.name}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-medium">{formatCurrency(row.totalRevenue)}</td>
                          <td className="px-4 py-3 text-right text-red-500 font-medium">{formatCurrency(row.totalExpense)}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${row.netBalance >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                            {formatCurrency(row.netBalance)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                            {row.totalExpense > 0 ? (row.totalRevenue / row.totalExpense).toFixed(2) : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ÉVOLUTION & TENDANCES ────────────────────────────────────────────── */}
      {tab === 'evolution' && (
        <>
          {/* Regression summary cards */}
          {(revReg || expReg) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Revenue trend */}
              {revReg && (
                <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 p-4 ${
                  revReg.slope > 1000 ? 'bg-emerald-50 dark:bg-emerald-900/20' : revReg.slope < -1000 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {revReg.slope > 1000
                      ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                      : revReg.slope < -1000
                      ? <TrendingDown className="w-4 h-4 text-red-500" />
                      : <Activity className="w-4 h-4 text-gray-500" />
                    }
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Tendance recettes</p>
                  </div>
                  <p className={`text-sm font-bold ${revReg.slope > 1000 ? 'text-emerald-600' : revReg.slope < -1000 ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                    {slopeLabel(revReg.slope)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">R² = {(revReg.r2 * 100).toFixed(0)}% de fiabilité</p>
                </div>
              )}

              {/* Expense trend */}
              {expReg && (
                <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 p-4 ${
                  expReg.slope < -1000 ? 'bg-emerald-50 dark:bg-emerald-900/20' : expReg.slope > 1000 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {expReg.slope > 1000
                      ? <TrendingUp className="w-4 h-4 text-red-500" />
                      : expReg.slope < -1000
                      ? <TrendingDown className="w-4 h-4 text-emerald-600" />
                      : <Activity className="w-4 h-4 text-gray-500" />
                    }
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Tendance dépenses</p>
                  </div>
                  <p className={`text-sm font-bold ${expReg.slope < -1000 ? 'text-emerald-600' : expReg.slope > 1000 ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                    {slopeLabel(expReg.slope)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">R² = {(expReg.r2 * 100).toFixed(0)}% de fiabilité</p>
                </div>
              )}

              {/* Interpretation */}
              {interpretation && (
                <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 p-4 ${
                  interpretation.ok === true ? 'bg-emerald-50 dark:bg-emerald-900/20'
                  : interpretation.ok === false ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-amber-50 dark:bg-amber-900/20'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className={`w-4 h-4 ${
                      interpretation.ok === true ? 'text-emerald-600' : interpretation.ok === false ? 'text-red-500' : 'text-amber-600'
                    }`} />
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Interprétation globale</p>
                  </div>
                  <p className={`text-xs font-semibold leading-relaxed ${
                    interpretation.ok === true ? 'text-emerald-700 dark:text-emerald-300'
                    : interpretation.ok === false ? 'text-red-700 dark:text-red-300'
                    : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    {interpretation.text}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Main chart */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Évolution mensuelle {year}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Lignes pleines = données réelles · Lignes pointillées = droite de régression linéaire
              </p>
            </div>
            {loadingEvo ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
              </div>
            ) : evoChart.length === 0 ? (
              <div className="text-center py-16 text-gray-400">Aucune donnée disponible</div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart data={evoChart} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (value === null || value === undefined) return ['—', name]
                      const labels: Record<string, string> = {
                        recettes: 'Recettes',
                        dépenses: 'Dépenses',
                        solde: 'Solde net',
                        tendanceRecettes: 'Tendance recettes',
                        tendanceDépenses: 'Tendance dépenses',
                      }
                      return [formatCurrency(value), labels[name] ?? name]
                    }}
                  />
                  <Legend
                    formatter={(v: string) => ({
                      recettes: 'Recettes', dépenses: 'Dépenses', solde: 'Solde net',
                      tendanceRecettes: 'Tendance recettes (régression)',
                      tendanceDépenses: 'Tendance dépenses (régression)',
                    } as Record<string, string>)[v] ?? v}
                  />
                  {/* Actual data */}
                  <Line type="monotone" dataKey="recettes" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} connectNulls activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="dépenses" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} connectNulls activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="solde" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls strokeDasharray="4 3" />
                  {/* Regression trend lines */}
                  {revReg && <Line type="linear" dataKey="tendanceRecettes" stroke="#10b981" strokeWidth={1.5} strokeDasharray="8 4" dot={false} legendType="plainline" />}
                  {expReg && <Line type="linear" dataKey="tendanceDépenses" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="8 4" dot={false} legendType="plainline" />}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly breakdown table */}
          {!loadingEvo && evolutionData.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Détail mensuel</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Mois</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Recettes</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Dépenses</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Solde net</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Ratio R/D</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {evolutionData.map((d: any) => {
                      const hasData = d.revenue > 0 || d.expense > 0
                      return (
                        <tr key={d.month} className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition ${!hasData ? 'opacity-35' : ''}`}>
                          <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{d.label}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">
                            {d.revenue > 0 ? formatCurrency(d.revenue) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-red-500 font-medium">
                            {d.expense > 0 ? formatCurrency(d.expense) : '—'}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold ${d.net > 0 ? 'text-teal-600' : d.net < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {hasData ? formatCurrency(d.net) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">
                            {d.expense > 0 ? (d.revenue / d.expense).toFixed(2) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
