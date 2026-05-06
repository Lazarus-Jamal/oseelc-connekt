'use client'

import { useEffect, useState } from 'react'
import { Download, X, Share2 } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-banner-dismissed-until'
const DISMISS_DAYS = 7

function wasDismissedRecently(): boolean {
  try {
    const until = localStorage.getItem(DISMISS_KEY)
    return !!until && Date.now() < Number(until)
  } catch { return false }
}

function recordDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 864e5))
    localStorage.removeItem('pwa-banner-dismissed') // nettoyer l'ancienne clé permanente
  } catch {}
}

function migrateOldKey() {
  try {
    // L'ancienne clé 'pwa-banner-dismissed' bloquait indéfiniment — la supprimer
    if (localStorage.getItem('pwa-banner-dismissed')) {
      localStorage.removeItem('pwa-banner-dismissed')
    }
  } catch {}
}

export function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    migrateOldKey()

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.warn('[SW] Enregistrement échoué:', err))
    }

    // Déjà installé en mode standalone — rien à faire
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (isStandalone) return

    if (wasDismissedRecently()) return

    // iOS Safari : pas de beforeinstallprompt, instructions manuelles
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    if (ios) {
      setIsIOS(true)
      setShowBanner(true)
      return
    }

    // Chrome / Edge / Android — événement natif
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
      setInstallPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    recordDismissal()
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Oseelc" className="w-10 h-10 object-contain" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
            Installer Oseelc-connekt
          </p>

          {isIOS ? (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Appuyez sur{' '}
                <Share2 className="inline w-3.5 h-3.5 mb-0.5 text-blue-500" />{' '}
                <strong className="text-gray-700 dark:text-gray-300">Partager</strong>
                {' '}puis{' '}
                <strong className="text-gray-700 dark:text-gray-300">« Sur l'écran d'accueil »</strong>
                {' '}pour installer l'app.
              </p>
              <button
                onClick={handleDismiss}
                className="mt-3 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Compris
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                Accédez à l&apos;application depuis votre bureau ou écran d&apos;accueil, même hors connexion.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  <Download className="w-3 h-3" />
                  Installer
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Plus tard
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
