'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Shield, Search, Filter, ChevronLeft, ChevronRight,
  User, FileText, LogIn, LogOut, Download, Plus, Pencil, Trash2,
  RefreshCw, Clock, Globe,
} from 'lucide-react'

interface AuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: { id: string; name: string; email: string; role: string }
}

const ACTION_META: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  CREATE: { label: 'Création',     color: 'text-emerald-600 bg-emerald-50', Icon: Plus     },
  UPDATE: { label: 'Modification', color: 'text-blue-600 bg-blue-50',       Icon: Pencil   },
  DELETE: { label: 'Suppression',  color: 'text-red-600 bg-red-50',         Icon: Trash2   },
  LOGIN:  { label: 'Connexion',    color: 'text-teal-600 bg-teal-50',        Icon: LogIn    },
  LOGOUT: { label: 'Déconnexion', color: 'text-gray-600 bg-gray-100',       Icon: LogOut   },
  EXPORT: { label: 'Export',       color: 'text-purple-600 bg-purple-50',   Icon: Download },
}

const ENTITY_LABELS: Record<string, string> = {
  declaration: 'Déclaration',
  statSheet: 'Fiche statistique',
  user: 'Utilisateur',
  facility: 'Formation sanitaire',
  budget: 'Budget',
  indicator: 'Indicateur',
  session: 'Session',
  report: 'Rapport',
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  DIRECTION: 'Direction',
  REGIONAL_DIRECTOR: 'Directeur régional',
  FACILITY_CHIEF: 'Chef de formation',
  DATA_MANAGER: 'Gestionnaire données',
  DATA_ADMIN: 'Admin données',
  FINANCIER: 'Financier',
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchLogs = useCallback(async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '50' })
    if (filterAction) params.set('action', filterAction)
    if (filterEntity) params.set('entityType', filterEntity)
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo) params.set('to', filterTo)

    const res = await fetch(`/api/admin/audit?${params}`)
    const json = await res.json()
    if (json.success) {
      setLogs(json.data)
      setTotal(json.meta.total)
      setPages(json.meta.pages)
    }
    setLoading(false)
  }, [page, filterAction, filterEntity, filterFrom, filterTo])

  useEffect(() => { fetchLogs(1); setPage(1) }, [filterAction, filterEntity, filterFrom, filterTo])
  useEffect(() => { fetchLogs(page) }, [page])

  const filtered = search
    ? logs.filter(l =>
        l.user.name.toLowerCase().includes(search.toLowerCase()) ||
        l.user.email.toLowerCase().includes(search.toLowerCase()) ||
        l.entityType.toLowerCase().includes(search.toLowerCase()) ||
        (l.entityId ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : logs

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
            <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Journal d'audit</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{total} entrée{total !== 1 ? 's' : ''} enregistrée{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => fetchLogs(page)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Filter className="w-4 h-4" />
          Filtres
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Action */}
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Toutes les actions</option>
            {Object.entries(ACTION_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Entity */}
          <select
            value={filterEntity}
            onChange={e => setFilterEntity(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Toutes les entités</option>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex gap-2">
            <input
              type="date"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              className="w-full px-2 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="date"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              className="w-full px-2 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Aucune entrée d'audit trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Horodatage</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Entité</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">IP</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map(log => {
                  const meta = ACTION_META[log.action] ?? { label: log.action, color: 'text-gray-600 bg-gray-100', Icon: FileText }
                  const ActionIcon = meta.Icon
                  const isExpanded = expanded === log.id
                  const hasDetails = log.oldValues || log.newValues

                  return (
                    <>
                      <tr
                        key={log.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition ${hasDetails ? 'cursor-pointer' : ''}`}
                        onClick={() => hasDetails && setExpanded(isExpanded ? null : log.id)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{new Date(log.createdAt).toLocaleDateString('fr-FR')}</span>
                            <span className="text-gray-400">{new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                              <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white leading-tight">{log.user.name}</p>
                              <p className="text-xs text-gray-400">{ROLE_LABELS[log.user.role] ?? log.user.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.color}`}>
                            <ActionIcon className="w-3 h-3" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                              {ENTITY_LABELS[log.entityType] ?? log.entityType}
                            </p>
                            {log.entityId && (
                              <p className="text-xs text-gray-400 font-mono truncate max-w-[120px]">{log.entityId}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {log.ipAddress && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Globe className="w-3 h-3" />
                              {log.ipAddress}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasDetails && (
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasDetails && (
                        <tr key={`${log.id}-detail`} className="bg-gray-50 dark:bg-gray-800/50">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              {log.oldValues && (
                                <div>
                                  <p className="font-semibold text-gray-500 mb-1 font-sans">Avant</p>
                                  <pre className="bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                                    {JSON.stringify(log.oldValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.newValues && (
                                <div>
                                  <p className="font-semibold text-gray-500 mb-1 font-sans">Après</p>
                                  <pre className="bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                                    {JSON.stringify(log.newValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                            {log.userAgent && (
                              <p className="mt-2 text-xs text-gray-400 truncate">
                                <span className="font-semibold font-sans">Agent : </span>{log.userAgent}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} / {pages} — {total} entrées
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
