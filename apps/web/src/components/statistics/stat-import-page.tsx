'use client'

import { useState, useRef } from 'react'
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, X, Info } from 'lucide-react'
import { toast } from 'sonner'

interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export function StatImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [resultMessage, setResultMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File | null) => {
    if (!f) return
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!allowed.includes(f.type) && !f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      toast.error('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)')
      return
    }
    setFile(f)
    setResult(null)
    setResultMessage('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0] ?? null)
  }

  const downloadTemplate = async () => {
    const res = await fetch('/api/statistics/import')
    if (!res.ok) { toast.error('Erreur lors du téléchargement'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modele-import-statistiques.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    setResultMessage('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/statistics/import', { method: 'POST', body: fd })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setResult(json.data)
      setResultMessage(json.message)
      toast.success('Import terminé')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
          <FileSpreadsheet className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Importation en masse</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Importez les fiches statistiques depuis un fichier Excel</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1.5">
            <p className="font-semibold">Format du fichier Excel requis :</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
              <li>Ligne 1 : en-têtes (Code établissement, Mois, Année, puis les codes indicateurs)</li>
              <li>Colonne A : code de la formation sanitaire (ex. FS-001)</li>
              <li>Colonne B : mois (1 à 12)</li>
              <li>Colonne C : année (ex. 2025)</li>
              <li>Colonnes D+ : valeur numérique par indicateur</li>
            </ul>
            <p className="mt-1">Si une fiche existe déjà pour la même période, elle sera mise à jour.</p>
          </div>
        </div>
      </div>

      {/* Download template */}
      <button
        onClick={downloadTemplate}
        className="flex items-center gap-2 px-4 py-2.5 border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/20 transition text-sm font-medium w-full justify-center"
      >
        <Download className="w-4 h-4" />
        Télécharger le modèle Excel (avec liste des indicateurs)
      </button>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-10 text-center cursor-pointer hover:border-teal-400 dark:hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition group"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <Upload className="w-8 h-8 text-gray-400 group-hover:text-teal-500 mx-auto mb-3 transition" />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-600" />
            <span className="text-sm font-medium text-teal-700 dark:text-teal-300">{file.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null) }}
              className="p-0.5 rounded text-gray-400 hover:text-red-500 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Glissez votre fichier ici ou cliquez pour sélectionner
            </p>
            <p className="text-xs text-gray-400 mt-1">Formats acceptés : .xlsx, .xls</p>
          </>
        )}
      </div>

      {/* Import button */}
      <button
        onClick={handleImport}
        disabled={!file || loading}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Import en cours…
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Lancer l'importation
          </>
        )}
      </button>

      {/* Results */}
      {result && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
          <p className="font-semibold text-gray-900 dark:text-white">{resultMessage}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{result.created}</p>
              <p className="text-xs text-gray-500 mt-0.5">Créées</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.updated}</p>
              <p className="text-xs text-gray-500 mt-0.5">Mises à jour</p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.errors.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Erreurs</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
                Détail des erreurs
              </div>
              <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700 dark:text-red-300 font-mono">{err}</p>
                ))}
              </div>
            </div>
          )}

          {result.errors.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              Import réussi sans erreur
            </div>
          )}
        </div>
      )}
    </div>
  )
}
