'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, MapPin, X, Check } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

interface Region {
  id: string
  name: string
  code: string
  _count: { facilities: number }
}

const EMPTY_FORM = { name: '', code: '' }

interface RegionsAdminPageProps {
  role: string
}

export function RegionsAdminPage({ role }: RegionsAdminPageProps) {
  const canDelete = role === 'SUPER_ADMIN'

  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string>('')

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Region | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Region | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = () => {
    fetch('/api/regions')
      .then((r) => r.json())
      .then((d) => { setRegions(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  // Récupérer l'orgId depuis la première région ou depuis la session
  useEffect(() => {
    fetch('/api/regions')
      .then((r) => r.json())
      .then((d) => {
        const data: any[] = d.data || []
        setRegions(data)
        setLoading(false)
        // Chercher l'orgId dans les données existantes
        if (data.length > 0 && data[0].organizationId) setOrgId(data[0].organizationId)
      })
      .catch(() => setLoading(false))

    // Charger l'orgId depuis l'API organisations
    fetch('/api/regions?withOrg=1')
      .then((r) => r.json())
      .then((d) => { if (d.orgId) setOrgId(d.orgId) })
      .catch(() => {})
  }, [])

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (r: Region) => { setEditTarget(r); setForm({ name: r.name, code: r.code }); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditTarget(null); setForm(EMPTY_FORM) }

  const submit = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Nom et code sont obligatoires')
      return
    }
    setFormLoading(true)
    try {
      const isEdit = !!editTarget
      const url = isEdit ? `/api/regions/${editTarget.id}` : '/api/regions'
      const method = isEdit ? 'PATCH' : 'POST'
      const body = isEdit
        ? { name: form.name, code: form.code }
        : { name: form.name, code: form.code, organizationId: orgId || 'org-oeuvre-sante' }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success(isEdit ? 'Région modifiée' : 'Région créée')
      closeForm()
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setFormLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/regions/${deleteTarget.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success('Région supprimée')
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Régions sanitaires"
        description="Gérez les régions sanitaires de l'organisation"
        action={
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition">
            <Plus className="w-4 h-4" />
            Nouvelle région
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {regions.map((region) => (
            <div key={region.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{region.name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{region.code}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {region._count.facilities} formation{region._count.facilities !== 1 ? 's' : ''} sanitaire{region._count.facilities !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(region)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition"
                  title="Modifier">
                  <Pencil className="w-4 h-4" />
                </button>
                {canDelete && (
                  <button onClick={() => setDeleteTarget(region)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {regions.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              Aucune région sanitaire configurée
            </div>
          )}
        </div>
      )}

      {/* Modal création / édition */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {editTarget ? 'Modifier la région' : 'Nouvelle région sanitaire'}
              </h3>
              <button onClick={closeForm} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nom de la région <span className="text-red-400">*</span></label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Région Sanitaire Nord"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Code <span className="text-red-400">*</span></label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="RS-NORD"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">Le code est automatiquement mis en majuscules</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeForm}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Annuler
              </button>
              <button onClick={submit} disabled={formLoading || !form.name.trim() || !form.code.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition">
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editTarget ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Supprimer la région</h3>
                <p className="text-sm text-gray-500 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Voulez-vous supprimer <span className="font-semibold">{deleteTarget.name}</span> ?
              {deleteTarget._count.facilities > 0 && (
                <span className="block mt-1 text-orange-500">
                  Attention : {deleteTarget._count.facilities} formation(s) rattachée(s).
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Annuler
              </button>
              <button onClick={confirmDelete} disabled={deleteLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition">
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
