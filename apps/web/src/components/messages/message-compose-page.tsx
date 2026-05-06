'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Send, Upload, X, FileText, Loader2, Users, AlertTriangle, EyeOff, ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { formatFileSize } from '@care-connekt/shared'

const CATEGORIES = [
  { value: 'CIRCULAIRE',      label: 'Circulaire' },
  { value: 'BULLETIN_PAIE',   label: 'Bulletin de paie' },
  { value: 'PIECE_COMPTABLE', label: 'Pièce comptable' },
  { value: 'NOTE_SERVICE',    label: 'Note de service' },
  { value: 'RAPPORT',         label: 'Rapport' },
  { value: 'AUTRE',           label: 'Autre' },
]
const PRIORITIES = [
  { value: 'NORMAL',    label: 'Normal',    color: 'text-gray-600 border-gray-300' },
  { value: 'IMPORTANT', label: 'Important', color: 'text-blue-600 border-blue-400' },
  { value: 'URGENT',    label: 'Urgent',    color: 'text-red-600 border-red-400' },
]
const ROLES = [
  { value: 'DIRECTION',         label: 'Direction' },
  { value: 'REGIONAL_DIRECTOR', label: 'Directeurs régionaux' },
  { value: 'FACILITY_CHIEF',    label: 'Chefs de centre' },
  { value: 'FINANCIER',         label: 'Financiers' },
  { value: 'DATA_MANAGER',      label: 'Responsables Data' },
]

export function MessageComposePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('CIRCULAIRE')
  const [priority, setPriority] = useState('NORMAL')
  const [isSensitive, setIsSensitive] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [targetAll, setTargetAll] = useState(false)
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [targetFacilityIds, setTargetFacilityIds] = useState<string[]>([])
  const [targetUserIds, setTargetUserIds] = useState<string[]>([])

  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/facilities?limit=100').then((r) => r.json()).then((d) => { if (d.success) setFacilities(d.data) })
    fetch('/api/users?limit=100').then((r) => r.json()).then((d) => { if (d.success) setUsers(d.data || []) })
  }, [])

  const toggleRole = (role: string) =>
    setTargetRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role])

  const toggleFacility = (id: string) =>
    setTargetFacilityIds((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id])

  const addUser = (u: { id: string; name: string; role: string }) => {
    if (!targetUserIds.includes(u.id)) setTargetUserIds((prev) => [...prev, u.id])
    setUserSearch('')
    setShowUserDropdown(false)
  }
  const removeUser = (id: string) => setTargetUserIds((prev) => prev.filter((i) => i !== id))

  const filteredUsers = users.filter((u) =>
    u.id !== session?.user?.id &&
    !targetUserIds.includes(u.id) &&
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  )

  const addFile = (file: File) => {
    if (file.size > 20 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 20 Mo)'); return }
    setFiles((prev) => [...prev, file])
  }

  const onSubmit = async () => {
    if (!title.trim()) { toast.error('Titre requis'); return }
    if (!content.trim()) { toast.error('Contenu requis'); return }
    if (!targetAll && targetRoles.length === 0 && targetFacilityIds.length === 0 && targetUserIds.length === 0) {
      toast.error('Sélectionnez au moins un destinataire')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category, priority, isSensitive,
          expiresAt: expiresAt || null, targetAll, targetRoles, targetFacilityIds,
          targetRegionIds: [], targetUserIds }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      const messageId = data.data.id

      if (files.length > 0) {
        await Promise.all(files.map((file) => {
          const fd = new FormData()
          fd.append('file', file)
          return fetch(`/api/messages/${messageId}/documents`, { method: 'POST', body: fd })
        }))
      }

      toast.success('Message envoyé avec succès')
      router.push('/messages')
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'envoi')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedUsers = users.filter((u) => targetUserIds.includes(u.id))

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/messages" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <PageHeader title="Nouveau message" description="Rédiger et envoyer un message ou document administratif" />
      </div>

      <div className="space-y-5">
        {/* Titre + catégorie + priorité */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Titre <span className="text-red-400">*</span></label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Objet du message…"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Catégorie</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Priorité</label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                      priority === p.value ? `${p.color} bg-opacity-10` : 'border-gray-200 dark:border-gray-700 text-gray-400'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div onClick={() => setIsSensitive((v) => !v)}
                className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${isSensitive ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isSensitive ? 'translate-x-4' : ''}`} />
              </div>
              <div className="flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-red-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Document sensible</span>
              </div>
            </label>
            <div className="space-y-1 flex-1">
              <label className="text-xs text-gray-400">Expiration (optionnel)</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
            Contenu <span className="text-red-400">*</span>
          </label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6}
            placeholder="Rédigez votre message ici…"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none transition" />
        </div>

        {/* Destinataires */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Destinataires</h3>
          </div>

          {/* Tous */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <input type="checkbox" checked={targetAll} onChange={(e) => setTargetAll(e.target.checked)}
              className="w-4 h-4 accent-brand-500" />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Tous les utilisateurs</span>
            <span className="text-xs text-gray-400 ml-auto">Broadcast général</span>
          </label>

          {!targetAll && (
            <>
              {/* Par rôle */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Par rôle</p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <button key={r.value} type="button" onClick={() => toggleRole(r.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                        targetRoles.includes(r.value)
                          ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300 border-brand-300 dark:border-brand-700'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-brand-300'
                      }`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Par formation */}
              {facilities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Par formation sanitaire</p>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {facilities.map((f) => (
                      <label key={f.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <input type="checkbox" checked={targetFacilityIds.includes(f.id)} onChange={() => toggleFacility(f.id)}
                          className="w-3.5 h-3.5 accent-brand-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{f.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Utilisateurs spécifiques */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Utilisateurs spécifiques
                  {isSensitive && <span className="ml-2 text-red-500 normal-case font-normal">← recommandé pour docs sensibles</span>}
                </p>
                <div className="relative">
                  <input type="text" value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true) }}
                    onFocus={() => setShowUserDropdown(true)}
                    placeholder="Rechercher un utilisateur…"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  {showUserDropdown && userSearch && filteredUsers.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {filteredUsers.slice(0, 8).map((u) => (
                        <button key={u.id} type="button" onClick={() => addUser(u)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                          <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-800 dark:text-gray-200">{u.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedUsers.map((u) => (
                      <span key={u.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-full text-xs font-medium">
                        {u.name}
                        <button type="button" onClick={() => removeUser(u.id)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Pièces jointes */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Pièces jointes</h3>
          <p className="text-xs text-gray-400 mb-3">PDF, Word, Excel, images — max 20 Mo par fichier</p>
          <div
            onDrop={(e) => { e.preventDefault(); Array.from(e.dataTransfer.files).forEach(addFile) }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-5 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition group">
            <input ref={fileInputRef} type="file" multiple className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
              onChange={(e) => { Array.from(e.target.files || []).forEach(addFile); e.target.value = '' }} />
            <Upload className="w-7 h-7 text-gray-300 group-hover:text-brand-400 mx-auto mb-2 transition" />
            <p className="text-sm text-gray-400 group-hover:text-brand-600 transition">
              Glissez ou <span className="text-brand-600 font-medium">cliquez pour parcourir</span>
            </p>
          </div>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <FileText className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(f.size)}</p>
                  </div>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="p-1 text-gray-400 hover:text-red-500 transition"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <Link href="/messages" className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition">
            Annuler
          </Link>
          <button onClick={onSubmit} disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Envoi en cours…' : 'Envoyer le message'}
          </button>
        </div>
      </div>
    </div>
  )
}
