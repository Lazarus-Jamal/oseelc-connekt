'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X, Check,
  MapPin, Clock, Users, FileText, Loader2, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

interface PlanningEvent {
  id: string
  title: string
  description: string | null
  type: string
  startAt: string
  endAt: string | null
  allDay: boolean
  location: string | null
  color: string | null
  isCompleted: boolean
  createdBy: { id: string; name: string; role: string }
  facility: { id: string; name: string } | null
  region: { id: string; name: string } | null
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  VISIT: { label: 'Visite', color: '#0284c7' },
  DEADLINE: { label: 'Échéance', color: '#dc2626' },
  MEETING: { label: 'Réunion', color: '#7c3aed' },
  TRAINING: { label: 'Formation', color: '#059669' },
  AUDIT_VISIT: { label: 'Visite d\'audit', color: '#d97706' },
  OTHER: { label: 'Autre', color: '#6b7280' },
}

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function PlanningPage() {
  const { data: session } = useSession()
  const [events, setEvents] = useState<PlanningEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'month' | 'list'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    title: '', type: 'OTHER', startAt: '', endAt: '',
    description: '', location: '', allDay: false, color: '',
  })
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const from = new Date(year, month, 1).toISOString()
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    const res = await fetch(`/api/planning?from=${from}&to=${to}`)
    const json = await res.json()
    if (json.success) setEvents(json.data)
    setLoading(false)
  }, [currentDate])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.title || !form.startAt) { toast.error('Titre et date de début requis'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          startAt: new Date(form.startAt).toISOString(),
          endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Événement créé')
      setShowModal(false)
      setForm({ title: '', type: 'OTHER', startAt: '', endAt: '', description: '', location: '', allDay: false, color: '' })
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleComplete = async (id: string, current: boolean) => {
    await fetch(`/api/planning/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: !current }),
    })
    load()
  }

  const deleteEvent = async (id: string) => {
    if (!confirm('Supprimer cet événement ?')) return
    await fetch(`/api/planning/${id}`, { method: 'DELETE' })
    toast.success('Événement supprimé')
    load()
  }

  // Calendar grid
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calCells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]

  function getEventsForDay(date: Date) {
    return events.filter((e) => isSameDay(new Date(e.startAt), date))
  }

  const upcoming = [...events]
    .filter((e) => new Date(e.startAt) >= new Date())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 20)

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
            <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Planning & Agenda</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{events.length} événement{events.length !== 1 ? 's' : ''} ce mois-ci</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['month', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium transition ${view === v ? 'bg-teal-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                {v === 'month' ? 'Calendrier' : 'Liste'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{MONTHS_FR[month]} {year}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
            {DAYS_FR.map((d) => (
              <div key={d} className="text-center py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7">
            {calCells.map((date, i) => {
              const dayEvents = date ? getEventsForDay(date) : []
              const isToday = date && isSameDay(date, new Date())
              const isSelected = date && selectedDay && isSameDay(date, selectedDay)

              return (
                <div
                  key={i}
                  onClick={() => date && setSelectedDay(isSelected ? null : date)}
                  className={`min-h-[72px] p-1.5 border-b border-r border-gray-50 dark:border-gray-800/50 transition cursor-pointer
                    ${date ? 'hover:bg-gray-50 dark:hover:bg-gray-800/30' : 'bg-gray-50/50 dark:bg-gray-900/50 cursor-default'}
                    ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}
                >
                  {date && (
                    <>
                      <span className={`inline-flex w-6 h-6 items-center justify-center text-xs font-medium rounded-full mb-1
                        ${isToday ? 'bg-teal-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {date.getDate()}
                      </span>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map((e) => (
                          <div
                            key={e.id}
                            className="truncate text-[10px] px-1 py-0.5 rounded font-medium"
                            style={{ background: `${(TYPE_CONFIG[e.type]?.color ?? '#6b7280')}20`, color: TYPE_CONFIG[e.type]?.color ?? '#6b7280' }}
                          >
                            {e.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <p className="text-[9px] text-gray-400 px-1">+{dayEvents.length - 2} autres</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Selected day detail */}
          {selectedDay && selectedEvents.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              {selectedEvents.map((e) => (
                <EventRow key={e.id} event={e} onToggle={toggleComplete} onDelete={deleteEvent} currentUserId={session?.user?.id ?? ''} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Événements à venir</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucun événement à venir</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {upcoming.map((e) => (
                <EventRow key={e.id} event={e} onToggle={toggleComplete} onDelete={deleteEvent} currentUserId={session?.user?.id ?? ''} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Nouvel événement</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Titre *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Début *</label>
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fin</label>
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <input
                type="text"
                placeholder="Lieu (optionnel)"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <textarea
                placeholder="Description (optionnel)"
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl transition"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EventRow({ event, onToggle, onDelete, currentUserId }: {
  event: PlanningEvent
  onToggle: (id: string, current: boolean) => void
  onDelete: (id: string) => void
  currentUserId: string
}) {
  const config = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.OTHER
  const canEdit = event.createdBy.id === currentUserId

  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${event.isCompleted ? 'opacity-50' : ''}`}>
      <button
        onClick={() => onToggle(event.id, event.isCompleted)}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${event.isCompleted ? 'bg-teal-600 border-teal-600' : 'border-gray-300 hover:border-teal-500'}`}
      >
        {event.isCompleted && <Check className="w-3 h-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: `${config.color}20`, color: config.color }}
          >
            {config.label}
          </span>
          <p className={`text-sm font-medium text-gray-900 dark:text-white ${event.isCompleted ? 'line-through' : ''}`}>
            {event.title}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(event.startAt)}
            {event.endAt && ` — ${formatTime(event.endAt)}`}
          </span>
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {event.location}
            </span>
          )}
          {event.facility && (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {event.facility.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {event.createdBy.name}
          </span>
        </div>
        {event.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{event.description}</p>
        )}
      </div>
      {canEdit && (
        <button
          onClick={() => onDelete(event.id)}
          className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
