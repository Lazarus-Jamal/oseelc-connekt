'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { formatDate } from '@care-connekt/shared'
import { Plus, Inbox, Send, Paperclip, Eye, EyeOff, AlertTriangle, Info, Bell } from 'lucide-react'
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
const PRIORITY_CONFIG: Record<string, { label: string; icon: any; class: string }> = {
  NORMAL:    { label: 'Normal',    icon: Info,          class: 'text-gray-400' },
  IMPORTANT: { label: 'Important', icon: Bell,          class: 'text-blue-500' },
  URGENT:    { label: 'Urgent',    icon: AlertTriangle, class: 'text-red-500' },
}

const CAN_SEND = ['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'FACILITY_CHIEF']

export function MessagesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox')
  const [items, setItems] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const role = session?.user?.role || ''
  const canSend = CAN_SEND.includes(role)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/messages?box=${tab}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.data || [])
        if (d.unreadCount !== undefined) setUnreadCount(d.unreadCount)
      })
      .finally(() => setLoading(false))
  }, [tab])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Messagerie administrative"
        description="Notes, circulaires et documents internes"
        action={canSend ? (
          <Link href="/messages/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition">
            <Plus className="w-4 h-4" /> Nouveau message
          </Link>
        ) : undefined}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'inbox' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}>
          <Inbox className="w-4 h-4" />
          Reçus
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {canSend && (
          <button onClick={() => setTab('sent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'sent' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <Send className="w-4 h-4" />
            Envoyés
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <Inbox className="w-10 h-10 opacity-30" />
          <p className="text-sm">{tab === 'inbox' ? 'Aucun message reçu' : 'Aucun message envoyé'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.NORMAL
            const PriorityIcon = priority.icon
            const isUnread = tab === 'inbox' && !item.isRead
            return (
              <div
                key={item.id}
                onClick={() => router.push(`/messages/${item.id}`)}
                className={`relative bg-white dark:bg-gray-900 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                  isUnread
                    ? 'border-brand-200 dark:border-brand-800 shadow-sm'
                    : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                {isUnread && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-l-2xl" />
                )}
                <div className="px-5 py-4 flex items-start gap-4">
                  {/* Priority icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    <PriorityIcon className={`w-4 h-4 ${priority.class}`} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      {item.isSensitive && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Sensible
                        </span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {tab === 'inbox'
                        ? `De : ${item.sender?.name} (${ROLES_LABELS[item.sender?.role] || item.sender?.role})`
                        : `${item.recipientCount} destinataire${item.recipientCount > 1 ? 's' : ''} · ${item.readCount} lu${item.readCount > 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                  {/* Meta */}
                  <div className="flex-shrink-0 text-right space-y-1">
                    <p className="text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                    <div className="flex items-center justify-end gap-2">
                      {item.documentCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Paperclip className="w-3 h-3" />
                          {item.documentCount}
                        </span>
                      )}
                      {tab === 'inbox' && (
                        isUnread
                          ? <EyeOff className="w-3.5 h-3.5 text-brand-400" />
                          : <Eye className="w-3.5 h-3.5 text-gray-300" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
