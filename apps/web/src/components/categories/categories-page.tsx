'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/ui/page-header'
import { Plus, Trash2, Tag, ShieldCheck, Loader2, TrendingUp, TrendingDown } from 'lucide-react'

interface Category {
  id: string | null
  name: string
  declarationType: 'REVENUE' | 'EXPENSE'
  isDefault: boolean
  isActive?: boolean
}

const CAN_DELETE = ['SUPER_ADMIN', 'DIRECTION']

function CategoryRow({
  cat,
  canDelete,
  onDelete,
}: {
  cat: Category
  canDelete: boolean
  onDelete: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!cat.id) return
    setDeleting(true)
    await onDelete(cat.id)
    setDeleting(false)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition group">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        cat.declarationType === 'REVENUE' ? 'bg-teal-400' : 'bg-orange-400'
      }`} />
      <span className="flex-1 text-sm text-gray-900 dark:text-white font-medium">{cat.name}</span>
      {cat.isDefault ? (
        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
          <ShieldCheck className="w-3 h-3" />
          Système
        </span>
      ) : (
        <span className="text-xs text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20">
          Personnalisée
        </span>
      )}
      {canDelete && !cat.isDefault && cat.id && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  )
}

function AddCategoryForm({
  type,
  onAdd,
}: {
  type: 'REVENUE' | 'EXPENSE'
  onAdd: (name: string, type: 'REVENUE' | 'EXPENSE') => Promise<{ ok: boolean; error?: string }>
}) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    const result = await onAdd(trimmed, type)
    if (result.ok) {
      setName('')
    } else {
      setError(result.error || 'Erreur')
    }
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
          placeholder="Nom de la nouvelle catégorie…"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
        />
        <button
          onClick={submit}
          disabled={loading || !name.trim()}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition disabled:opacity-50 ${
            type === 'REVENUE'
              ? 'bg-teal-600 hover:bg-teal-700 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Ajouter
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function CategoriesPage() {
  const { data: session } = useSession()
  const [revenue, setRevenue] = useState<Category[]>([])
  const [expense, setExpense] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'REVENUE' | 'EXPENSE'>('REVENUE')

  const role = session?.user?.role || ''
  const canCreate = ['SUPER_ADMIN', 'DIRECTION', 'FINANCIER'].includes(role)
  const canDelete = CAN_DELETE.includes(role)

  const load = useCallback(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRevenue(d.data.REVENUE || [])
          setExpense(d.data.EXPENSE || [])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async (name: string, type: 'REVENUE' | 'EXPENSE') => {
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

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      setRevenue((prev) => prev.filter((c) => c.id !== id))
      setExpense((prev) => prev.filter((c) => c.id !== id))
    }
  }

  const current = activeTab === 'REVENUE' ? revenue : expense
  const defaultCount = current.filter((c) => c.isDefault).length
  const customCount = current.filter((c) => !c.isDefault).length

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
        description="Catégories disponibles pour les déclarations de recettes et de dépenses"
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
            <ShieldCheck className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Système</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {revenue.filter((c) => c.isDefault).length + expense.filter((c) => c.isDefault).length}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Non modifiables</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-4 h-4 text-brand-500" />
            <span className="text-xs text-gray-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{revenue.length + expense.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Toutes catégories</p>
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
        </div>

        {/* Summary bar */}
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/40 flex items-center gap-4 text-xs text-gray-500">
          <span>{defaultCount} catégories système</span>
          <span className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
          <span>{customCount} catégories personnalisées</span>
        </div>

        {/* List */}
        <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
          {current.map((cat) => (
            <CategoryRow
              key={cat.id ?? cat.name}
              cat={cat}
              canDelete={canDelete}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* Add form */}
        {canCreate && (
          <AddCategoryForm type={activeTab} onAdd={handleAdd} />
        )}
      </div>

      {!canDelete && canCreate && (
        <p className="text-xs text-gray-400 text-center">
          Vous pouvez créer des catégories. La suppression est réservée aux administrateurs.
        </p>
      )}
    </div>
  )
}
