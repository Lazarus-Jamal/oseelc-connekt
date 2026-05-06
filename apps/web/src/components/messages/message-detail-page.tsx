'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  ArrowLeft, Paperclip, Download, Trash2, AlertTriangle, Info, Bell,
  EyeOff, Users, CheckCircle2, Clock, FileText, FileSpreadsheet, Image as ImageIcon,
  Pencil, X, Save, Loader2, Eye,
} from 'lucide-react'
import { formatDate } from '@care-connekt/shared'
import { ROLES_LABELS } from '@care-connekt/shared'

const CATEGORY_LABELS: Record<string, string> = {
  CIRCULAIRE: 'Circulaire', BULLETIN_PAIE: 'Bulletin de paie',
  PIECE_COMPTABLE: 'Pièce comptable', NOTE_SERVICE: 'Note de service',
  RAPPORT: 'Rapport', AUTRE: 'Autre',
}
const CATEGORY_COLORS: Record<string, string> = {
  CIRCULAIRE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  BULLETIN_PAIE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  PIECE_COMPTABLE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  NOTE_SERVICE: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  RAPPORT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  AUTRE: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}
const PRIORITY_CONFIG: Record<string, { label: string; icon: any; class: string; bg: string }> = {
  NORMAL:    { label: 'Normal',    icon: Info,          class: 'text-gray-500',  bg: 'bg-gray-100 dark:bg-gray-800' },
  IMPORTANT: { label: 'Important', icon: Bell,          class: 'text-blue-500',  bg: 'bg-blue-50 dark:bg-blue-900/20' },
  URGENT:    { label: 'Urgent',    icon: AlertTriangle, class: 'text-red-500',   bg: 'bg-red-50 dark:bg-red-900/20' },
}
const CATEGORIES = [
  { value: 'CIRCULAIRE', label: 'Circulaire' },
  { value: 'BULLETIN_PAIE', label: 'Bulletin de paie' },
  { value: 'PIECE_COMPTABLE', label: 'Pièce comptable' },
  { value: 'NOTE_SERVICE', label: 'Note de service' },
  { value: 'RAPPORT', label: 'Rapport' },
  { value: 'AUTRE', label: 'Autre' },
]
const PRIORITIES = [
  { value: 'NORMAL',    label: 'Normal',    color: 'text-gray-600 border-gray-300' },
  { value: 'IMPORTANT', label: 'Important', color: 'text-blue-600 border-blue-400' },
  { value: 'URGENT',    label: 'Urgent',    color: 'text-red-600 border-red-400' },
]

function fileIcon(type: string) {
  if (type.startsWith('image/')) return ImageIcon
  if (type.includes('spreadsheet') || type.includes('excel') || type === 'application/vnd.ms-excel') return FileSpreadsheet
  return FileText
}

interface Recipient { userId: string; name: string; role: string; isRead: boolean; readAt: string | null }
interface Document { id: string; originalName: string; filePath: string; fileType: string; fileSize: number }
interface Message {
  id: string; title: string; content: string; category: string; priority: string
  isSensitive: boolean; expiresAt: string | null; createdAt: string; updatedAt: string
  sender: { id: string; name: string; role: string }
  documents: Document[]
  recipients: Recipient[]
  isSender: boolean; isRecipient: boolean
}

