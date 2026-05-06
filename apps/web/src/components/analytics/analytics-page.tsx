'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { PredictionsPanel } from '@/components/analytics/predictions-panel'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Globe2, MapPin, Building2, TrendingUp, AlertTriangle, CheckCircle2,
  XCircle, Activity, Users, Heart, Baby, Syringe, Printer, ChevronDown, Search,
} from 'lucide-react'
import { MONTHS_FR } from '@care-connekt/shared'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Region { id: string; name: string; code: string; total: number; reporting: number; coverage: number }

const DISEASE_LABELS: Record<string, string> = {
  PALU: 'Paludisme', TB: 'Tuberculose', TN: 'Tétanos néonatal', LEPRE: 'Lèpre',
  FJ: 'Fièvre jaune', MENIN: 'Méningite', RAGE: 'Rage', CHOL: 'Choléra',
  FT: 'Fièvre typhoïde', POLIO: 'Poliomyélite', ROUG: 'Rougeole', COVID: 'COVID-19',
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#f97316', '#6366f1', '#14b8a6', '#ec4899', '#84cc16']

const CATEGORY_COLORS: Record<string, string> = {
  'Consultations': '#0ea5e9', 'Hospitalisations': '#8b5cf6', 'Maladies notifiables': '#ef4444',
  'Programmes de santé': '#10b981', 'Laboratoire': '#f59e0b', 'Imagerie médicale': '#6366f1',
  'Ressources humaines': '#14b8a6', 'Bloc opératoire': '#f97316',
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color = 'brand' }: {
  label: string; value: string | number; sub?: string; icon: any; color?: string
}) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    red:   'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    purple:'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  }
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Period selector ───────────────────────────────────────────────────────────
function PeriodSelector({ year, month, onChange }: {
  year: number; month: number | null
  onChange: (y: number, m: number | null) => void
}) {
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  return (
    <div className="flex items-center gap-2">
      <select value={year} onChange={(e) => onChange(Number(e.target.value), month)}
        className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select value={month ?? ''} onChange={(e) => onChange(year, e.target.value ? Number(e.target.value) : null)}
        className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
        <option value="">Toute l'année</option>
        {MONTHS_FR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
      </select>
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ year, month }: { year: number; month: number | null }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Indicator comparison
  const [indicators, setIndicators]   = useState<any[]>([])
  const [selectedCode, setSelectedCode] = useState('')
  const [indData, setIndData]         = useState<any>(null)
  const [indLoading, setIndLoading]   = useState(false)

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams({ view: 'overview', year: String(year) })
    if (month) p.set('month', String(month))
    fetch(`/api/analytics?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data) })
      .finally(() => setLoading(false))
  }, [year, month])

  useEffect(() => {
    fetch('/api/admin/indicators?limit=300')
      .then((r) => r.json())
      .then((d) => { if (d.success) setIndicators(d.data || []) })
  }, [])

  useEffect(() => {
    if (!selectedCode) { setIndData(null); return }
    setIndLoading(true)
    const p = new URLSearchParams({ view: 'indicator', code: selectedCode, year: String(year) })
    if (month) p.set('month', String(month))
    fetch(`/api/analytics?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setIndData(d.data) })
      .finally(() => setIndLoading(false))
  }, [selectedCode, year, month])

  if (loading) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!data) return null

  const coverageColor = data.coverageRate >= 80 ? 'green' : data.coverageRate >= 50 ? 'amber' : 'red'

  const byCategory = indicators.reduce((acc, ind) => {
    if (!acc[ind.category]) acc[ind.category] = []
    acc[ind.category].push(ind)
    return acc
  }, {} as Record<string, any[]>)

  const regionCompareData = (indData?.byRegion || [])
    .filter((r: any) => r.total > 0)
    .sort((a: any, b: any) => b.total - a.total)

  const catChartData = Object.entries(data.categoryTotals as Record<string, number>)
    .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, fullName: name, value: Math.round(value as number) }))
    .sort((a, b) => b.value - a.value).slice(0, 8)

  const diseaseChartData = (data.topDiseases as any[]).map((d) => ({
    name: DISEASE_LABELS[d.code] || d.code, value: d.total,
  }))

  const trendData = (data.monthlyTrends as any[]).map((t: any) => ({
    label: `${MONTHS_FR[t.month - 1]?.slice(0, 3)} ${t.year}`,
    fiches: t._count.id,
  }))

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Formations sanitaires" value={data.totalFacilities} icon={Building2} />
        <KpiCard label="Ont déclaré" value={data.reportingFacilities} sub={`sur ${data.totalFacilities}`} icon={CheckCircle2} color="green" />
        <KpiCard label="Taux de couverture" value={`${data.coverageRate}%`} icon={Globe2} color={coverageColor} />
        <KpiCard label="Fiches reçues" value={data.totalSheets} icon={Activity} color="purple" />
      </div>

      {/* Coverage by region */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand-500" />
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Couverture par région</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-gray-800/50">
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Région</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">Centres</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">Ont déclaré</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Couverture</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(data.regionStats as Region[]).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{r.name}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{r.total}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{r.reporting}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden min-w-[80px]">
                        <div className={`h-full rounded-full transition-all ${r.coverage >= 80 ? 'bg-green-500' : r.coverage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${r.coverage}%` }} />
                      </div>
                      <span className={`text-xs font-bold tabular-nums w-10 ${r.coverage >= 80 ? 'text-green-600' : r.coverage >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {r.coverage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparaison régionale par indicateur */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-500" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Comparaison régionale par indicateur</h3>
          </div>
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 max-w-xs">
            <option value="">— Choisir un indicateur —</option>
            {Object.entries(byCategory).map(([cat, inds]) => (
              <optgroup key={cat} label={cat}>
                {(inds as any[]).map((i) => (
                  <option key={i.code} value={i.code}>{i.label.split(' · ')[0]}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="p-5">
          {!selectedCode && (
            <p className="text-sm text-gray-400 text-center py-6">
              Sélectionnez un indicateur pour comparer les régions entre elles.
            </p>
          )}
          {selectedCode && indLoading && (
            <div className="flex justify-center items-center h-32">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {selectedCode && !indLoading && indData && regionCompareData.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Aucune donnée pour cet indicateur sur la période.</p>
          )}
          {selectedCode && !indLoading && regionCompareData.length > 0 && (
            <>
              {indData?.indicator && (
                <p className="text-xs text-gray-400 mb-3">
                  <span className="font-mono text-brand-500">{indData.indicator.code}</span>
                  {indData.indicator.unit && <span className="ml-1">· {indData.indicator.unit}</span>}
                  {' '}· {indData.indicator.category}
                </p>
              )}
              <ResponsiveContainer width="100%" height={Math.max(160, regionCompareData.length * 40)}>
                <BarChart data={regionCompareData} layout="vertical" margin={{ left: 130, right: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString('fr-FR')} />
                  <YAxis type="category" dataKey="regionName" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip
                    formatter={(v: any, _: any, props: any) => {
                      const evo = props.payload?.evolution
                      const suffix = evo !== null && evo !== undefined ? ` (${evo > 0 ? '+' : ''}${evo}% vs ${year - 1})` : ''
                      return [`${Number(v).toLocaleString('fr-FR')}${suffix}`, 'Total']
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}
                    label={{ position: 'right', fontSize: 11, fill: '#6b7280', formatter: (v: any) => v > 0 ? v.toLocaleString('fr-FR') : '' }}>
                    {regionCompareData.map((d: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Compact N vs N-1 row */}
              <div className="mt-4 flex flex-wrap gap-2">
                {regionCompareData.map((r: any) => (
                  <div key={r.regionId} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{r.regionName}</span>
                    <span className="text-gray-400">·</span>
                    <span className="font-semibold text-brand-600 dark:text-brand-400 tabular-nums">{r.total.toLocaleString('fr-FR')}</span>
                    {r.evolution !== null && (
                      <span className={`font-bold tabular-nums ${r.evolution > 0 ? 'text-green-600' : r.evolution < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {r.evolution > 0 ? '↑' : r.evolution < 0 ? '↓' : '='}{Math.abs(r.evolution)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top diseases */}
        {diseaseChartData.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Top maladies notifiables</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={diseaseChartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: any) => [v.toLocaleString('fr-FR'), 'Cas']} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {diseaseChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category totals */}
        {catChartData.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Activités par catégorie</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catChartData} margin={{ left: 10, right: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [v.toLocaleString('fr-FR'), 'Total']}
                  labelFormatter={(l: any) => { const d = catChartData.find((c) => c.name === l); return d?.fullName || l }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {catChartData.map((d, i) => <Cell key={i} fill={CATEGORY_COLORS[d.fullName] || COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Submission trend */}
      {trendData.length > 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Évolution des soumissions</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="fiches" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} name="Fiches reçues" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── Regions Tab ───────────────────────────────────────────────────────────────
function RegionsTab({ year, month }: { year: number; month: number | null }) {
  const [regions, setRegions] = useState<any[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/regions?limit=100').then((r) => r.json()).then((d) => {
      if (d.success) { setRegions(d.data || []); if (d.data?.[0]) setSelectedRegion(d.data[0].id) }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedRegion) return
    setLoading(true)
    const p = new URLSearchParams({ view: 'region', regionId: selectedRegion, year: String(year) })
    if (month) p.set('month', String(month))
    fetch(`/api/analytics?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data) })
      .finally(() => setLoading(false))
  }, [selectedRegion, year, month])

  const facilityBarData = data?.facilitySummary?.map((f: any) => ({
    name: f.name.length > 18 ? f.name.slice(0, 16) + '…' : f.name,
    completeness: f.completeness, hasSheet: f.hasSheet ? 1 : 0,
  })) || []

  // Group indicators by category for display
  const byCategory = data ? Object.entries(data.indicatorAgg as Record<string, any>).reduce((acc, [code, val]) => {
    if (!acc[val.category]) acc[val.category] = []
    acc[val.category].push({ code, ...val })
    return acc
  }, {} as Record<string, any[]>) : {}

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <MapPin className="w-4 h-4 text-brand-500" />
        <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
          {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="Centres dans la région" value={data.totalFacilities} icon={Building2} />
            <KpiCard label="Ont soumis une fiche" value={data.reportingFacilities} icon={CheckCircle2} color="green" />
            <KpiCard label="Couverture" value={`${data.totalFacilities > 0 ? Math.round((data.reportingFacilities / data.totalFacilities) * 100) : 0}%`} icon={Globe2} color="brand" />
          </div>

          {/* Completeness chart */}
          {facilityBarData.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Complétude par centre</h3>
              <ResponsiveContainer width="100%" height={Math.max(200, facilityBarData.length * 32)}>
                <BarChart data={facilityBarData} layout="vertical" margin={{ left: 120, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: any) => [`${Math.round(v)}%`, 'Complétude']} />
                  <Bar dataKey="completeness" radius={[0, 4, 4, 0]}>
                    {facilityBarData.map((d: any, i: number) => (
                      <Cell key={i} fill={d.completeness >= 80 ? '#10b981' : d.completeness >= 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Indicator aggregates by category */}
          {Object.entries(byCategory).map(([cat, inds]) => (
            <div key={cat} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-3 bg-brand-50 dark:bg-brand-900/20 border-b border-brand-100 dark:border-brand-800">
                <h3 className="font-semibold text-sm text-brand-800 dark:text-brand-300">{cat}</h3>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Indicateur</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Total région</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Centres ayant déclaré</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(inds as any[]).map((ind) => (
                    <tr key={ind.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/20">
                      <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{ind.label}</td>
                      <td className="px-4 py-2 text-right font-semibold text-brand-600 dark:text-brand-400 tabular-nums">{Math.round(ind.total).toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-2 text-right text-gray-500 tabular-nums">{ind.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      ) : null}
    </div>
  )
}

// ── Facilities Tab ────────────────────────────────────────────────────────────
function FacilitiesTab({ year, month }: { year: number; month: number | null }) {
  const [regions, setRegions] = useState<any[]>([])
  const [facilities, setFacilities] = useState<any[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedFacility, setSelectedFacility] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIndicator, setSelectedIndicator] = useState('')

  useEffect(() => {
    fetch('/api/admin/regions?limit=100').then((r) => r.json()).then((d) => {
      if (d.success) setRegions(d.data || [])
    })
  }, [])

  useEffect(() => {
    if (!selectedRegion) return
    fetch(`/api/facilities?regionId=${selectedRegion}&limit=100`).then((r) => r.json()).then((d) => {
      if (d.success) { setFacilities(d.data || []); setSelectedFacility(d.data?.[0]?.id || '') }
    })
  }, [selectedRegion])

  useEffect(() => {
    if (!selectedFacility) return
    setLoading(true)
    const p = new URLSearchParams({ view: 'facility', facilityId: selectedFacility, year: String(year) })
    if (month) p.set('month', String(month))
    fetch(`/api/analytics?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) { setData(d.data); setSelectedIndicator('') } })
      .finally(() => setLoading(false))
  }, [selectedFacility, year, month])

  const indicatorOptions = data ? Object.keys(data.timeSeries) : []
  const trendData = (selectedIndicator && data?.timeSeries?.[selectedIndicator])
    ? (data.timeSeries[selectedIndicator] as any[]).map((p: any) => ({
        label: `${MONTHS_FR[p.month - 1]?.slice(0, 3)} ${p.year}`,
        value: p.value,
      }))
    : []

  const currentSheet = data?.currentSheet
  const byCategory = currentSheet ? currentSheet.values.reduce((acc: any, val: any) => {
    const cat = val.indicator.category
    if (!acc[cat]) acc[cat] = []
    if (val.value !== null) acc[cat].push(val)
    return acc
  }, {} as Record<string, any[]>) : {}

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="">-- Choisir une région --</option>
          {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {facilities.length > 0 && (
          <select value={selectedFacility} onChange={(e) => setSelectedFacility(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : data ? (
        <>
          {/* Trend chart */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Évolution d'un indicateur</h3>
              <select value={selectedIndicator} onChange={(e) => setSelectedIndicator(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none max-w-xs">
                <option value="">-- Sélectionner un indicateur --</option>
                {indicatorOptions.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </div>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} name={selectedIndicator} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Sélectionnez un indicateur pour afficher son évolution</p>
            )}
          </div>

          {/* Current period data */}
          {currentSheet && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Données de la fiche — {MONTHS_FR[currentSheet.month - 1]} {currentSheet.year}
                <span className="ml-2 text-brand-500">Complétude : {Math.round(currentSheet.completeness)}%</span>
              </p>
              {Object.entries(byCategory).map(([cat, vals]) => (
                <div key={cat} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="px-5 py-2.5 bg-brand-50 dark:bg-brand-900/20 border-b border-brand-100 dark:border-brand-800">
                    <h4 className="font-semibold text-xs text-brand-800 dark:text-brand-300 uppercase tracking-wide">{cat}</h4>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(vals as any[]).map((v) => (
                        <tr key={v.indicator.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/20">
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{v.indicator.label}</td>
                          <td className="px-4 py-2 text-right font-semibold tabular-nums text-brand-600 dark:text-brand-400">
                            {Math.round(v.value).toLocaleString('fr-FR')}
                            {v.indicator.unit && <span className="text-xs text-gray-400 ml-1">{v.indicator.unit}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      ) : !selectedRegion ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <Building2 className="w-10 h-10 opacity-30" />
          <p className="text-sm">Sélectionnez une région pour commencer</p>
        </div>
      ) : null}
    </div>
  )
}

// ── Inferences Tab ────────────────────────────────────────────────────────────
function InferencesTab({ year, month }: { year: number; month: number | null }) {
  const [regions, setRegions] = useState<any[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/regions?limit=100').then((r) => r.json()).then((d) => {
      if (d.success) setRegions(d.data || [])
    })
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams({ view: 'inferences', year: String(year) })
    if (month) p.set('month', String(month))
    if (selectedRegion) p.set('regionId', selectedRegion)
    fetch(`/api/analytics?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data) })
      .finally(() => setLoading(false))
  }, [year, month, selectedRegion])

  useEffect(() => { load() }, [load])

  const [pyramidData, setPyramidData] = useState<any>(null)

  useEffect(() => {
    const p = new URLSearchParams({ view: 'pyramid', year: String(year) })
    if (month) p.set('month', String(month))
    if (selectedRegion) p.set('regionId', selectedRegion)
    fetch(`/api/analytics?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setPyramidData(d.data) })
  }, [year, month, selectedRegion])

  const pieData = data?.topDiseases?.map((d: any) => ({
    name: DISEASE_LABELS[d.code] || d.code, value: d.total,
  })) || []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="">🌍 Niveau national</option>
          {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : data ? (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total consultations" value={data.totalConsultations?.toLocaleString('fr-FR') || 0} icon={Activity} />
            <KpiCard label="Accouchements" value={data.totalBirths?.toLocaleString('fr-FR') || 0} icon={Baby} color="purple" />
            <KpiCard label="Taux césarienne" value={`${data.cesareanRate ?? 0}%`} icon={Heart} color={data.cesareanRate > 20 ? 'amber' : 'green'} />
            <KpiCard label="Enfants vaccinés (PEV)" value={data.totalPEV?.toLocaleString('fr-FR') || 0} icon={Syringe} color="green" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Disease pie */}
            {pieData.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Top 5 maladies notifiables</h3>
                <p className="text-xs text-gray-400 mb-4">Part relative dans la morbidité déclarée</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, pct }) => `${name}`}>
                      {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [v.toLocaleString('fr-FR'), 'Cas']} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Inferred insights */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Indicateurs clés inférés</h3>

              <div className="space-y-2">
                {/* Mortality rate */}
                <div className={`flex items-start gap-3 p-3 rounded-xl ${data.hospitalMortalityRate > 5 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-green-50 dark:bg-green-900/10'}`}>
                  {data.hospitalMortalityRate > 5
                    ? <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    : <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Mortalité hospitalière : {data.hospitalMortalityRate}‰
                    </p>
                    <p className="text-xs text-gray-500">
                      {data.hospitalMortalityRate > 5 ? '⚠ Au-dessus du seuil recommandé (5‰)' : '✓ Dans les limites acceptables'}
                    </p>
                  </div>
                </div>

                {/* Coverage */}
                <div className={`flex items-start gap-3 p-3 rounded-xl ${data.coverage.rate < 70 ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-green-50 dark:bg-green-900/10'}`}>
                  {data.coverage.rate < 70
                    ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    : <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Couverture de déclaration : {data.coverage.rate}%
                      <span className="text-xs text-gray-400 ml-1">({data.coverage.reporting}/{data.coverage.total} centres)</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {data.coverage.rate < 70 ? `⚠ ${data.coverage.total - data.coverage.reporting} centre(s) n'ont pas déclaré` : '✓ Bonne couverture de déclaration'}
                    </p>
                  </div>
                </div>

                {/* Cesarean */}
                <div className={`flex items-start gap-3 p-3 rounded-xl ${data.cesareanRate > 15 ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-green-50 dark:bg-green-900/10'}`}>
                  {data.cesareanRate > 15
                    ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    : <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Taux de césarienne : {data.cesareanRate}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {data.cesareanRate > 15 ? '⚠ Dépasse le seuil OMS recommandé (10-15%)' : '✓ Dans les normes OMS (10-15%)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pyramides démographiques */}
          {pyramidData && (pyramidData.consultations.some((d: any) => d.M > 0 || d.F > 0) || pyramidData.hospitalizations.some((d: any) => d.M > 0 || d.F > 0)) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {pyramidData.consultations.some((d: any) => d.M > 0 || d.F > 0) && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Pyramide — Consultations</h3>
                  <PyramidChart data={pyramidData.consultations} title="Répartition par âge et sexe" />
                </div>
              )}
              {pyramidData.hospitalizations.some((d: any) => d.M > 0 || d.F > 0) && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Pyramide — Hospitalisations</h3>
                  <PyramidChart data={pyramidData.hospitalizations} title="Répartition par âge et sexe" />
                </div>
              )}
            </div>
          )}

          {/* Alerts */}
          {(data.alerts.notReporting.length > 0 || data.alerts.lowCompleteness.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {data.alerts.notReporting.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <h4 className="font-semibold text-sm text-red-700 dark:text-red-400">Centres sans déclaration ({data.alerts.notReporting.length})</h4>
                  </div>
                  <ul className="space-y-1">
                    {data.alerts.notReporting.map((name: string) => (
                      <li key={name} className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />{name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.alerts.lowCompleteness.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h4 className="font-semibold text-sm text-amber-700 dark:text-amber-400">Complétude {'<'} 50% ({data.alerts.lowCompleteness.length})</h4>
                  </div>
                  <ul className="space-y-1">
                    {data.alerts.lowCompleteness.map((f: any) => (
                      <li key={f.name} className="text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />{f.name}</span>
                        <span className="font-semibold">{f.completeness}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

// ── Pyramid Chart ─────────────────────────────────────────────────────────────
function PyramidChart({ data, title }: { data: { group: string; M: number; F: number }[]; title: string }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.M, d.F]), 1)
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h4>
      <div className="space-y-2">
        {data.map((row) => (
          <div key={row.group} className="grid grid-cols-[1fr_auto_1fr] gap-1 items-center">
            {/* M bar (right-to-left) */}
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs tabular-nums text-blue-600 dark:text-blue-400 w-12 text-right">{row.M.toLocaleString('fr-FR')}</span>
              <div className="h-5 bg-blue-400 dark:bg-blue-500 rounded-l-sm" style={{ width: `${Math.round((row.M / maxVal) * 120)}px`, minWidth: row.M > 0 ? 2 : 0 }} />
            </div>
            {/* Label */}
            <div className="text-xs text-gray-600 dark:text-gray-400 text-center whitespace-nowrap px-1 w-32">{row.group}</div>
            {/* F bar (left-to-right) */}
            <div className="flex items-center gap-1.5">
              <div className="h-5 bg-pink-400 dark:bg-pink-500 rounded-r-sm" style={{ width: `${Math.round((row.F / maxVal) * 120)}px`, minWidth: row.F > 0 ? 2 : 0 }} />
              <span className="text-xs tabular-nums text-pink-600 dark:text-pink-400 w-12">{row.F.toLocaleString('fr-FR')}</span>
            </div>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-1 mt-2">
          <div className="flex justify-end pr-1"><span className="text-xs font-semibold text-blue-500">♂ Masculin</span></div>
          <div className="w-32" />
          <div className="pl-1"><span className="text-xs font-semibold text-pink-500">♀ Féminin</span></div>
        </div>
      </div>
    </div>
  )
}

// ── Explorer Tab ──────────────────────────────────────────────────────────────
function ExplorerTab({ year, month }: { year: number; month: number | null }) {
  const [indicators, setIndicators] = useState<any[]>([])
  const [selectedCode, setSelectedCode] = useState('')
  const [search, setSearch] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/indicators?limit=300')
      .then((r) => r.json())
      .then((d) => { if (d.success) setIndicators(d.data || []) })
  }, [])

  useEffect(() => {
    if (!selectedCode) return
    setLoading(true)
    const p = new URLSearchParams({ view: 'indicator', code: selectedCode, year: String(year) })
    if (month) p.set('month', String(month))
    fetch(`/api/analytics?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data) })
      .finally(() => setLoading(false))
  }, [selectedCode, year, month])

  const byCategory = indicators.reduce((acc, ind) => {
    if (!acc[ind.category]) acc[ind.category] = []
    acc[ind.category].push(ind)
    return acc
  }, {} as Record<string, any[]>)

  const filtered = search
    ? indicators.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase()))
    : null

  const trendChartData = (data?.nationalTrend || []).map((t: any) => ({
    label: `${MONTHS_FR[t.month - 1]?.slice(0, 3)} ${t.year}`,
    total: t.total,
  }))

  const regionChartData = (data?.byRegion || [])
    .filter((r: any) => r.total > 0)
    .sort((a: any, b: any) => b.total - a.total)

  return (
    <div className="space-y-5">
      {/* Indicator selector */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">Choisir un indicateur à analyser</h3>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Rechercher un indicateur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          {search && filtered && filtered.length > 0 ? (
            <select
              value={selectedCode}
              onChange={(e) => { setSelectedCode(e.target.value); setSearch('') }}
              size={Math.min(filtered.length, 6)}
              className="flex-1 min-w-[260px] px-3 py-1.5 text-sm border border-brand-300 dark:border-brand-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none">
              {filtered.map((i) => (
                <option key={i.code} value={i.code}>[{i.code}] {i.label}</option>
              ))}
            </select>
          ) : !search ? (
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="flex-1 min-w-[260px] px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
              <option value="">— Sélectionner —</option>
              {Object.entries(byCategory).map(([cat, inds]) => (
                <optgroup key={cat} label={cat}>
                  {(inds as any[]).map((i) => (
                    <option key={i.code} value={i.code}>{i.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : null}
        </div>
        {selectedCode && data && (
          <p className="mt-2 text-xs text-gray-400">
            <span className="font-mono text-brand-500">{data.indicator.code}</span> · {data.indicator.category}
            {data.indicator.unit && <span className="ml-1">· unité : {data.indicator.unit}</span>}
          </p>
        )}
      </div>

      {!selectedCode && (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
          <Activity className="w-10 h-10 opacity-20" />
          <p className="text-sm">Sélectionnez un indicateur pour explorer ses données</p>
        </div>
      )}

      {selectedCode && loading && (
        <div className="flex justify-center items-center h-48"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      )}

      {selectedCode && !loading && data && (
        <>
          {/* Region comparison */}
          {regionChartData.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Comparaison par région</h3>
              <ResponsiveContainer width="100%" height={Math.max(180, regionChartData.length * 38)}>
                <BarChart data={regionChartData} layout="vertical" margin={{ left: 130, right: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString('fr-FR')} />
                  <YAxis type="category" dataKey="regionName" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip
                    formatter={(v: any, _: any, props: any) => {
                      const evo = props.payload?.evolution
                      return [
                        `${Number(v).toLocaleString('fr-FR')}${evo !== null ? ` (${evo > 0 ? '+' : ''}${evo}% vs N-1)` : ''}`,
                        'Total',
                      ]
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, formatter: (v: any) => v > 0 ? v.toLocaleString('fr-FR') : '' }}>
                    {regionChartData.map((d: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* N vs N-1 table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Région</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">{year}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">{year - 1}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Évolution</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {regionChartData.map((r: any) => (
                      <tr key={r.regionId} className="hover:bg-gray-50 dark:hover:bg-gray-800/20">
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{r.regionName}</td>
                        <td className="px-3 py-2 text-right font-semibold text-brand-600 dark:text-brand-400 tabular-nums">{r.total.toLocaleString('fr-FR')}</td>
                        <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{r.prevTotal.toLocaleString('fr-FR')}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.evolution !== null ? (
                            <span className={`font-semibold ${r.evolution > 0 ? 'text-green-600' : r.evolution < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                              {r.evolution > 0 ? '+' : ''}{r.evolution}%
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* National trend */}
          {trendChartData.length > 1 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">
                Évolution nationale — {data.indicator.label.split(' · ')[0]}
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString('fr-FR')} />
                  <Tooltip formatter={(v: any) => [v.toLocaleString('fr-FR'), 'Total']} />
                  <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {regionChartData.length === 0 && trendChartData.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
              <p className="text-sm">Aucune donnée pour cet indicateur sur la période sélectionnée.</p>
            </div>
          )}
        </>
      )}

      {/* Predictions panel */}
      <PredictionsPanel />
    </div>
  )
}

// ── Report Tab ────────────────────────────────────────────────────────────────
function ReportTab({ year, month }: { year: number; month: number | null }) {
  const handlePrint = () => window.print()
  return (
    <div className="space-y-4">
      <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-2xl p-5">
        <h3 className="font-semibold text-brand-800 dark:text-brand-300 mb-1">Impression du rapport</h3>
        <p className="text-sm text-brand-600 dark:text-brand-400 mb-4">
          Utilisez les onglets <strong>Aperçu national</strong>, <strong>Par région</strong> ou <strong>Par centre</strong> pour configurer votre analyse,
          puis cliquez sur Imprimer. Le rapport inclura tous les graphiques et tableaux visibles.
        </p>
        <button onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition">
          <Printer className="w-4 h-4" />
          Imprimer / Exporter PDF
        </button>
      </div>
      <div className="text-xs text-gray-400 space-y-1 px-1">
        <p>• Pour exporter en PDF : dans la boîte de dialogue d'impression, sélectionnez <strong>«&nbsp;Enregistrer en PDF&nbsp;»</strong> comme imprimante.</p>
        <p>• Les graphiques sont inclus dans l'impression.</p>
        <p>• Format recommandé : A4 paysage pour les tableaux larges.</p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',    label: 'Aperçu national',  icon: Globe2 },
  { key: 'regions',     label: 'Par région',        icon: MapPin },
  { key: 'facilities',  label: 'Par centre',        icon: Building2 },
  { key: 'explorer',    label: 'Explorateur',       icon: Search },
  { key: 'inferences',  label: 'Inférences',        icon: TrendingUp },
  { key: 'report',      label: 'Rapport',           icon: Printer },
]

export function AnalyticsPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState('overview')
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState<number | null>(null)

  return (
    <div className="space-y-5 print:space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Analyse des données de santé</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Exploration, inférences et rapports statistiques</p>
        </div>
        <PeriodSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 flex-wrap print:hidden">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === 'overview'   && <OverviewTab    year={year} month={month} />}
        {tab === 'regions'    && <RegionsTab     year={year} month={month} />}
        {tab === 'facilities' && <FacilitiesTab  year={year} month={month} />}
        {tab === 'explorer'   && <ExplorerTab    year={year} month={month} />}
        {tab === 'inferences' && <InferencesTab  year={year} month={month} />}
        {tab === 'report'     && <ReportTab      year={year} month={month} />}
      </div>
    </div>
  )
}
