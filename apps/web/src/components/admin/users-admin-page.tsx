'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Loader2 } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { formatDate, ROLES_LABELS } from '@care-connekt/shared'

interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  facility: { name: string } | null
  region: { name: string } | null
}

export function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', role: 'FINANCIER', facilityId: '', regionId: '' })
  const [facilities, setFacilities] = useState<any[]>([])
  const [regions, setRegions] = useState<any[]>([])

  const load = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    fetch(`/api/users?${params}`)
      .then((r) => r.json())
      .then((d) => { setUsers(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [search])
  useEffect(() => {
    fetch('/api/facilities').then((r) => r.json()).then((d) => setFacilities(d.data || []))
    fetch('/api/regions').then((r) => r.json()).then((d) => setRegions(d.data || []))
  }, [])

  const submit = async () => {
    setFormLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success(`Utilisateur créé. Mot de passe temporaire : ${result.data.tempPassword}`, { duration: 10000 })
      setShowForm(false)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setFormLoading(false)
    }
  }

  const columns: Column<User>[] = [
    { key: 'name', header: 'Nom', cell: (row) => <div><p className="font-medium text-sm text-gray-900 dark:text-white">{row.name}</p><p className="text-xs text-gray-500">{row.email}</p></div> },
    { key: 'role', header: 'Rôle', cell: (row) => <span className="text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded-full font-medium">{ROLES_LABELS[row.role] || row.role}</span> },
    { key: 'facility', header: 'Formation / Région', cell: (row) => <span className="text-sm text-gray-500">{row.facility?.name || row.region?.name || '—'}</span> },
    { key: 'status', header: 'Statut', cell: (row) => <span className={`text-xs font-medium ${row.isActive ? 'text-green-600' : 'text-red-500'}`}>{row.isActive ? 'Actif' : 'Inactif'}</span> },
    { key: 'lastLogin', header: 'Dernière connexion', cell: (row) => <span className="text-xs text-gray-500">{row.lastLoginAt ? formatDate(row.lastLoginAt) : 'Jamais'}</span> },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Gestion des utilisateurs"
        description="Gérez les accès à la plateforme"
        action={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Nouvel utilisateur
          </button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <DataTable columns={columns} data={users} isLoading={loading} emptyMessage="Aucun utilisateur trouvé" />

      {/* Modal création */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Nouvel utilisateur</h3>
            {[
              { key: 'name', label: 'Nom complet', type: 'text' },
              { key: 'email', label: 'Email', type: 'email' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input type={type} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Rôle</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                {Object.entries(ROLES_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
              </select>
            </div>
            {/* Formation sanitaire — obligatoire pour Financier/Chef, optionnel pour DATA_MANAGER (facility-level si renseigné) */}
            {['FINANCIER', 'FACILITY_CHIEF'].includes(form.role) && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Formation sanitaire</label>
                <select value={form.facilityId} onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">-- Sélectionner --</option>
                  {facilities.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            {form.role === 'DATA_MANAGER' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Niveau</label>
                  <p className="text-xs text-gray-400 mb-2">Laissez vide pour un Data Manager national. Renseignez la région pour un DM régional, ou la formation pour un DM de centre.</p>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Région (DM régional)</label>
                  <select value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value, facilityId: '' })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">— National (toutes régions) —</option>
                    {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Formation sanitaire (DM de centre)</label>
                  <select value={form.facilityId} onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">— Aucune (régional ou national) —</option>
                    {facilities.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </>
            )}
            {form.role === 'REGIONAL_DIRECTOR' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Région sanitaire</label>
                <select value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">-- Sélectionner --</option>
                  {regions.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={submit} disabled={formLoading || !form.email || !form.name}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition">
                {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
