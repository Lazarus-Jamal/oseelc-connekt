'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Shield, Edit2, Power, Trash2, KeyRound, Loader2, X, AlertTriangle } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { ROLES_LABELS } from '@care-connekt/shared'

import { UserForm } from './user-form'

interface UsersAdminPageProps {
  role: string
  currentUserId: string | null
}

interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  facility: { id: string; name: string } | null
  region: { id: string; name: string } | null
}

export function UsersAdminPage({ role, currentUserId }: UsersAdminPageProps) {
  const currentUserRole = role
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN'
  const canManage = ['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'].includes(currentUserRole)

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [facilities, setFacilities] = useState<any[]>([])
  const [regions, setRegions] = useState<any[]>([])

  // States for actions
  const [actionLoading, setActionLoading] = useState<string | null>(null) // Row ID being processed
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!canManage) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-red-100 dark:border-red-800 shadow-sm">
        <h2 className="text-lg font-bold text-red-700 dark:text-red-300">Accès refusé</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Vous n'avez pas les droits nécessaires pour gérer les comptes utilisateurs.
        </p>
      </div>
    )
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/users?${params}`)
      const result = await res.json()
      setUsers(result.data || [])
    } catch (error) {
      toast.error('Impossible de charger les utilisateurs')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [search])
  
  useEffect(() => {
    const fetchData = async () => {
      const [fRes, rRes] = await Promise.all([
        fetch('/api/facilities'),
        fetch('/api/regions')
      ])
      const fData = await fRes.json()
      const rData = await rRes.json()
      setFacilities(fData.data || [])
      setRegions(rData.data || [])
    }
    fetchData()
  }, [])

  const toggleStatus = async (user: User) => {
    setActionLoading(user.id)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: !user.isActive 
        }),
      })
      if (res.ok) {
        toast.success(user.isActive ? 'Compte bloqué' : 'Compte activé')
        load()
      } else {
        toast.error('Erreur lors du changement de statut')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Réinitialiser le mot de passe de ${user.name} ?`)) return
    
    setActionLoading(user.id)
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, { method: 'POST' })
      const result = await res.json()
      if (res.ok) {
        setEditingUser(user)
        setTempPassword(result.data.tempPassword)
        setShowForm(true)
        toast.success('Mot de passe réinitialisé')
      } else {
        toast.error(result.error || 'Erreur lors de la réinitialisation')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (res.ok) {
        toast.success('Utilisateur supprimé')
        setDeleteTarget(null)
        load()
      } else {
        toast.error(result.error || 'Impossible de supprimer cet utilisateur')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = useMemo<Column<User>[]>(() => [
    { 
      key: 'name', 
      header: 'Utilisateur', 
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xs uppercase">
            {row.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{row.name}</p>
            <p className="text-[11px] text-gray-500">{row.email}</p>
          </div>
        </div>
      ) 
    },
    { 
      key: 'role', 
      header: 'Rôle', 
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 text-[10px] font-bold uppercase tracking-wider border border-brand-100/50 dark:border-brand-800/50">
          {ROLES_LABELS[row.role] || row.role}
        </span>
      ) 
    },
    { 
      key: 'facility', 
      header: 'Affectation', 
      cell: (row) => (
        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
          {row.facility?.name || row.region?.name || 'National'}
        </span>
      ) 
    },
    {
      key: 'lastLoginAt',
      header: 'Dernière connexion',
      cell: (row) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {row.lastLoginAt
            ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(row.lastLoginAt))
            : <span className="italic text-gray-400">Jamais connecté</span>}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${row.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
          <span className={`text-xs font-semibold ${row.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
            {row.isActive ? 'Actif' : 'Bloqué'}
          </span>
        </div>
      ) 
    },
    { 
      key: 'actions', 
      header: 'Actions', 
      cell: (row) => {
        const isCurrentRowLoading = actionLoading === row.id
        const isSelf = currentUserId === row.id

        return (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setEditingUser(row); setShowForm(true) }}
              disabled={isCurrentRowLoading || !canManage}
              className="p-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-xl hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-all border border-brand-100/50 dark:border-brand-800/50 group disabled:opacity-50"
              title="Modifier"
            >
              <Edit2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </button>
            
            <button 
              onClick={() => handleResetPassword(row)}
              disabled={isCurrentRowLoading || !canManage || isSelf}
              className="p-2 bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-all border border-orange-100/50 dark:border-orange-800/30 group disabled:opacity-50"
              title="Réinitialiser le mot de passe"
            >
              {isCurrentRowLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />}
            </button>

            <button 
              onClick={() => toggleStatus(row)}
              disabled={isCurrentRowLoading || !canManage || isSelf}
              className={`p-2 rounded-xl transition-all border disabled:opacity-50 ${
                row.isActive 
                  ? 'bg-red-50 dark:bg-red-900/10 text-red-500 border-red-100/50 dark:border-red-900/30 hover:bg-red-100' 
                  : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 border-emerald-100/50 dark:border-emerald-900/30 hover:bg-emerald-100'
              }`}
              title={row.isActive ? 'Bloquer' : 'Activer'}
            >
              {isCurrentRowLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
            </button>

            {isSuperAdmin && !isSelf && (
              <button 
                onClick={() => setDeleteTarget(row)}
                disabled={isCurrentRowLoading}
                className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-gray-100 dark:border-gray-700 rounded-xl disabled:opacity-50"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )
      } 
    },
  ], [load, actionLoading, canManage, isSuperAdmin, currentUserId])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Utilisateurs"
        description="Administrez les comptes et les niveaux d'accès"
        action={
          canManage && (
            <button
              onClick={() => { setTempPassword(null); setEditingUser(null); setShowForm(true) }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Créer un compte
            </button>
          )
        }
      />

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-2 shadow-sm overflow-hidden">
        <div className="relative p-2">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border-0 rounded-2xl focus:ring-2 focus:ring-brand-500 transition-all outline-none"
          />
        </div>

        <DataTable columns={columns} data={users} isLoading={loading} emptyMessage="Aucun utilisateur trouvé" />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/20 animate-in fade-in duration-300">
          {!tempPassword ? (
            <UserForm 
              initialData={editingUser}
              facilities={facilities} 
              regions={regions} 
              onCancel={() => { setShowForm(false); setEditingUser(null) }} 
              onSuccess={(pw) => {
                if (editingUser) {
                  setShowForm(false)
                  setEditingUser(null)
                  load()
                  toast.success('Utilisateur mis à jour')
                } else {
                  setTempPassword(pw || null)
                }
              }} 
            />
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-6 border border-emerald-100 dark:border-emerald-900/30 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Shield className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingUser ? 'Mot de passe réinitialisé !' : 'Compte créé !'}
                </h3>
                <p className="text-sm text-gray-500">Veuillez transmettre ce mot de passe temporaire à l'utilisateur.</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800">
                <span className="text-2xl font-mono font-bold text-brand-600 select-all tracking-wider">{tempPassword}</span>
              </div>
              <button 
                onClick={() => { setShowForm(false); setTempPassword(null); setEditingUser(null); load() }}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-500/20"
              >
                Terminer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 max-w-md w-full border border-red-100 dark:border-red-900/20 animate-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Supprimer l'utilisateur ?</h3>
                <p className="text-sm text-gray-500">Cette action est définitive.</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Voulez-vous vraiment supprimer le compte de <span className="font-bold text-gray-900 dark:text-white">{deleteTarget.name}</span> ? 
              S'il a des données liées, la suppression échouera et il est préférable de désactiver le compte.
            </p>

            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-2xl disabled:opacity-50 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
