'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Upload, Send, CheckCircle, XCircle, Eye, Loader2, FileText, Image, Download, Pencil } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatCurrency, formatDate, formatDateTime, formatFileSize, FACILITY_TYPE_LABELS, DECLARATION_STATUS_LABELS } from '@care-connekt/shared'

interface DeclarationDetailPageProps {
  id: string
}

export function DeclarationDetailPage({ id }: DeclarationDetailPageProps) {
  const { data: session } = useSession()
  const [declaration, setDeclaration] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    fetch(`/api/declarations/${id}`)
      .then((r) => r.json())
      .then((d) => { setDeclaration(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const doAction = async (action: string, comment?: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/declarations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success(`Action "${action}" effectuée avec succès`)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActionLoading(false)
      setShowRejectModal(false)
    }
  }

  const exportPDF = async () => {
    if (!declaration) return
    const { exportDeclarationPDF } = await import('@/lib/pdf-export')
    await exportDeclarationPDF(declaration)
  }

  const uploadDocument = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`/api/declarations/${id}/documents`, { method: 'POST', body: formData })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast.success('Document ajouté')
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!declaration) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Déclaration introuvable</p>
        <Link href="/declarations" className="mt-2 text-brand-600 hover:underline text-sm">Retour à la liste</Link>
      </div>
    )
  }

  const role = session?.user?.role || ''
  const canSubmit = ['FINANCIER', 'SUPER_ADMIN'].includes(role) && declaration.status === 'DRAFT'
  const canReview = ['FACILITY_CHIEF', 'REGIONAL_DIRECTOR', 'SUPER_ADMIN'].includes(role) && declaration.status === 'SUBMITTED'
  const canValidate = ['REGIONAL_DIRECTOR', 'DIRECTION', 'SUPER_ADMIN'].includes(role) && ['SUBMITTED', 'REVIEWED'].includes(declaration.status)
  const canReject = ['FACILITY_CHIEF', 'REGIONAL_DIRECTOR', 'DIRECTION', 'SUPER_ADMIN'].includes(role) && !['VALIDATED', 'REJECTED'].includes(declaration.status)
  const canUpload = role === 'FINANCIER' && ['DRAFT', 'REJECTED'].includes(declaration.status)
  const canEdit = declaration.status === 'DRAFT' && (session?.user?.id === declaration.submittedBy.id || role === 'SUPER_ADMIN')

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/declarations" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white font-mono">{declaration.reference}</h1>
            <StatusBadge status={declaration.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {declaration.facility.name} — {FACILITY_TYPE_LABELS[declaration.facility.type]}
            {declaration.facility.region && ` | ${declaration.facility.region.name}`}
          </p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          {canEdit && (
            <Link
              href={`/declarations/${id}/edit`}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <Pencil className="w-4 h-4" />
              Modifier
            </Link>
          )}
          {canSubmit && (
            <button
              onClick={() => doAction('submit')}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Soumettre
            </button>
          )}
          {canReview && (
            <button
              onClick={() => doAction('review')}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition"
            >
              <Eye className="w-4 h-4" />
              Marquer examiné
            </button>
          )}
          {canValidate && (
            <button
              onClick={() => doAction('validate')}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
            >
              <CheckCircle className="w-4 h-4" />
              Valider
            </button>
          )}
          {canReject && (
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition"
            >
              <XCircle className="w-4 h-4" />
              Rejeter
            </button>
          )}
        </div>
      </div>

      {/* Commentaire de rejet */}
      {declaration.comment && declaration.status === 'REJECTED' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Motif du rejet</p>
          <p className="text-sm text-red-600 dark:text-red-300">{declaration.comment}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lignes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-white">Détail des recettes</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500">
                  <th className="px-4 py-2.5 text-left">Libellé</th>
                  <th className="px-4 py-2.5 text-left">Catégorie</th>
                  <th className="px-4 py-2.5 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {declaration.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5 text-gray-900 dark:text-white">{item.label}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400">{item.category}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
                  <td className="px-4 py-3 text-gray-900 dark:text-white" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right text-brand-600 dark:text-brand-400 text-base">{formatCurrency(declaration.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Documents */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Pièces justificatives</h2>
              {canUpload && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) uploadDocument(e.target.files[0]) }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition"
                  >
                    <Upload className="w-3 h-3" />
                    Ajouter
                  </button>
                </>
              )}
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {declaration.documents.length === 0 && (
                <p className="px-5 py-6 text-center text-sm text-gray-400">Aucun document joint</p>
              )}
              {declaration.documents.map((doc: any) => (
                <a
                  key={doc.id}
                  href={doc.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
                >
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                    {doc.fileType === 'application/pdf' ? (
                      <FileText className="w-4 h-4 text-red-500" />
                    ) : (
                      <Image className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.originalName}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)} — {formatDate(doc.uploadedAt)}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Infos & historique */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">Informations</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-gray-500">Soumis par</dt><dd className="font-medium text-gray-900 dark:text-white">{declaration.submittedBy.name}</dd></div>
              <div><dt className="text-gray-500">Période</dt><dd className="font-medium">{formatDate(declaration.periodStart)} – {formatDate(declaration.periodEnd)}</dd></div>
              {declaration.submittedAt && <div><dt className="text-gray-500">Soumis le</dt><dd className="font-medium">{formatDateTime(declaration.submittedAt)}</dd></div>}
              {declaration.reviewedBy && <div><dt className="text-gray-500">Examiné par</dt><dd className="font-medium">{declaration.reviewedBy.name}</dd></div>}
              {declaration.validatedAt && <div><dt className="text-gray-500">Validé le</dt><dd className="font-medium">{formatDateTime(declaration.validatedAt)}</dd></div>}
              <div><dt className="text-gray-500">Créé le</dt><dd className="font-medium">{formatDateTime(declaration.createdAt)}</dd></div>
            </dl>
          </div>

          {/* Historique */}
          {declaration.history.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Historique</h2>
              <div className="space-y-3">
                {declaration.history.map((h: any) => (
                  <div key={h.id} className="flex gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {DECLARATION_STATUS_LABELS[h.fromStatus] ?? h.fromStatus} → {DECLARATION_STATUS_LABELS[h.toStatus] ?? h.toStatus}
                      </p>
                      {h.comment && <p className="text-gray-500 italic">"{h.comment}"</p>}
                      <p className="text-gray-400">{formatDateTime(h.changedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal rejet */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Motif du rejet</h3>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={3}
              placeholder="Expliquez la raison du rejet..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
              <button
                onClick={() => doAction('reject', rejectComment)}
                disabled={!rejectComment.trim() || actionLoading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition"
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
