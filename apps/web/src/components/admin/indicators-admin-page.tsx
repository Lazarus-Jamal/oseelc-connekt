'use client'

import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2, FileSpreadsheet, Search, DatabaseZap } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'

interface Indicator {
  id: string
  code: string
  label: string
  category: string
  unit: string | null
  isRequired: boolean
  isActive: boolean
  sortOrder: number
}

export function IndicatorsAdminPage() {
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSeed = async () => {
    if (!confirm(`Charger / mettre à jour les indicateurs OSEELC ? Les labels et ordres de tri seront synchronisés.`)) return
    setSeeding(true)
    try {
      const res = await fetch('/api/admin/indicators/seed', { method: 'POST' })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      const msg = `${result.data.created} créés · ${result.data.updated} mis à jour${result.data.deactivated ? ` · ${result.data.deactivated} désactivés` : ''}`
      toast.success(msg)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors du chargement')
    } finally {
      setSeeding(false)
    }
  }

  const load = () => {
    fetch('/api/admin/indicators')
      .then((r) => r.json())
      .then((d) => { setIndicators(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleImport = async (file: File) => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/admin/indicators/import', { method: 'POST', body: formData })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success(result.message)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'import')
    } finally {
      setUploading(false)
    }
  }

  const filtered = indicators.filter((i) =>
    !search ||
    i.label.toLowerCase().includes(search.toLowerCase()) ||
    i.code.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  )

  // Grouper par catégorie pour l'affichage
  const categories = [...new Set(indicators.map((i) => i.category))].sort()

  const columns: Column<Indicator>[] = [
    { key: 'code', header: 'Code', cell: (row) => <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{row.code}</span> },
    {
      key: 'label',
      header: 'Indicateur',
      cell: (row) => (
        <div>
          <p className="text-sm text-gray-900 dark:text-white">
            {row.label}
            {row.isRequired && <span className="ml-1 text-red-400 text-xs">*</span>}
          </p>
          {row.unit && <p className="text-xs text-gray-400">{row.unit}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Catégorie',
      cell: (row) => <span className="text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full">{row.category}</span>,
    },
    {
      key: 'required',
      header: 'Obligatoire',
      cell: (row) => <span className={`text-xs font-medium ${row.isRequired ? 'text-red-500' : 'text-gray-400'}`}>{row.isRequired ? 'Oui' : 'Non'}</span>,
      className: 'text-center',
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (row) => <span className={`text-xs font-medium ${row.isActive ? 'text-green-600' : 'text-gray-400'}`}>{row.isActive ? 'Actif' : 'Inactif'}</span>,
      className: 'text-center',
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Indicateurs statistiques"
        description={`${indicators.length} indicateurs configurés — ${categories.length} catégories`}
        action={
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleImport(e.target.files[0]) }}
            />
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />}
              Charger les indicateurs
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Importer Excel
            </button>
          </div>
        }
      />

      {/* Format attendu */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Format du fichier Excel</p>
        <p className="text-xs text-blue-700 dark:text-blue-400">
          Colonnes attendues (ligne 1 = en-têtes) :
          <span className="font-mono ml-1">A:code | B:label | C:category | D:unit | E:isRequired (oui/non) | F:description | G:sortOrder</span>
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
          Les indicateurs existants (même code) seront mis à jour. Les nouveaux seront créés.
        </p>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un indicateur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Stats par catégorie */}
      {!search && categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span key={cat} className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full text-gray-600 dark:text-gray-400">
              {cat} ({indicators.filter((i) => i.category === cat).length})
            </span>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={loading}
        emptyMessage={loading ? 'Chargement...' : 'Aucun indicateur. Importez un fichier Excel.'}
      />
    </div>
  )
}