export function MessageDetailPage({ id }: { id: string }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [message, setMessage] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showRecipients, setShowRecipients] = useState(false)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editPriority, setEditPriority] = useState('')
  const [editSensitive, setEditSensitive] = useState(false)
  const [editExpiresAt, setEditExpiresAt] = useState('')

  const fetchMessage = () => {
    fetch(`/api/messages/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMessage(d.data)
        else toast.error(d.error || 'Erreur chargement')
      })
      .catch(() => toast.error('Erreur de connexion'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchMessage() }, [id])

  const startEdit = () => {
    if (!message) return
    setEditTitle(message.title)
    setEditContent(message.content)
    setEditCategory(message.category)
    setEditPriority(message.priority)
    setEditSensitive(message.isSensitive)
    setEditExpiresAt(message.expiresAt ? message.expiresAt.slice(0, 10) : '')
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const saveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) { toast.error('Titre et contenu requis'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle, content: editContent,
          category: editCategory, priority: editPriority,
          isSensitive: editSensitive,
          expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Message modifié')
      setEditing(false)
      fetchMessage()
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la modification')
    } finally {
      setSaving(false)
    }
  }

  const canDelete = message && (
    message.isSender || ['SUPER_ADMIN', 'DIRECTION'].includes(session?.user?.role || '')
  )
  const canEdit = message?.isSender &&
    (Date.now() - new Date(message.createdAt).getTime()) / 60_000 <= 15

  const handleDelete = async () => {
    if (!confirm('Supprimer ce message définitivement ?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Message supprimé')
      router.push('/messages')
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la suppression')
      setDeleting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!message) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
      <FileText className="w-10 h-10 opacity-30" />
      <p className="text-sm">Message introuvable</p>
      <Link href="/messages" className="text-brand-500 text-sm hover:underline">Retour</Link>
    </div>
  )

  const priority = PRIORITY_CONFIG[message.priority] || PRIORITY_CONFIG.NORMAL
  const PriorityIcon = priority.icon
  const readCount = message.recipients.filter((r) => r.isRead).length
  const totalCount = message.recipients.length
  const wasEdited = message.updatedAt !== message.createdAt

  return (
    <div className="max-w-3xl space-y-5">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/messages" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
          <ArrowLeft className="w-4 h-4" />
          Messagerie
        </Link>
        <div className="flex items-center gap-2">
          {message.isSender && !editing && (
            canEdit ? (
              <button onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition">
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </button>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-400 border border-gray-200 dark:border-gray-700">
                <Clock className="w-3.5 h-3.5" />
                Délai de modification dépassé
              </span>
            )
          )}
          {canDelete && !editing && (
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50">
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Titre</label>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Catégorie</label>
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Priorité</label>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => (
                    <button key={p.value} type="button" onClick={() => setEditPriority(p.value)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                        editPriority === p.value ? `${p.color} bg-opacity-10` : 'border-gray-200 dark:border-gray-700 text-gray-400'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div onClick={() => setEditSensitive((v) => !v)}
                  className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${editSensitive ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${editSensitive ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-red-500" /> Document sensible
                </span>
              </label>
              <div className="flex-1 space-y-1">
                <label className="text-xs text-gray-400">Expiration</label>
                <input type="date" value={editExpiresAt} onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-gray-500 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                <X className="w-3.5 h-3.5" /> Annuler
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white transition disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-xl ${priority.bg} flex-shrink-0`}>
              <PriorityIcon className={`w-5 h-5 ${priority.class}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[message.category]}`}>
                  {CATEGORY_LABELS[message.category]}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priority.bg} ${priority.class}`}>
                  {priority.label}
                </span>
                {message.isSensitive && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    <EyeOff className="w-3 h-3" /> Sensible
                  </span>
                )}
                {message.expiresAt && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    Expire {formatDate(message.expiresAt)}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{message.title}</h1>
              <div className="mt-2 flex items-center gap-4 flex-wrap text-xs text-gray-400">
                <span>
                  De : <span className="font-medium text-gray-600 dark:text-gray-300">{message.sender.name}</span>
                  {' '}· {ROLES_LABELS[message.sender.role] || message.sender.role}
                </span>
                <span>{formatDate(message.createdAt)}</span>
                {wasEdited && (
                  <span className="italic text-gray-300 dark:text-gray-600">
                    Modifié le {formatDate(message.updatedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Message</h2>
        {editing ? (
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={8}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
        ) : (
          <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
        )}
      </div>

      {/* Attachments */}
      {message.documents.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Paperclip className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Pièces jointes ({message.documents.length})
            </h2>
          </div>
          <div className="space-y-2">
            {message.documents.map((doc) => {
              const Icon = fileIcon(doc.fileType)
              const sizeMb = doc.fileSize > 1024 * 1024
                ? `${(doc.fileSize / 1024 / 1024).toFixed(1)} Mo`
                : `${(doc.fileSize / 1024).toFixed(0)} Ko`
              return (
                <a key={doc.id} href={doc.filePath} target="_blank" rel="noopener noreferrer" download={doc.originalName}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-brand-300 hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition group">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.originalName}</p>
                    <p className="text-xs text-gray-400">{sizeMb}</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition flex-shrink-0" />
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Read receipts — visible for sender */}
      {message.isSender && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <button onClick={() => setShowRecipients((v) => !v)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Accusés de réception · <span className="text-brand-600 dark:text-brand-400">{readCount}</span>/{totalCount} lu{readCount > 1 ? 's' : ''}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-28 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-500"
                  style={{ width: totalCount > 0 ? `${(readCount / totalCount) * 100}%` : '0%' }}
                />
              </div>
              <Eye className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showRecipients ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {showRecipients && (
            <div className="mt-4 space-y-1 max-h-72 overflow-y-auto">
              {message.recipients.map((r) => (
                <div key={r.userId} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{r.name}</p>
                    <p className="text-xs text-gray-400">{ROLES_LABELS[r.role] || r.role}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {r.isRead ? (
                      <div className="flex items-center gap-1 text-xs text-green-500 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {r.readAt ? formatDate(r.readAt) : 'Lu'}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300 dark:text-gray-600">Non lu</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
