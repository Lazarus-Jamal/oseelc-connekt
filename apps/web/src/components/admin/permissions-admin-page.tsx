'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, RotateCcw, Save, Info } from 'lucide-react'
import { PAGE_DEFS, GROUP_LABELS, ALL_ROLES, defaultGranted, type AppRole, type PageDef } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/page-header'

// Rôles modifiables (SUPER_ADMIN toujours ON, non affiché dans la matrice)
const EDITABLE_ROLES = ALL_ROLES.filter((r) => r !== 'SUPER_ADMIN')

const ROLE_LABELS: Record<string, string> = {
  DATA_ADMIN:          'Admin Data',
  DIRECTION:           'Direction',
  REGIONAL_DIRECTOR:   'Dir. Régional',
  FACILITY_CHIEF:      'Chef de centre',
  FINANCIER:           'Financier',
  DATA_MANAGER:        'Data Manager',
  CONTROLEUR:          'Contrôleur',
  CONTROLEUR_REGIONAL: 'Contrôleur Rég.',
  CAISSIER:            'Caissier',
}

type Matrix = Record<string, Record<string, boolean>> // role → pageKey → granted

function groupPages(): { group: PageDef['group']; pages: PageDef[] }[] {
  const groups: PageDef['group'][] = ['main', 'admin', 'analytics', 'care2x']
  return groups.map((g) => ({
    group: g,
    pages: PAGE_DEFS.filter((p) => p.group === g && p.key !== 'admin.permissions'),
  }))
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
        disabled ? 'opacity-40 cursor-default' :
        checked ? 'bg-brand-500 hover:bg-brand-600' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700'
      }`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

export function PermissionsAdminPage() {
  const [matrix, setMatrix] = useState<Matrix>({})
  const [original, setOriginal] = useState<Matrix>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/permissions?all=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMatrix(d.data)
          setOriginal(JSON.parse(JSON.stringify(d.data)))
        }
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(role: string, pageKey: string, value: boolean) {
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [pageKey]: value },
    }))
  }

  function resetToDefaults() {
    if (!confirm('Réinitialiser toutes les permissions aux valeurs par défaut ?')) return
    const reset: Matrix = {}
    for (const role of EDITABLE_ROLES) {
      reset[role] = {}
      for (const def of PAGE_DEFS) {
        reset[role][def.key] = defaultGranted(def.key, role)
      }
    }
    setMatrix((prev) => ({ ...prev, ...reset }))
  }

  async function save() {
    setSaving(true)
    const updates: { role: string; pageKey: string; granted: boolean }[] = []
    for (const role of EDITABLE_ROLES) {
      for (const def of PAGE_DEFS) {
        const current = matrix[role]?.[def.key] ?? defaultGranted(def.key, role as AppRole)
        updates.push({ role, pageKey: def.key, granted: current })
      }
    }
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const d = await res.json()
      if (!d.success) throw new Error(d.error)
      setOriginal(JSON.parse(JSON.stringify(matrix)))
      toast.success('Permissions enregistrées')
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = JSON.stringify(matrix) !== JSON.stringify(original)
  const grouped = groupPages()

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gestion des droits d'accès"
        description="Configurez les pages et onglets accessibles pour chaque rôle"
      />

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          L'<strong>Informaticien (SUPER_ADMIN)</strong> a toujours accès à tout et n'apparaît pas dans ce tableau.
          Les changements sont visibles immédiatement pour les utilisateurs connectés (rechargement de page).
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end">
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Réinitialiser les défauts
        </button>
        <button
          onClick={save}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-xl disabled:opacity-50 disabled:cursor-default transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-gray-400">Chargement…</div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ group, pages }) => (
            <div key={group} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  {GROUP_LABELS[group]}
                </h3>
              </div>

              {/* Header row: role names */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left px-5 py-3 font-medium text-gray-500 w-52">Page / Onglet</th>
                      {EDITABLE_ROLES.map((role) => (
                        <th key={role} className="px-3 py-3 text-center font-medium text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">
                          {ROLE_LABELS[role] || role}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((page, idx) => (
                      <tr
                        key={page.key}
                        className={`${idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/20'} hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-colors`}
                      >
                        <td className="px-5 py-3 font-medium text-gray-700 dark:text-gray-300">
                          {page.label}
                        </td>
                        {EDITABLE_ROLES.map((role) => {
                          const granted = matrix[role]?.[page.key] ?? defaultGranted(page.key, role as AppRole)
                          return (
                            <td key={role} className="px-3 py-3 text-center">
                              <div className="flex justify-center">
                                <Toggle
                                  checked={granted}
                                  onChange={(v) => toggle(role, page.key, v)}
                                />
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sticky save bar when there are unsaved changes */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-xl">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          <span className="text-sm">Modifications non enregistrées</span>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 text-sm font-semibold bg-brand-500 hover:bg-brand-400 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}
    </div>
  )
}
