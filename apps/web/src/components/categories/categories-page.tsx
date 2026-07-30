'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/ui/page-header'
import { Plus, Trash2, Tag, ShieldCheck, Loader2, TrendingUp, TrendingDown, Building2 } from 'lucide-react'

interface Category {
  id: string | null
  name: string
  declarationType: 'REVENUE' | 'EXPENSE'
  isDefault: boolean
  isActive?: boolean
}

interface Debtor {
  id: string | null
  name: string
  isDefault: boolean
  isActive?: boolean
}

const CAN_DELETE = ['SUPER_ADMIN', 'DIRECTION']

function ItemRow({
  name,
  isDefault,
  id,
  canDelete,
  accentColor,
  onDelete,
}: {
  name: string
  isDefault: boolean
  id: string | null
  canDelete: boolean
  accentColor: string
  onDelete: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition group">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${accentColor}`} />
      <span className="flex-1 text-sm text-gray-900 dark:text-white font-medium">{name}</span>
      {isDefault ? (
        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
          <ShieldCheck className="w-3 h-3" />
          Système
        </span>
      ) : (
        <span className="text-xs text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20">
          Personnalisé
        </span>
      )}
      {canDelete && !isDefault && id && (
        <button
          onClick={async () => { setDeleting(true); await onDelete(id); setDeleting(false) }}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  )
}

function AddItemForm({
  placeholder,
  buttonColor,
  onAdd,
}: {
  placeholder: string
  buttonColor: string
  onAdd: (name: string) => Promise<{ ok: boolean; error?: string }>
}) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    const result = await onAdd(trimmed)
    if (result.ok) setName('')
    else setError(result.error || 'Erreur')
    setLoading(false)
  }

  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
        />
        <button
          onClick={submit}
          disabled={loading || !name.trim()}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition disabled:opacity-50 ${buttonColor}`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Ajouter
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}

type Tab = 'REVENUE' | 'EXPENSE' | 'DEBTORS'

export function CategoriesPage() {
  const { data: session } = useSession()
  const [revenue, setRevenue] = useState<Category[]>([])
  const [expense, setExpense] = useState<Category[]>([])
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('REVENUE')

  const role = session?.user?.role || ''
  const canCreate = ['SUPER_ADMIN', 'DIRECTION', 'FINANCIER', 'FACILITY_CHIEF'].includes(role)
  const canDelete = CAN_DELETE.includes(role)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/debtors').then((r) => r.json()),
    ]).then(([cats, deb]) => {
      if (cats.success) {
        setRevenue(cats.data.REVENUE || [])
        setExpense(cats.data.EXPENSE || [])
      }
      if (deb.success) setDebtors(deb.data || [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleAddCategory = async (name: string, type: 'REVENUE' | 'EXPENSE') => {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, declarationType: type }),
    })
    const data = await res.json()
    if (data.success) {
      if (type === 'REVENUE') setRevenue((prev) => [...prev, data.data])
      else setExpense((prev) => [...prev, data.data])
      return { ok: true }
    }
    return { ok: false, error: data.error }
  }

  const handleDeleteCategory = async (id: string) => {
    const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      setRevenue((prev) => prev.filter((c) => c.id !== id))
      setExpense((prev) => prev.filter((c) => c.id !== id))
    }
  }

  const handleAddDebtor = async (name: string) => {
    const res = await fetch('/api/debtors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (data.success) {
      setDebtors((prev) => [...prev, data.data])
      return { ok: true }
    }
    return { ok: false, error: data.error }
  }

  const handleDeleteDebtor = async (id: string) => {
    const res = await fetch(`/api/debtors?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) setDebtors((prev) => prev.filter((d) => d.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Gestion des catégories"
        description="Catégories et débiteurs disponibles pour les déclarations"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            <span className="text-xs text-gray-500">Recettes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{revenue.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{revenue.filter((c) => !c.isDefault).length} personnalisées</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500">Dépenses</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{expense.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{expense.filter((c) => !c.isDefault).length} personnalisées</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500">Débiteurs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{debtors.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{debtors.filter((d) => !d.isDefault).length} personnalisés</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-4 h-4 text-brand-500" />
            <span className="text-xs text-gray-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{revenue.length + expense.length + debtors.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Toutes entrées</p>
        </div>
      </div>

      {/* Tabs + list */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('REVENUE')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors ${
              activeTab === 'REVENUE'
                ? 'text-teal-700 dark:text-teal-400 border-b-2 border-teal-500 bg-teal-50/50 dark:bg-teal-900/10'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Recettes ({revenue.length})
          </button>
          <button
            onClick={() => setActiveTab('EXPENSE')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors ${
              activeTab === 'EXPENSE'
                ? 'text-orange-700 dark:text-orange-400 border-b-2 border-orange-500 bg-orange-50/50 dark:bg-orange-900/10'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Dépenses ({expense.length})
          </button>
          <button
            onClick={() => setActiveTab('DEBTORS')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors ${
              activeTab === 'DEBTORS'
                ? 'text-purple-700 dark:text-purple-400 border-b-2 border-purple-500 bg-purple-50/50 dark:bg-purple-900/10'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Débiteurs ({debtors.length})
          </button>
        </div>

        {/* Summary bar */}
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/40 flex items-center gap-4 text-xs text-gray-500">
          {activeTab === 'DEBTORS' ? (
            <>
              <span>{debtors.filter((d) => d.isDefault).length} débiteurs système</span>
              <span className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
              <span>{debtors.filter((d) => !d.isDefault).length} débiteurs personnalisés</span>
            </>
          ) : (
            <>
              <span>{(activeTab === 'REVENUE' ? revenue : expense).filter((c) => c.isDefault).length} catégories système</span>
              <span className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
              <span>{(activeTab === 'REVENUE' ? revenue : expense).filter((c) => !c.isDefault).length} catégories personnalisées</span>
            </>
          )}
        </div>

        {/* List */}
        <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
          {activeTab === 'DEBTORS' ? (
            debtors.map((d) => (
              <ItemRow
                key={d.id ?? d.name}
                name={d.name}
                isDefault={d.isDefault}
                id={d.id}
                canDelete={canDelete}
                accentColor="bg-purple-400"
                onDelete={handleDeleteDebtor}
              />
            ))
          ) : (
            (activeTab === 'REVENUE' ? revenue : expense).map((cat) => (
              <ItemRow
                key={cat.id ?? cat.name}
                name={cat.name}
                isDefault={cat.isDefault}
                id={cat.id}
                canDelete={canDelete}
                accentColor={activeTab === 'REVENUE' ? 'bg-teal-400' : 'bg-orange-400'}
                onDelete={handleDeleteCategory}
              />
            ))
          )}
        </div>

        {/* Add form */}
        {canCreate && activeTab === 'DEBTORS' && (
          <AddItemForm
            placeholder="Nom du débiteur (ex: CNPS, Mutuelle XYZ…)"
            buttonColor="bg-purple-600 hover:bg-purple-700 text-white"
            onAdd={handleAddDebtor}
          />
        )}
        {canCreate && activeTab !== 'DEBTORS' && (
          <AddItemForm
            placeholder="Nom de la nouvelle catégorie…"
            buttonColor={activeTab === 'REVENUE' ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}
            onAdd={(name) => handleAddCategory(name, activeTab)}
          />
        )}
      </div>

      {!canDelete && canCreate && (
        <p className="text-xs text-gray-400 text-center">
          Vous pouvez créer des entrées. La suppression est réservée aux administrateurs.
        </p>
      )}
    </div>
  )
}
