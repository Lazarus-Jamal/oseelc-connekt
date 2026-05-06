'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@care-connekt/shared'

interface DataPoint { period: number; value: number; month: number; year: number }
interface PredData {
  historical: DataPoint[]
  predictions: DataPoint[]
  anomalies: DataPoint[]
  trend: { slope: number; direction: string; percentPerMonth: number } | null
  type: string
  message?: string
}

const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function fmtLabel(d: DataPoint, type: string) {
  return `${MONTHS_SHORT[d.month - 1]} ${d.year}`
}

function fmtValue(v: number, type: string) {
  if (type === 'completeness') return `${Math.round(v)}%`
  return formatCurrency(v)
}

export function PredictionsPanel() {
  const [data, setData] = useState<PredData | null>(null)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('revenue')
  const [monthsAhead, setMonthsAhead] = useState(3)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/predictions?type=${type}&monthsAhead=${monthsAhead}`)
    const json = await res.json()
    if (json.success) setData(json.data)
    setLoading(false)
  }, [type, monthsAhead])

  useEffect(() => { load() }, [load])

  const chartData = data ? [
    ...data.historical.map((d) => ({
      label: fmtLabel(d, type),
      actual: Math.round(d.value),
      predicted: null as number | null,
      anomaly: data.anomalies.some((a) => a.period === d.period),
    })),
    ...data.predictions.map((d) => ({
      label: fmtLabel(d, type),
      actual: null as number | null,
      predicted: Math.round(d.value),
      anomaly: false,
    })),
  ] : []

  const TrendIcon = data?.trend?.direction === 'up'
    ? TrendingUp
    : data?.trend?.direction === 'down'
      ? TrendingDown
      : Minus

  const trendColor = data?.trend?.direction === 'up'
    ? 'text-emerald-600'
    : data?.trend?.direction === 'down'
      ? 'text-red-500'
      : 'text-gray-400'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Analyse prédictive</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
          >
            <option value="revenue">Recettes</option>
            <option value="expense">Dépenses</option>
            <option value="completeness">Complétude fiches</option>
          </select>
          <select
            value={monthsAhead}
            onChange={e => setMonthsAhead(Number(e.target.value))}
            className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
          >
            {[1, 2, 3, 6].map(m => <option key={m} value={m}>{m} mois à venir</option>)}
          </select>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Trend summary */}
      {data?.trend && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center gap-1.5 text-sm font-medium ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span>{data.trend.direction === 'up' ? '+' : ''}{data.trend.percentPerMonth}% / mois</span>
          </div>
          {data.anomalies.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>{data.anomalies.length} anomalie{data.anomalies.length > 1 ? 's' : ''} détectée{data.anomalies.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      {data?.message && (
        <p className="text-sm text-gray-400 text-center py-4">{data.message}</p>
      )}

      {/* Chart */}
      {chartData.length > 0 && !data?.message && (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={Math.max(0, Math.floor(chartData.length / 8))} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => type === 'completeness' ? `${v}%` : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip formatter={(v: any) => fmtValue(v, type)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="actual"
              name="Historique"
              stroke="#0f766e"
              strokeWidth={2}
              dot={(props: any) => {
                const isAnomaly = props.payload.anomaly
                return isAnomaly
                  ? <circle key={props.key} cx={props.cx} cy={props.cy} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
                  : <circle key={props.key} cx={props.cx} cy={props.cy} r={2} fill="#0f766e" />
              }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              name="Prévision"
              stroke="#7c3aed"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 3, fill: '#7c3aed' }}
              connectNulls={false}
            />
            {data != null && data.historical.length > 0 && (
              <ReferenceLine
                x={fmtLabel(data.historical[data.historical.length - 1]!, type)}
                stroke="#d1d5db"
                strokeDasharray="4 2"
                label={{ value: "Aujourd'hui", position: 'insideTopRight', fontSize: 9, fill: '#9ca3af' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Anomalies list */}
      {data?.anomalies && data.anomalies.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Anomalies détectées (valeurs inhabituelles)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.anomalies.map((a, i) => (
              <div key={i} className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{fmtLabel(a, type)}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">{fmtValue(a.value, type)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
