'use client'

import { useEffect, useState } from 'react'
import { Download, TrendingUp, TrendingDown, Scale, Filter } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency } from '@care-connekt/shared'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { toast } from 'sonner'

const COLORS = ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const EXPENSE_COLORS = ['#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', '#f59e0b', '#14b8a6', '#64748b', '#10b981']

export function ReportsPage() {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'expense'>('overview')

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    fetch(`/api/reports/financial?${params}`)
      .then((r) => r.json())
      .then((d) => { setReport(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const exportToPDF = async () => {
    if (!report) return
    toast.info('Génération du PDF...')
    const { formatCurrency } = await import('@care-connekt/shared')
    const { exportPDF } = await import('@/lib/pdf-export')

    const periodLabel = from || to
      ? `Période : ${from ? new Date(from).toLocaleDateString('fr-FR') : '…'} → ${to ? new Date(to).toLocaleDateString('fr-FR') : 'aujourd\'hui'}`
      : 'Toutes périodes confondues'

    await exportPDF({
      filename: `rapport-financier-${new Date().toISOString().slice(0, 10)}.pdf`,
      title: 'Rapport financier consolidé',
      subtitle: periodLabel,
      summary: [
        { label: 'Recettes totales', value: formatCurrency(report.summary?.totalRevenue || 0) },
        { label: 'Dépenses totales', value: formatCurrency(report.summary?.totalExpense || 0) },
        { label: 'Solde net', value: formatCurrency(report.summary?.netBalance || 0) },
        { label: 'Déclarations recettes', value: String(report.summary?.revenueCount || 0) },
        { label: 'Déclarations dépenses', value: String(report.summary?.expenseCount || 0) },
      ],
      sections: [
        {
          title: 'Évolution mensuelle',
          head: [['Période', 'Recettes (FCFA)', 'Dépenses (FCFA)', 'Solde net (FCFA)']],
          body: (report.comparison || []).map((m: any) => [
            m.label,
            formatCurrency(m.revenue),
            formatCurrency(m.expense),
            formatCurrency(m.net),
          ]),
        },
        {
          title: 'Recettes par formation sanitaire',
          head: [['Formation', 'Type', 'Déclarations', 'Recettes (FCFA)']],
          body: (report.revenue?.byFacility || []).map((f: any) => [
            f.name,
            f.type === 'HOSPITAL' ? 'Hôpital' : 'Centre de Santé',
            f.count,
            formatCurrency(f.total),
          ]),
        },
        {
          title: 'Dépenses par formation sanitaire',
          head: [['Formation', 'Type', 'Déclarations', 'Dépenses (FCFA)']],
          body: (report.expense?.byFacility || []).map((f: any) => [
            f.name,
            f.type === 'HOSPITAL' ? 'Hôpital' : 'Centre de Santé',
            f.count,
            formatCurrency(f.total),
          ]),
        },
        {
          title: 'Dépenses par catégorie',
          head: [['Catégorie', 'Montant (FCFA)']],
          body: (report.expense?.byCategory || []).map((c: any) => [c.category, formatCurrency(c.total)]),
        },
      ],
    })
    toast.success('PDF téléchargé')
  }

  const exportToExcel = async () => {
    toast.info('Export en cours...')
    const { utils, writeFile } = await import('xlsx')
    if (!report) return

    const wb = utils.book_new()

    const summaryWs = utils.json_to_sheet([{
      'Recettes totales (FCFA)': report.summary?.totalRevenue || 0,
      'Dépenses totales (FCFA)': report.summary?.totalExpense || 0,
      'Solde net (FCFA)': report.summary?.netBalance || 0,
      'Nb décl. recettes': report.summary?.revenueCount || 0,
      'Nb décl. dépenses': report.summary?.expenseCount || 0,
    }])
    utils.book_append_sheet(wb, summaryWs, 'Résumé')

    if (report.comparison?.length) {
      const compWs = utils.json_to_sheet(report.comparison.map((m: any) => ({
        Période: m.label,
        'Recettes (FCFA)': m.revenue,
        'Dépenses (FCFA)': m.expense,
        'Solde net (FCFA)': m.net,
      })))
      utils.book_append_sheet(wb, compWs, 'Comparaison mensuelle')
    }

    if (report.revenue?.byFacility?.length) {
      const revFacWs = utils.json_to_sheet(report.revenue.byFacility.map((f: any) => ({
        Formation: f.name,
        Type: f.type,
        'Déclarations': f.count,
        'Recettes (FCFA)': f.total,
      })))
      utils.book_append_sheet(wb, revFacWs, 'Recettes par formation')
    }

    if (report.expense?.byFacility?.length) {
      const expFacWs = utils.json_to_sheet(report.expense.byFacility.map((f: any) => ({
        Formation: f.name,
        Type: f.type,
        'Déclarations': f.count,
        'Dépenses (FCFA)': f.total,
      })))
      utils.book_append_sheet(wb, expFacWs, 'Dépenses par formation')
    }

    if (report.expense?.byCategory?.length) {
      const expCatWs = utils.json_to_sheet(report.expense.byCategory.map((c: any) => ({
        Catégorie: c.category,
        'Montant (FCFA)': c.total,
      })))
      utils.book_append_sheet(wb, expCatWs, 'Dépenses par catégorie')
    }

    writeFile(wb, `rapport-financier-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Fichier Excel exporté')
  }

  const tabs = [
    { key: 'overview', label: 'Vue d\'ensemble' },
    { key: 'revenue', label: 'Recettes' },
    { key: 'expense', label: 'Dépenses' },
  ] as const

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports financiers"
        description="Analyse et export des recettes et dépenses consolidées"
        action={
          <div className="flex gap-2">
            <button
              onClick={exportToPDF}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        }
      />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-end bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Du</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Au</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <button onClick={load}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition">
          <Filter className="w-4 h-4" />
          Filtrer
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPIs résumé */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-teal-500" />
                <p className="text-sm text-gray-500">Recettes totales validées</p>
              </div>
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{formatCurrency(report?.summary?.totalRevenue || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{report?.summary?.revenueCount || 0} déclarations</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-orange-500" />
                <p className="text-sm text-gray-500">Dépenses totales validées</p>
              </div>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(report?.summary?.totalExpense || 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{report?.summary?.expenseCount || 0} déclarations</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Scale className="w-4 h-4 text-blue-500" />
                <p className="text-sm text-gray-500">Solde net</p>
              </div>
              <p className={`text-2xl font-bold ${(report?.summary?.netBalance || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(report?.summary?.netBalance || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Recettes − Dépenses</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${activeTab === tab.key ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Vue d'ensemble */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Graphique comparatif mensuel */}
              {(report?.comparison?.length || 0) > 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Évolution mensuelle — Recettes vs Dépenses</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={report.comparison} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
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
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                  <p className="text-gray-400">Aucune donnée disponible pour la période sélectionnée</p>
                </div>
              )}

              {/* Solde net mensuel (ligne) */}
              {(report?.comparison?.length || 0) > 1 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Solde net mensuel</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={report.comparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Line type="monotone" dataKey="net" name="Solde net" stroke="#3b82f6" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tableau comparatif par formation */}
              {(report?.revenue?.byFacility?.length || 0) > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Récapitulatif par formation sanitaire</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500">
                        <th className="px-4 py-3 text-left">Formation</th>
                        <th className="px-4 py-3 text-right">Recettes</th>
                        <th className="px-4 py-3 text-right">Dépenses</th>
                        <th className="px-4 py-3 text-right">Solde</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {report.revenue.byFacility.map((f: any) => {
                        const expFacility = report.expense?.byFacility?.find((e: any) => e.facilityId === f.facilityId)
                        const totalExp = expFacility?.total || 0
                        const net = f.total - totalExp
                        return (
                          <tr key={f.facilityId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{f.name}</td>
                            <td className="px-4 py-3 text-right font-medium text-teal-600 dark:text-teal-400">{formatCurrency(f.total)}</td>
                            <td className="px-4 py-3 text-right font-medium text-orange-600 dark:text-orange-400">{formatCurrency(totalExp)}</td>
                            <td className="px-4 py-3 text-right font-semibold">
                              <span className={net >= 0 ? 'text-green-600' : 'text-red-500'}>{formatCurrency(net)}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Recettes */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Évolution mensuelle des recettes</h3>
                  {(report?.revenue?.byMonth?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={report.revenue.byMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Line type="monotone" dataKey="total" name="Recettes" stroke="#14b8a6" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-gray-400 py-12">Aucune donnée</p>}
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recettes par catégorie</h3>
                  {(report?.revenue?.byCategory?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={report.revenue.byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80}
                          label={({ name, percent }: any) => `${name.slice(0, 12)}: ${Math.round(percent * 100)}%`}>
                          {report.revenue.byCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-gray-400 py-12">Aucune donnée</p>}
                </div>
              </div>

              {(report?.revenue?.byFacility?.length || 0) > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Recettes par formation sanitaire</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500">
                        <th className="px-4 py-3 text-left">Formation</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-right">Déclarations</th>
                        <th className="px-4 py-3 text-right">Recettes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {report.revenue.byFacility.map((f: any) => (
                        <tr key={f.facilityId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{f.name}</td>
                          <td className="px-4 py-3 text-gray-500"><span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{f.type === 'HOSPITAL' ? 'Hôpital' : 'Centre'}</span></td>
                          <td className="px-4 py-3 text-right text-gray-600">{f.count}</td>
                          <td className="px-4 py-3 text-right font-semibold text-teal-600 dark:text-teal-400">{formatCurrency(f.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Dépenses */}
          {activeTab === 'expense' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Évolution mensuelle des dépenses</h3>
                  {(report?.expense?.byMonth?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={report.expense.byMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Line type="monotone" dataKey="total" name="Dépenses" stroke="#f97316" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-gray-400 py-12">Aucune donnée</p>}
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Dépenses par catégorie</h3>
                  {(report?.expense?.byCategory?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={report.expense.byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80}
                          label={({ name, percent }: any) => `${name.slice(0, 12)}: ${Math.round(percent * 100)}%`}>
                          {report.expense.byCategory.map((_: any, i: number) => <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-gray-400 py-12">Aucune donnée</p>}
                </div>
              </div>

              {(report?.expense?.byFacility?.length || 0) > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Dépenses par formation sanitaire</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500">
                        <th className="px-4 py-3 text-left">Formation</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-right">Déclarations</th>
                        <th className="px-4 py-3 text-right">Dépenses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {report.expense.byFacility.map((f: any) => (
                        <tr key={f.facilityId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{f.name}</td>
                          <td className="px-4 py-3 text-gray-500"><span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{f.type === 'HOSPITAL' ? 'Hôpital' : 'Centre'}</span></td>
                          <td className="px-4 py-3 text-right text-gray-600">{f.count}</td>
                          <td className="px-4 py-3 text-right font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(f.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
