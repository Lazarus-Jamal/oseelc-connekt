'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Circle, TrendingUp, TrendingDown, BarChart3, Clock, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { formatDateTime } from '@care-connekt/shared'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  DECLARATION_SUBMITTED: 'Déclaration soumise',
  DECLARATION_REVIEWED: 'Déclaration examinée',
  DECLARATION_VALIDATED: 'Déclaration validée',
  DECLARATION_REJECTED: 'Déclaration rejetée',
  STAT_SUBMITTED: 'Fiche stat soumise',
  STAT_VALIDATED: 'Fiche stat validée',
  STAT_REJECTED: 'Fiche stat rejetée',
  DEADLINE_APPROACHING: 'Échéance proche',
  DEADLINE_MISSED: 'Échéance dépassée',
}

const TYPE_COLORS: Record<string, string> = {
  DECLARATION_VALIDATED: 'text-green-600',
  STAT_VALIDATED: 'text-green-600',
  DECLARATION_REJECTED: 'text-red-600',
  STAT_REJECTED: 'text-red-600',
  DEADLINE_MISSED: 'text-red-600',
  DEADLINE_APPROACHING: 'text-orange-500',
  DECLARATION_SUBMITTED: 'text-blue-600',
  DECLARATION_REVIEWED: 'text-blue-500',
  STAT_SUBMITTED: 'text-blue-600',
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  DECLARATION_SUBMITTED: TrendingUp,
  DECLARATION_REVIEWED: Clock,
  DECLARATION_VALIDATED: TrendingUp,
  DECLARATION_REJECTED: TrendingUp,
  STAT_SUBMITTED: BarChart3,
  STAT_VALIDATED: BarChart3,
  STAT_REJECTED: BarChart3,
  DEADLINE_APPROACHING: AlertTriangle,
  DEADLINE_MISSED: AlertTriangle,
}

const TYPE_BG: Record<string, string> = {
  DECLARATION_VALIDATED: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  STAT_VALIDATED: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  DECLARATION_REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-600',
  STAT_REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-600',
  DEADLINE_MISSED: 'bg-red-100 dark:bg-red-900/30 text-red-600',
  DEADLINE_APPROACHING: 'bg-orange-100 dark:bg-orange-900/30 text-orange-500',
  DECLARATION_SUBMITTED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  DECLARATION_REVIEWED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-500',
  STAT_SUBMITTED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
}

export function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const load = () => {
    const params = filter === 'unread' ? '?unread=true' : ''
    fetch(`/api/notifications${params}`)
      .then((r) => r.json())
      .then((d) => {
        setNotifications(d.data || [])
        setUnreadCount(d.unreadCount || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { setLoading(true); load() }, [filter])

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    toast.success('Toutes les notifications marquées comme lues')
    load()
  }

  const handleClick = async (n: any) => {
    if (!n.isRead) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      })
    }
    if (n.relatedEntityId) {
      const path = n.relatedEntityType === 'expense' ? `/expenses/${n.relatedEntityId}`
        : n.relatedEntityType === 'declaration' ? `/declarations/${n.relatedEntityId}`
        : n.relatedEntityType === 'stat_sheet' ? `/statistics/${n.relatedEntityId}`
        : null
      if (path) router.push(path)
    }
    load()
  }

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} non lue${unreadCount !== 1 ? 's' : ''}` : 'Tout est lu'}
        action={
          unreadCount > 0 ? (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <CheckCheck className="w-4 h-4" />
              Tout marquer lu
            </button>
          ) : undefined
        }
      />

      {/* Filtre */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition',
              filter === f ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {f === 'all' ? 'Toutes' : `Non lues${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type] || Bell
              const isExpense = n.relatedEntityType === 'expense'
              const ActualIcon = isExpense ? TrendingDown : Icon
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    'flex gap-4 px-5 py-4 transition cursor-pointer',
                    !n.isRead
                      ? 'bg-brand-50/50 dark:bg-brand-900/10 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                  )}
                >
                  {/* Icon */}
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', TYPE_BG[n.type] || 'bg-gray-100 text-gray-500')}>
                    <ActualIcon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-xs font-semibold', TYPE_COLORS[n.type] || 'text-gray-500')}>
                        {TYPE_LABELS[n.type] || n.type}
                      </p>
                      {!n.isRead && (
                        <Circle className="w-1.5 h-1.5 text-brand-500 fill-brand-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className={cn('text-sm mt-0.5', !n.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300')}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                  </div>

                  {n.relatedEntityId && (
                    <div className="flex-shrink-0 self-center">
                      <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">Voir →</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
