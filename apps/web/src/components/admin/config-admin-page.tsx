'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Settings, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { PERIOD_TYPE_LABELS } from '@care-connekt/shared'

export function ConfigAdminPage() {
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<any>({})
  const [showNew, setShowNew] = useState(false)
  const [newConfig, setNewConfig] = useState({ periodType: 'DAILY', isGlobal: true, deadline: 3 })

  const load = () => {
    fetch('/api/config/period')
      .then((r) => r.json())
      .then((d) => { setConfigs(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/config/period', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, ...editValues }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success('Configuration mise à jour')
      setEditId(null)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const create = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/config/period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success('Configuration créée')
      setShowNew(false)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Configuration système"
        description="Paramétrez les périodes de déclaration"
        action={
          <button onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition">
            <Settings className="w-4 h-4" />
            Nouvelle config
          </button>
        }
      />

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Périodes de déclaration</h2>
          <p className="text-xs text-gray-500 mt-1">Configurez la fréquence et les délais de soumission des déclarations</p>
        </div>

        {loading ? (
          <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {configs.map((config) => (
              <div key={config.id} className="px-5 py-4">
                {editId === config.id ? (
                  <div className="flex flex-wrap gap-3 items-center">
                    <select value={editValues.periodType} onChange={(e) => setEditValues({ ...editValues, periodType: e.target.value })}
                      className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800">
                      {Object.entries(PERIOD_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Délai (jours)</label>
                      <input type="number" min={1} max={30} value={editValues.deadline}
                        onChange={(e) => setEditValues({ ...editValues, deadline: Number(e.target.value) })}
                        className="w-16 px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-center bg-white dark:bg-gray-800" />
                    </div>
                    <div className="flex gap-2 ml-auto">
                      <button onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
                      <button onClick={save} disabled={saving}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                        Sauvegarder
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {PERIOD_TYPE_LABELS[config.periodType] || config.periodType}
                        </span>
                        {config.isGlobal && (
                          <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded-full">Global</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Délai de soumission : {config.deadline} jour{config.deadline > 1 ? 's' : ''} après la période
                        {config.facility && ` — ${config.facility.name}`}
                        {config.region && ` — ${config.region.name}`}
                      </p>
                    </div>
                    <button
                      onClick={() => { setEditId(config.id); setEditValues({ periodType: config.periodType, deadline: config.deadline }) }}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Modifier
                    </button>
                  </div>
                )}
              </div>
            ))}
            {configs.length === 0 && <p className="px-5 py-8 text-center text-sm text-gray-400">Aucune configuration</p>}
          </div>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Nouvelle configuration</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type de période</label>
              <select value={newConfig.periodType} onChange={(e) => setNewConfig({ ...newConfig, periodType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800">
                {Object.entries(PERIOD_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Délai de soumission (jours)</label>
              <input type="number" min={1} max={30} value={newConfig.deadline}
                onChange={(e) => setNewConfig({ ...newConfig, deadline: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isGlobal" checked={newConfig.isGlobal}
                onChange={(e) => setNewConfig({ ...newConfig, isGlobal: e.target.checked })}
                className="rounded border-gray-300" />
              <label htmlFor="isGlobal" className="text-sm text-gray-700 dark:text-gray-300">Appliquer à toute l'organisation</label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={create} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
