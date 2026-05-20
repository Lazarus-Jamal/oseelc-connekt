'use client'

import { useEffect, useState, useCallback } from 'react'
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { getPending, syncPending, type PendingSubmission } from '@/lib/offline-store'
import { toast } from 'sonner'

export function OfflineSyncBanner() {
  const [isOnline, setIsOnline]     = useState(true)
  const [pending, setPending]       = useState<PendingSubmission[]>([])
  const [syncing, setSyncing]       = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  const refresh = useCallback(async () => {
    try { setPending(await getPending()) } catch {}
  }, [])

  // Surveiller connexion + charger les items en attente
  useEffect(() => {
    setIsOnline(navigator.onLine)
    refresh()

    const onOnline  = () => { setIsOnline(true);  refresh() }
    const onOffline = () => { setIsOnline(false); refresh() }
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [refresh])

  // Sync automatique au retour du réseau
  useEffect(() => {
    if (isOnline && pending.length > 0 && !syncing) {
      handleSync()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  const handleSync = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const { ok, failed } = await syncPending()
      await refresh()
      if (ok > 0) {
        toast.success(`${ok} saisie${ok > 1 ? 's' : ''} synchronisée${ok > 1 ? 's' : ''} avec succès`)
        setJustSynced(true)
        setTimeout(() => setJustSynced(false), 4000)
      }
      if (failed > 0) {
        toast.error(`${failed} saisie${failed > 1 ? 's' : ''} n'ont pas pu être synchronisée${failed > 1 ? 's' : ''}`)
      }
    } finally {
      setSyncing(false)
    }
  }

  // Rien à afficher si en ligne et aucun item en attente
  if (isOnline && pending.length === 0 && !justSynced) return null

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300 ${pending.length > 0 ? 'bottom-20' : 'bottom-4'}`}>
      <div className={`rounded-2xl border shadow-xl p-4 flex items-center gap-3 ${
        !isOnline
          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40'
          : justSynced
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
      }`}>

        {/* Icône état */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
          !isOnline ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600' :
          justSynced ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' :
          'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
        }`}>
          {!isOnline ? <WifiOff className="w-4 h-4" /> :
           justSynced ? <CheckCircle2 className="w-4 h-4" /> :
           syncing ? <Loader2 className="w-4 h-4 animate-spin" /> :
           <AlertCircle className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          {!isOnline ? (
            <>
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Hors connexion</p>
              {pending.length > 0
                ? <p className="text-xs text-orange-600 dark:text-orange-400">{pending.length} saisie{pending.length > 1 ? 's' : ''} sauvegardée{pending.length > 1 ? 's' : ''} localement</p>
                : <p className="text-xs text-orange-600 dark:text-orange-400">Vos saisies seront sauvegardées localement</p>
              }
            </>
          ) : justSynced ? (
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Saisies synchronisées !</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {pending.length} saisie{pending.length > 1 ? 's' : ''} en attente
              </p>
              <p className="text-xs text-gray-500">Prêtes à être envoyées au serveur</p>
            </>
          )}
        </div>

        {/* Bouton sync manuel */}
        {isOnline && pending.length > 0 && !syncing && (
          <button
            onClick={handleSync}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition"
          >
            <RefreshCw className="w-3 h-3" />
            Sync
          </button>
        )}
        {syncing && (
          <span className="flex-shrink-0 text-xs text-gray-400 italic">Sync…</span>
        )}
      </div>
    </div>
  )
}
