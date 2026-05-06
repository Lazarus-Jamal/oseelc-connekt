'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Upload, Send, CheckCircle, XCircle, Loader2, FileSpreadsheet, Pencil } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate, formatPercentage, formatFileSize, getMonthLabel } from '@care-connekt/shared'

export function StatSheetDetailPage({ id }: { id: string }) {
  const { data: session } = useSession()
  const [sheet, setSheet] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    fetch(`/api/statistics/${id}`)
      .then((r) => r.json())
      .then((d) => { setSheet(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const doAction = async (action: string, comment?: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/statistics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success('Action effectuée')
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const uploadDoc = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`/api/statistics/${id}/documents`, { method: 'POST', body: formData })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success('Fichier uploadé')
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!sheet) return <div className="text-center py-16"><p className="text-gray-500">Fiche introuvable</p></div>

  const role = session?.user?.role || ''
  const canSubmit = ['DATA_MANAGER', 'SUPER_ADMIN'].includes(role) && sheet.status === 'DRAFT'
  const canValidate = ['REGIONAL_DIRECTOR', 'DIRECTION', 'SUPER_ADMIN'].includes(role) && sheet.status === 'SUBMITTED'
  const canReject = ['REGIONAL_DIRECTOR', 'DIRECTION', 'SUPER_ADMIN'].includes(role) && sheet.status === 'SUBMITTED'
  const canUpload = ['DATA_MANAGER', 'SUPER_ADMIN'].includes(role) && ['DRAFT', 'REJECTED'].includes(sheet.status)

  // Grouper les valeurs par catégorie
  const byCategory = (sheet.values || []).reduce((acc: any, v: any) => {
    const cat = v.indicator.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(v)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/statistics" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white font-mono">{sheet.reference}</h1>
            <StatusBadge status={sheet.status} type="stat" />
          </div>
          <p className="text-sm text-gray-500">{sheet.facility.name} — {getMonthLabel(sheet.month, sheet.year)}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {sheet.status === 'DRAFT' && ['DATA_MANAGER', 'SUPER_ADMIN'].includes(role) && (
            <Link
              href={`/statistics/${id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-brand-200 dark:border-brand-700 text-brand-600 dark:text-brand-400 bg-white dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-sm font-medium rounded-lg transition"
            >
              <Pencil className="w-4 h-4" />
              Modifier la saisie
            </Link>
          )}
          {canSubmit && (
            <button onClick={() => doAction('submit')} disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Soumettre
            </button>
          )}
          {canValidate && (
            <button onClick={() => doAction('validate')} disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition">
              <CheckCircle className="w-4 h-4" />
              Valider
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Indicateurs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Complétude */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Taux de complétude</span>
              <span className={`text-sm font-bold ${(sheet.completeness || 0) >= 80 ? 'text-green-600' : (sheet.completeness || 0) >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                {formatPercentage(sheet.completeness || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${(sheet.completeness || 0) >= 80 ? 'bg-green-500' : (sheet.completeness || 0) >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                style={{ width: `${sheet.completeness || 0}%` }}
              />
            </div>
          </div>

          {/* Valeurs par catégorie */}
          {(Object.entries(byCategory) as [string, any[]][]).map(([category, values]) => (
            <div key={category} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">{category}</h3>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {values.map((v: any) => (
                    <tr key={v.id}>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                        {v.indicator.label}
                        {v.indicator.isRequired && <span className="ml-1 text-red-400">*</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-white w-32">
                        {v.value !== null && v.value !== undefined ? (
                          <span>{v.value}{v.indicator.unit ? ` ${v.indicator.unit}` : ''}</span>
                        ) : (
                          <span className="text-gray-400 font-normal text-xs">Non renseigné</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {Object.keys(byCategory).length === 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-400">
              Aucun indicateur renseigné
            </div>
          )}

          {/* Documents Excel */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Fichiers joints</h2>
              {canUpload && (
                <>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,image/*,application/pdf" className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) uploadDoc(e.target.files[0]) }} />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition">
                    <Upload className="w-3 h-3" />
                    Fiche Excel
                  </button>
                </>
              )}
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {(sheet.documents || []).map((doc: any) => (
                <a key={doc.id} href={doc.filePath} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                  <FileSpreadsheet className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.originalName}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</p>
                  </div>
                </a>
              ))}
              {(sheet.documents || []).length === 0 && (
                <p className="px-5 py-6 text-center text-sm text-gray-400">Aucun document joint</p>
              )}
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">Informations</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-gray-500">Période</dt><dd className="font-medium">{getMonthLabel(sheet.month, sheet.year)}</dd></div>
              <div><dt className="text-gray-500">Formation</dt><dd className="font-medium">{sheet.facility.name}</dd></div>
              <div><dt className="text-gray-500">Responsable data</dt><dd className="font-medium">{sheet.dataManager.name}</dd></div>
              {sheet.submittedAt && <div><dt className="text-gray-500">Soumis le</dt><dd className="font-medium">{formatDate(sheet.submittedAt)}</dd></div>}
              {sheet.validatedAt && <div><dt className="text-gray-500">Validé le</dt><dd className="font-medium">{formatDate(sheet.validatedAt)}</dd></div>}
              {sheet.comment && <div><dt className="text-gray-500">Commentaire</dt><dd className="font-medium text-orange-600">{sheet.comment}</dd></div>}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
