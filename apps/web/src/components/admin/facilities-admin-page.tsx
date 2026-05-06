'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Plus, Search, Loader2, Building2, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check, Wand2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { FACILITY_TYPE_LABELS } from '@care-connekt/shared'

interface Facility {
  id: string
  name: string
  code: string
  type: string
  isActive: boolean
  address?: string
  phone?: string
  email?: string
  regionId: string
  region: { id: string; name: string; code: string }
  _count: { users: number; declarations: number }
}

const EMPTY_FORM = { name: '', code: '', type: 'HEALTH_CENTER', regionId: '', address: '', phone: '', email: '' }

export function FacilitiesAdminPage() {
  const { data: session } = useSession()
  const role = session?.user?.role || ''
  const canDelete = role === 'SUPER_ADMIN'

  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [regions, setRegions] = useState<any[]>([])

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Facility | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)

  const [codeIsGenerated, setCodeIsGenerated] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Facility | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toggleLoading, setToggleLoading] = useState<string | null>(null)

  const load = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    fetch(`/api/facilities?${params}`)
      .then((r) => r.json())
      .then((d) => { setFacilities(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [search])
  useEffect(() => {
    fetch('/api/regions').then((r) => r.json()).then((d) => setRegions(d.data || []))
  }, [])

  useEffect(() => {
    if (editTarget || !form.regionId || !form.type || regions.length === 0) return
    const region = regions.find((r: any) => r.id === form.regionId)
    if (!region) return
    const regionCode = (region.code || region.name).toUpperCase().slice(0, 4).replace(/\s/g, '')
    const typeCode = form.type === 'HOSPITAL' ? 'HOP' : 'CSI'
    fetch(`/api/facilities?regionId=${form.regionId}&type=${form.type}`)
      .then((r) => r.json())
      .then((d) => {
        const seq = String((d.data || []).length + 1).padStart(3, '0')
        setForm((prev) => ({ ...prev, code: `${regionCode}-${typeCode}-${seq}` }))
        setCodeIsGenerated(true)
      })
  }, [form.regionId, form.type, editTarget, regions])

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setCodeIsGenerated(false); setShowForm(true) }
  const openEdit = (f: Facility) => {
    setEditTarget(f)
    setCodeIsGenerated(false)
    setForm({ name: f.name, code: f.code, type: f.type, regionId: f.regionId, address: f.address || '', phone: f.phone || '', email: f.email || '' })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditTarget(null); setForm(EMPTY_FORM); setCodeIsGenerated(false) }

  const submit = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.regionId) {
      toast.error('Nom, code et région sont obligatoires')
      return
    }
    setFormLoading(true)
    try {
      const isEdit = !!editTarget
      const url = isEdit ? `/api/facilities/${editTarget.id}` : '/api/facilities'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, code: form.code.toUpperCase() }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success(isEdit ? 'Formation modifiée' : 'Formation créée')
      closeForm()
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setFormLoading(false)
    }
  }

  const toggleActive = async (f: Facility) => {
    setToggleLoading(f.id)
    try {
      const res = await fetch(`/api/facilities/${f.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !f.isActive }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success(f.isActive ? 'Formation désactivée' : 'Formation activée')
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setToggleLoading(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/facilities/${deleteTarget.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success('Formation supprimée')
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDeleteLoading(false)
    }
  }

    const CONTACT_FIELDS = [
    { key: 'address', label: 'Adresse',   placeholder: 'Adresse complète',     required: false },
    { key: 'phone',   label: 'Téléphone', placeholder: '+XXX XX XX XX XX',     required: false },
    { key: 'email',   label: 'Email',     placeholder: 'contact@exemple.org',  required: false },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Formations sanitaires"
        description="Gérez les hôpitaux et centres de santé"
        action={
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition">
            <Plus className="w-4 h-4" />
            Nouvelle formation
          </button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Rechercher par nom ou code..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Formation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Région</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisateurs</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Déclarations</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {facilities.map((f) => (
                <tr key={f.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 transition ${!f.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${f.type === 'HOSPITAL' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                        <Building2 className={`w-4 h-4 ${f.type === 'HOSPITAL' ? 'text-blue-600' : 'text-green-600'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{f.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{f.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{FACILITY_TYPE_LABELS[f.type]}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{f.region?.name || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{f._count?.users ?? 0}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{f._count?.declarations ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${f.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {f.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(f)} title="Modifier"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleActive(f)} disabled={toggleLoading === f.id}
                        title={f.isActive ? 'Désactiver' : 'Activer'}
                        className={`p-1.5 rounded-lg transition ${f.isActive ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                        {toggleLoading === f.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : f.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />
                        }
                      </button>
                      {canDelete && (
                        <button onClick={() => setDeleteTarget(f)} title="Supprimer"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {facilities.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Aucune formation sanitaire</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal création / édition */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {editTarget ? 'Modifier la formation' : 'Nouvelle formation sanitaire'}
              </h3>
              <button onClick={closeForm} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Nom */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nom <span className="text-red-400">*</span></label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Centre de Santé de..."
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type <span className="text-red-400">*</span></label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="HEALTH_CENTER">Centre de Santé</option>
                <option value="HOSPITAL">Hôpital</option>
              </select>
            </div>

            {/* Région */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Région sanitaire <span className="text-red-400">*</span></label>
              <select value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">-- Sélectionner --</option>
                {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            {/* Code (auto-généré) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                Code <span className="text-red-400">*</span>
                {codeIsGenerated && !editTarget && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-1.5 py-0.5 rounded-full">
                    <Wand2 className="w-2.5 h-2.5" />
                    auto
                  </span>
                )}
              </label>
              <input
                value={form.code}
                onChange={(e) => { setForm({ ...form, code: e.target.value.toUpperCase() }); setCodeIsGenerated(false) }}
                placeholder={form.regionId && form.type ? 'Génération en cours…' : 'Sélectionnez le type et la région d\'abord'}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
              {!editTarget && !form.regionId && (
                <p className="mt-1 text-[11px] text-gray-400">Le code sera généré automatiquement après sélection du type et de la région</p>
              )}
            </div>

            {/* Contact */}
            {CONTACT_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeForm}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Annuler
              </button>
              <button onClick={submit} disabled={formLoading || !form.name.trim() || !form.code.trim() || !form.regionId}
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
                <h3 className="font-semibold text-gray-900 dark:text-white">Supprimer la formation</h3>
                <p className="text-sm text-gray-500 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Voulez-vous supprimer <span className="font-semibold">{deleteTarget.name}</span> ?
            </p>
            {deleteTarget._count.declarations > 0 && (
              <p className="text-xs text-orange-500 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-2">
                Cette formation a {deleteTarget._count.declarations} déclaration(s) — la suppression sera bloquée. Utilisez plutôt la désactivation.
              </p>
            )}
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
