'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Plus, Trash2, TrendingUp, TrendingDown, Filter, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { formatCurrency } from '@care-connekt/shared'
import { EXPENSE_CATEGORIES } from '@care-connekt/shared'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'

const REVENUE_CATEGORIES = [
  'Consultations', 'Hospitalisations', 'Pharmacie', 'Laboratoire',
  'Imagerie', 'Maternité', 'Urgences', 'Chirurgie', 'Autres recettes',
]

export function BudgetPage() {
  const { data: session } = useSession()
  const [budgets, setBudgets] = useState<any[]>([])
  const [facilities, setFacilities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [declarationType, setDeclarationType] = useState<'EXPENSE' | 'REVENUE'>('EXPENSE')
  const [facilityId, setFacilityId] = useState('')

  const role = session?.user?.role || ''
  const canEdit = ['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'].includes(role)

  const [form, setForm] = useState({
    facilityId: '',
    declarationType: 'EXPENSE' as 'EXPENSE' | 'REVENUE',
    year: currentYear,
    month: '' as any,
    category: '',
    planned: '',
    notes: '',
  })

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ year: String(year), declarationType })
    if (facilityId) params.set('facilityId', facilityId)
    fetch(`/api/budget?${params}`)
      .then((r) => r.json())
      .then((d) => { setBudgets(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetch('/api/facilities')
      .then((r) => r.json())
      .then((d) => setFacilities(d.data || []))
  }, [])

  useEffect(() => { load() }, [year, declarationType, facilityId])

  const handleSave = async () => {
    if (!form.facilityId || !form.category || !form.planned) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          year: Number(form.year),
          month: form.month ? Number(form.month) : null,
          planned: Number(form.planned),
        }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success('Budget enregistré')
      setShowModal(false)
      setForm({ facilityId: '', declarationType, year: currentYear, month: '', category: '', planned: '', notes: '' })
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette ligne budgétaire ?')) return
    await fetch(`/api/budget?id=${id}`, { method: 'DELETE' })
    toast.success('Supprimé')
    load()
  }

  const totalPlanned = budgets.reduce((s, b) => s + b.planned, 0)
  const totalActual = budgets.reduce((s, b) => s + b.actual, 0)
  const categories = declarationType === 'EXPENSE' ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES

  const chartData = budgets.map((b) => ({
    name: b.category.length > 14 ? b.category.slice(0, 12) + '…' : b.category,
    Prévu: b.planned,
    Réel: b.actual,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suivi budgétaire"
        description="Comparaison budget prévu vs réalisé par formation sanitaire"
        action={canEdit ? (
          <button
            onClick={() => { setForm({ facilityId, declarationType, year, month: '', category: categories[0], planned: '', notes: '' }); setShowModal(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Nouvelle ligne
          </button>
        ) : undefined}
      />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-end bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Année</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <select value={declarationType} onChange={(e) => setDeclarationType(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="EXPENSE">Dépenses</option>
            <option value="REVENUE">Recettes</option>
          </select>
        </div>
        {canEdit && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Formation</label>
            <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[200px]">
              <option value="">Toutes les formations</option>
              {facilities.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}
        <button onClick={load} className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition">
          <Filter className="w-4 h-4" /> Filtrer
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-1">
            {declarationType === 'EXPENSE' ? <TrendingDown className="w-4 h-4 text-orange-500" /> : <TrendingUp className="w-4 h-4 text-teal-500" />}
            <p className="text-sm text-gray-500">Budget total prévu</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalPlanned)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-sm text-gray-500 mb-1">Réalisé (validé)</p>
          <p className={`text-2xl font-bold ${declarationType === 'EXPENSE' ? 'text-orange-600' : 'text-teal-600'}`}>
            {formatCurrency(totalActual)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-sm text-gray-500 mb-1">Écart (Réalisé − Prévu)</p>
          <p className={`text-2xl font-bold ${totalActual - totalPlanned > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(totalActual - totalPlanned)}
          </p>
          {totalPlanned > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Taux d'exécution : {Math.round((totalActual / totalPlanned) * 100)}%
            </p>
          )}
        </div>
      </div>

      {/* Graphique */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Prévu vs Réalisé par catégorie</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="Prévu" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Réel" fill={declarationType === 'EXPENSE' ? '#f97316' : '#14b8a6'} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Détail des lignes budgétaires</h2>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-32"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 text-left">Formation</th>
                <th className="px-4 py-3 text-left">Catégorie</th>
                <th className="px-4 py-3 text-right">Prévu</th>
                <th className="px-4 py-3 text-right">Réalisé</th>
                <th className="px-4 py-3 text-right">Écart</th>
                <th className="px-4 py-3 text-right">Taux</th>
                {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {budgets.map((b) => {
                const ecart = b.actual - b.planned
                const over = ecart > 0
                return (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.facility?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{b.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(b.planned)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${declarationType === 'EXPENSE' ? 'text-orange-600' : 'text-teal-600'}`}>
                      {formatCurrency(b.actual)}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${over ? 'text-red-600' : 'text-green-600'}`}>
                      {over ? '+' : ''}{formatCurrency(ecart)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.rate !== null ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${b.rate > 100 ? 'bg-red-100 text-red-700' : b.rate > 80 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {b.rate}%
                        </span>
                      ) : '—'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(b.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
              {budgets.length === 0 && (
                <tr><td colSpan={canEdit ? 7 : 6} className="px-4 py-10 text-center text-gray-400">Aucune ligne budgétaire. {canEdit && 'Cliquez sur "Nouvelle ligne" pour commencer.'}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Nouvelle ligne budgétaire</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Formation sanitaire <span className="text-red-400">*</span></label>
                <select value={form.facilityId} onChange={(e) => setForm((p) => ({ ...p, facilityId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Sélectionner...</option>
                  {facilities.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select value={form.declarationType} onChange={(e) => setForm((p) => ({ ...p, declarationType: e.target.value as any, category: '' }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="EXPENSE">Dépenses</option>
                  <option value="REVENUE">Recettes</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Année</label>
                <input type="number" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mois (optionnel)</label>
                <select value={form.month} onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Annuel</option>
                  {['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'].map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Catégorie <span className="text-red-400">*</span></label>
                <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Sélectionner...</option>
                  {(form.declarationType === 'EXPENSE' ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Montant prévu (FCFA) <span className="text-red-400">*</span></label>
                <input type="number" min="0" step="1000" value={form.planned} onChange={(e) => setForm((p) => ({ ...p, planned: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
