'use client'

import { useState } from 'react'
import { Download, Send, Globe, Loader2, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { toast } from 'sonner'

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export function DHIS2Page() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState<number | ''>('')
  const [format, setFormat] = useState('json')
  const [dhis2Url, setDhis2Url] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pushing, setPushing] = useState(false)
  const [pushResult, setPushResult] = useState<any>(null)

  const downloadExport = async () => {
    const params = new URLSearchParams({ year: String(year), format })
    if (month) params.set('month', String(month))
    const res = await fetch(`/api/dhis2/export?${params}`)
    if (!res.ok) { toast.error('Erreur lors de l\'export'); return }
    const blob = await res.blob()
    const ext = format === 'json' ? 'json' : 'xml'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dhis2-export-${year}${month ? '-' + month : ''}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Fichier téléchargé')
  }

  const pushToDHIS2 = async () => {
    if (!dhis2Url || !username || !password) {
      toast.error('Remplissez tous les champs de connexion DHIS2')
      return
    }
    setPushing(true)
    setPushResult(null)
    try {
      const res = await fetch('/api/dhis2/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dhis2Url, username, password, year, month: month || undefined }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setPushResult(json.data)
      toast.success('Données envoyées à DHIS2')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setPushing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
          <Globe className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Intégration DHIS2</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Export des données statistiques vers le système national DHIS2</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-semibold">Formats supportés</p>
            <ul className="list-disc list-inside text-blue-600 dark:text-blue-400 text-xs space-y-0.5">
              <li><strong>JSON</strong> — Format DHIS2 Data Value Set standard</li>
              <li><strong>XML DXF</strong> — Format XML DHIS2 v2</li>
              <li><strong>ADX</strong> — Aggregate Data Exchange (IHE)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Export parameters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Paramètres d'export</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Année</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mois (optionnel)</label>
            <select
              value={month}
              onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {MONTHS.map((m, i) => <option key={i} value={i || ''}>{i === 0 ? 'Toute l\'année' : m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Format</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="json">JSON</option>
              <option value="xml">XML (DXF)</option>
              <option value="adx">ADX (IHE)</option>
            </select>
          </div>
        </div>

        <button
          onClick={downloadExport}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition w-full justify-center"
        >
          <Download className="w-4 h-4" />
          Télécharger l'export {format.toUpperCase()}
        </button>
      </div>

      {/* Direct push to DHIS2 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Envoi direct vers DHIS2</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">URL de l'instance DHIS2</label>
            <input
              type="url"
              placeholder="https://play.dhis2.org/2.39"
              value={dhis2Url}
              onChange={e => setDhis2Url(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nom d'utilisateur</label>
              <input
                type="text"
                placeholder="admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mot de passe</label>
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <button
            onClick={pushToDHIS2}
            disabled={pushing}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition w-full justify-center"
          >
            {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer vers DHIS2
          </button>
        </div>

        {pushResult && (
          <div className={`flex items-start gap-3 p-3 rounded-xl ${pushResult.status === 'SUCCESS' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
            {pushResult.status === 'SUCCESS'
              ? <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />
              : <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
            }
            <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(pushResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
