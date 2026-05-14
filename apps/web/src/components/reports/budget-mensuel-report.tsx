'use client'

import { useState, useRef } from 'react'
import { Printer, FileSearch, Loader2, MapPin, Building2 } from 'lucide-react'
import { formatCurrency } from '@care-connekt/shared'
import { useEffect } from 'react'

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

interface FacilityReport {
  facility: { id: string; name: string; code: string; type: string; region: string }
  period: { month: number; year: number }
  revenue: {
    lines: { category: string; budget: number; realisation: number; pct: number | null }[]
    total: { budget: number; realisation: number; pct: number | null }
  }
  expense: {
    lines: { category: string; budget: number; realisation: number; pct: number | null }[]
    total: { budget: number; realisation: number; pct: number | null }
  }
  tresorerieFinale: number
}

function PctCell({ pct }: { pct: number | null }) {
  if (pct === null) return <td className="report-td text-right text-gray-400">—</td>
  const color = pct >= 90 ? 'text-green-700' : pct >= 60 ? 'text-orange-600' : 'text-red-600'
  return <td className={`report-td text-right font-semibold ${color}`}>{pct}%</td>
}

function FacilityReportSheet({ report }: { report: FacilityReport }) {
  const { facility, period, revenue, expense, tresorerieFinale } = report
  const periodLabel = `DU 1er AU ${new Date(period.year, period.month, 0).getDate()} ${MONTHS[period.month - 1].toUpperCase()} ${period.year}`

  return (
    <div className="report-page">
      {/* En-tête */}
      <div className="text-center mb-4">
        <p className="text-sm font-medium text-gray-600 italic">{periodLabel}</p>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th className="report-th text-center" colSpan={4}>
              BUDGET MENSUEL {facility.name.toUpperCase()}
            </th>
          </tr>
          <tr>
            <th className="report-th text-left" style={{ width: '50%' }}></th>
            <th className="report-th text-right" style={{ width: '20%' }}>BUDGET</th>
            <th className="report-th text-right" style={{ width: '20%' }}>RÉALISATION</th>
            <th className="report-th text-right" style={{ width: '10%' }}>%</th>
          </tr>
          <tr>
            <th className="report-th-sub text-center" colSpan={4}>RECETTES</th>
          </tr>
        </thead>
        <tbody>
          {revenue.lines.map((line) => (
            <tr key={line.category} className="report-row">
              <td className="report-td">{line.category}</td>
              <td className="report-td text-right">{line.budget > 0 ? formatCurrency(line.budget) : '—'}</td>
              <td className="report-td text-right font-medium">{line.realisation > 0 ? formatCurrency(line.realisation) : '—'}</td>
              <PctCell pct={line.pct} />
            </tr>
          ))}
          {revenue.lines.length === 0 && (
            <tr className="report-row">
              <td className="report-td text-gray-400 italic" colSpan={4}>Aucune donnée de recette pour cette période</td>
            </tr>
          )}
          <tr className="report-total-row">
            <td className="report-td font-bold">TOTAL DES RECETTES (A)</td>
            <td className="report-td text-right font-bold">{formatCurrency(revenue.total.budget)}</td>
            <td className="report-td text-right font-bold">{formatCurrency(revenue.total.realisation)}</td>
            <PctCell pct={revenue.total.pct} />
          </tr>
          <tr className="report-row">
            <td className="report-td text-gray-500 italic">SOINS À CRÉDIT (B)</td>
            <td className="report-td text-right text-gray-400">—</td>
            <td className="report-td text-right text-gray-400">—</td>
            <td className="report-td text-right text-gray-400">—</td>
          </tr>
          <tr className="report-row">
            <td className="report-td text-gray-500 italic">RECOUVREMENT (C)</td>
            <td className="report-td text-right text-gray-400">—</td>
            <td className="report-td text-right text-gray-400">—</td>
            <td className="report-td text-right text-gray-400">—</td>
          </tr>
          <tr className="report-row bg-gray-50">
            <td className="report-td font-semibold text-gray-600" colSpan={4}>CASH = TI + A − B + C</td>
          </tr>
        </tbody>
      </table>

      <table className="report-table mt-6">
        <thead>
          <tr>
            <th className="report-th-sub text-center" colSpan={4}>DÉPENSES</th>
          </tr>
          <tr>
            <th className="report-th text-left" style={{ width: '50%' }}></th>
            <th className="report-th text-right" style={{ width: '20%' }}>BUDGET</th>
            <th className="report-th text-right" style={{ width: '20%' }}>RÉALISATION</th>
            <th className="report-th text-right" style={{ width: '10%' }}>%</th>
          </tr>
        </thead>
        <tbody>
          {expense.lines.map((line) => (
            <tr key={line.category} className="report-row">
              <td className="report-td">{line.category}</td>
              <td className="report-td text-right">{line.budget > 0 ? formatCurrency(line.budget) : '—'}</td>
              <td className="report-td text-right font-medium">{line.realisation > 0 ? formatCurrency(line.realisation) : '—'}</td>
              <PctCell pct={line.pct} />
            </tr>
          ))}
          {expense.lines.length === 0 && (
            <tr className="report-row">
              <td className="report-td text-gray-400 italic" colSpan={4}>Aucune donnée de dépense pour cette période</td>
            </tr>
          )}
          <tr className="report-total-row">
            <td className="report-td font-bold">TOTAL DES DÉPENSES</td>
            <td className="report-td text-right font-bold">{formatCurrency(expense.total.budget)}</td>
            <td className="report-td text-right font-bold">{formatCurrency(expense.total.realisation)}</td>
            <PctCell pct={expense.total.pct} />
          </tr>
          <tr className="report-total-row">
            <td className="report-td font-bold">TRÉSORERIE FINALE</td>
            <td className="report-td" colSpan={2}></td>
            <td className={`report-td text-right font-bold ${tresorerieFinale >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatCurrency(tresorerieFinale)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 text-xs text-gray-400 text-right">
        {facility.region} · {facility.type === 'HOSPITAL' ? 'Hôpital' : 'Centre de Santé'} · {facility.code}
      </div>
    </div>
  )
}

export function BudgetMensuelReport() {
  const now = new Date()
  const [month,      setMonth]      = useState(now.getMonth() + 1)
  const [year,       setYear]       = useState(now.getFullYear())
  const [scope,      setScope]      = useState<'all' | 'region' | 'facility'>('all')
  const [regions,    setRegions]    = useState<{ id: string; name: string }[]>([])
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([])
  const [regionId,   setRegionId]   = useState('')
  const [facilityId, setFacilityId] = useState('')
  const [reports,    setReports]    = useState<FacilityReport[]>([])
  const [loading,    setLoading]    = useState(false)
  const [generated,  setGenerated]  = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // Charger régions
  useEffect(() => {
    fetch('/api/regions').then((r) => r.json()).then((d) => setRegions(d.data || []))
  }, [])

  // Charger FOSA selon région
  useEffect(() => {
    setFacilityId('')
    if (!regionId) { setFacilities([]); return }
    fetch(`/api/facilities?regionId=${regionId}`).then((r) => r.json()).then((d) => setFacilities(d.data || []))
  }, [regionId])

  const generate = async () => {
    setLoading(true)
    setGenerated(false)
    const params = new URLSearchParams({ month: String(month), year: String(year) })
    if (scope === 'facility' && facilityId) params.set('facilityId', facilityId)
    else if (scope === 'region' && regionId) params.set('regionId', regionId)
    const res  = await fetch(`/api/reports/budget-mensuel?${params}`)
    const data = await res.json()
    setReports(data.data || [])
    setLoading(false)
    setGenerated(true)
  }

  const print = () => window.print()

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i)

  return (
    <>
      {/* Styles d'impression injectés dans la page */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #budget-print-area { display: block !important; }
          .report-page { page-break-after: always; padding: 20px; }
          .report-page:last-child { page-break-after: avoid; }
        }
        #budget-print-area { display: none; }
        .report-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .report-th { border: 1px solid #999; padding: 4px 8px; background: #e5e7eb; font-weight: 700; font-size: 11px; }
        .report-th-sub { border: 1px solid #999; padding: 3px 8px; background: #d1d5db; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        .report-td { border: 1px solid #d1d5db; padding: 3px 8px; font-size: 12px; }
        .report-row:nth-child(even) { background: #f9fafb; }
        .report-total-row { background: #e5e7eb; font-weight: 700; }
        .report-total-row .report-td { border: 1px solid #999; }
      `}</style>

      {/* Zone imprimable cachée */}
      <div id="budget-print-area" ref={printRef}>
        {reports.map((r) => <FacilityReportSheet key={r.facility.id} report={r} />)}
      </div>

      {/* Interface de génération */}
      <div className="space-y-5">
        {/* Filtres */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Paramètres du rapport</h3>

          <div className="flex flex-wrap gap-4 items-end">
            {/* Mois / Année */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mois</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Année</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Périmètre */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Périmètre</label>
              <div className="flex gap-2">
                {(['all', 'region', 'facility'] as const).map((s) => (
                  <button key={s} onClick={() => setScope(s)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${scope === s ? 'bg-brand-600 text-white border-brand-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-300'}`}>
                    {s === 'all' ? 'Toutes les FOSA' : s === 'region' ? 'Par région' : 'Une FOSA'}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdown Région */}
            {scope === 'region' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Région</label>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <select value={regionId} onChange={(e) => setRegionId(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Sélectionner…</option>
                    {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Dropdown FOSA */}
            {scope === 'facility' && (
              <div className="flex gap-3 items-end">
                {regions.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Région</label>
                    <select value={regionId} onChange={(e) => setRegionId(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                      <option value="">Toutes</option>
                      {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">FOSA</label>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                      <option value="">Sélectionner…</option>
                      {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <button onClick={generate} disabled={loading || (scope === 'region' && !regionId) || (scope === 'facility' && !facilityId)}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
              Générer
            </button>

            {generated && reports.length > 0 && (
              <button onClick={print}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition">
                <Printer className="w-4 h-4" />
                Imprimer ({reports.length} FOSA)
              </button>
            )}
          </div>
        </div>

        {/* Aperçu des rapports */}
        {loading && (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        )}

        {generated && !loading && reports.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <p className="text-gray-400">Aucune donnée pour la période et le périmètre sélectionnés.</p>
          </div>
        )}

        {generated && !loading && reports.length > 0 && (
          <div className="space-y-6">
            <p className="text-xs text-gray-400">
              {reports.length} rapport{reports.length > 1 ? 's' : ''} généré{reports.length > 1 ? 's' : ''} — cliquez sur <strong>Imprimer</strong> pour exporter en PDF ou imprimer.
            </p>
            {reports.map((report) => (
              <div key={report.facility.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <FacilityReportSheet report={report} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
