'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2, Eye, EyeOff, CheckCircle2, X } from 'lucide-react'
import { toast } from 'sonner'

const SCOPES = [
  {
    id: 'care2x',
    label: 'Care2x uniquement',
    description: 'Syncs, rapports journaliers, recouvrement Care2x',
    color: 'border-orange-300 bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
  },
  {
    id: 'data',
    label: 'Toutes les données',
    description: 'Care2x + déclarations, budgets, statistiques, messages, planning, logs',
    color: 'border-red-300 bg-red-50',
    badge: 'bg-red-100 text-red-700',
  },
  {
    id: 'all',
    label: 'Reset complet',
    description: 'Tout effacer (conserve uniquement utilisateurs, centres, régions et clés API)',
    color: 'border-red-500 bg-red-100',
    badge: 'bg-red-600 text-white',
  },
] as const

type Scope = typeof SCOPES[number]['id']

interface ResetResult {
  totalDeleted: number
  counts: Record<string, number>
}

export default function ResetDbModal({ onClose }: { onClose: () => void }) {
  const [scope,    setScope]    = useState<Scope>('care2x')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<ResetResult | null>(null)

  const selectedScope = SCOPES.find(s => s.id === scope)!
  const canSubmit = password.length > 0 && confirm === 'SUPPRIMER' && !loading

  const handleReset = async () => {
    if (!canSubmit) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reset-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, scope }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Erreur lors de la réinitialisation')
        return
      }
      setResult({ totalDeleted: data.totalDeleted, counts: data.counts })
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 bg-red-600">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-white" />
            <span className="font-bold text-white text-lg">Réinitialisation de la base de données</span>
          </div>
          <button onClick={onClose} className="text-red-200 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {result ? (
          /* ── Résultat ── */
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 size={28} className="text-green-500" />
              <div>
                <div className="font-bold text-gray-900">Réinitialisation effectuée</div>
                <div className="text-sm text-gray-500">{result.totalDeleted} enregistrement(s) supprimé(s)</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto space-y-1">
              {Object.entries(result.counts).filter(([, v]) => v > 0).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-gray-600">{k}</span>
                  <span className="font-semibold text-gray-800">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={onClose}
              className="mt-4 w-full py-2.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors">
              Fermer
            </button>
          </div>
        ) : (
          /* ── Formulaire ── */
          <div className="p-6 space-y-5">
            {/* Avertissement */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              <strong>⚠️ Action irréversible.</strong> Les données supprimées ne peuvent pas être récupérées.
              Assurez-vous d'avoir une sauvegarde si nécessaire.
            </div>

            {/* Périmètre */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Périmètre de suppression</label>
              <div className="space-y-2">
                {SCOPES.map(s => (
                  <button key={s.id} type="button" onClick={() => setScope(s.id)}
                    className={`w-full text-left border-2 rounded-xl p-3 transition-all ${scope === s.id ? s.color + ' border-opacity-100' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-800">{s.label}</span>
                      {scope === s.id && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>Sélectionné</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe de réinitialisation</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmation textuelle */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Tapez <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-mono">SUPPRIMER</code> pour confirmer
              </label>
              <input
                type="text"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 font-mono"
              />
            </div>

            {/* Bouton */}
            <button
              onClick={handleReset}
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all
                disabled:opacity-40 disabled:cursor-not-allowed
                bg-red-600 hover:bg-red-700 text-white"
            >
              {loading
                ? <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Suppression en cours…</>
                : <><Trash2 size={16} /> Supprimer définitivement — {selectedScope.label}</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
