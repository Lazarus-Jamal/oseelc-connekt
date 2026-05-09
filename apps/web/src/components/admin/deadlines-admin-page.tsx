'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Bell, Loader2, CalendarClock } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { MONTHS_FR } from '@care-connekt/shared'

interface DeadlinesAdminPageProps {
  role: string
}

interface Deadline {
  id: string
  dueDay: number
  alertDays: number
  month: number | null
  year: number | null
  note: string | null
  region: { id: string; name: string } | null
  facility: { id: string; name: string } | null
  createdBy: { name: string }
  createdAt: string
}

interface Region { id: string; name: string }
interface Facility { id: string; name: string; regionId: string }

const EMPTY_FORM = { dueDay: 15, alertDays: 3, month: '', year: '', regionId: '', facilityId: '', note: '' }

export function DeadlinesAdminPage({ role }: DeadlinesAdminPageProps) {
  const isAdmin = role === 'SUPER_ADMIN' || role === 'DATA_ADMIN'

  const [deadlines, setDeadlines]   = useState<Deadline[]>([])
  const [regions,   setRegions]     = useState<Region[]>([])
  const [facilities,setFacilities]  = useState<Facility[]>([])
  const [loading,   setLoading]     = useState(true)
  const [showForm,  setShowForm]    = useState(false)
  const [saving,    setSaving]      = useState(false)
  const [form,      setForm]        = useState(EMPTY_FORM)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/deadlines')
      .then(r => r.json())
      .then(d => setDeadlines(d.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/regions').then(r => r.json()).then(d => setRegions(d.data || []))
    fetch('/api/facilities?limit=200').then(r => r.json()).then(d => setFacilities(d.data || []))
  }, [isAdmin])

  const filteredFacilities = form.regionId
    ? facilities.filter(f => f.regionId === form.regionId)
    : facilities

  const save = async () => {
    const parsedDueDay   = parseInt(String(form.dueDay),   10)
    const parsedAlertDay = parseInt(String(form.alertDays), 10)
    if (!parsedDueDay || parsedDueDay < 1 || parsedDueDay > 28) {
      toast.error('Le jour limite doit être entre 1 et 28'); return
    }
    if (!parsedAlertDay || parsedAlertDay < 1) {
      toast.error('Le délai d\'alerte doit être au moins 1 jour'); return
    }
    setSaving(true)
    try {
      const payload: any = {
        dueDay:    parsedDueDay,
        alertDays: parsedAlertDay,
        ...(form.month      ? { month:      parseInt(String(form.month), 10) } : {}),
        ...(form.year       ? { year:       parseInt(String(form.year),  10) } : {}),
        ...(form.regionId   ? { regionId:   form.regionId }   : {}),
        ...(form.facilityId ? { facilityId: form.facilityId } : {}),
        ...(form.note       ? { note:       form.note }       : {}),
      }
      const res = await fetch('/api/admin/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success('Délai créé avec succès')
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce délai ?')) return
    await fetch(`/api/admin/deadlines/${id}`, { method: 'DELETE' })
    toast.success('Supprimé')
    load()
  }

  const scopeLabel = (d: Deadline) => {
    if (d.facility) return `Centre : ${d.facility.name}`
    if (d.region)   return `Région : ${d.region.name}`
    return 'National (toutes structures)'
  }

  const periodLabel = (d: Deadline) => {
    if (d.month && d.year) return `${MONTHS_FR[d.month - 1]} ${d.year}`
    if (d.month) return `Chaque ${MONTHS_FR[d.month - 1]}`
    return 'Tous les mois'
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <PageHeader
          title="Délais de promptitude"
          description="Définissez les échéances de soumission des fiches statistiques et les alertes associées"
        />
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition"
          >
            <Plus className="w-4 h-4" /> Nouveau délai
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-brand-500" /> Nouveau délai de promptitude
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Mois (vide = tous)</label>
              <select value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800">
                <option value="">— Tous les mois —</option>
                {MONTHS_FR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Année (vide = récurrent)</label>
              <input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
                placeholder="ex: 2025"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Jour limite (du mois suivant)</label>
              <input type="number" min={1} max={28} value={form.dueDay} onChange={e => setForm(p => ({ ...p, dueDay: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Alerter X jours avant</label>
              <input type="number" min={1} max={30} value={form.alertDays} onChange={e => setForm(p => ({ ...p, alertDays: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Région (vide = national)</label>
              <select value={form.regionId} onChange={e => setForm(p => ({ ...p, regionId: e.target.value, facilityId: '' }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800">
                <option value="">— Toutes les régions —</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Centre spécifique (optionnel)</label>
              <select value={form.facilityId} onChange={e => setForm(p => ({ ...p, facilityId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800">
                <option value="">— Toutes les structures —</option>
                {filteredFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Note</label>
              <input type="text" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                placeholder="Instructions complémentaires..."
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
              Annuler
            </button>
            <button onClick={save} disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Créer le délai
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : deadlines.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Aucun délai configuré</p>
            <p className="text-sm mt-1">Créez un délai pour alerter les data managers avant l'échéance.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Période</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Scope</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Jour limite</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Alerte</th>
                {isAdmin && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {deadlines.map(d => (
                <tr key={d.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{periodLabel(d)}</td>
                  <td className="px-5 py-3 text-gray-500">{scopeLabel(d)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400">
                      J+{d.dueDay}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 font-medium">
                      <Bell className="w-3 h-3" /> {d.alertDays} j avant
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => remove(d.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
