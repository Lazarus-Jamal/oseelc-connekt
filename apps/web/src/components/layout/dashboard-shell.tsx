'use client'

import { useState, useEffect } from 'react'
import type { Session } from 'next-auth'
import { Header } from './header'
import { Sidebar } from './sidebar'
import { cacheReferenceData } from '@/lib/offline-data-cache'

interface Props {
  session: Session
  children: React.ReactNode
}

export function DashboardShell({ session, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // 1. Pré-cacher les pages HTML via le service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: 'PRECACHE_APP_PAGES' })
      }).catch(() => {})
    }

    // 2. Mettre en cache les données de référence pour le shell offline
    const user = session.user as any
    fetch('/api/facilities?limit=200&isActive=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          cacheReferenceData(d.data || [], {
            facilityId: user.facilityId,
            name: user.name,
          })
        }
      })
      .catch(() => {})
  }, [session])

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        session={session}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          session={session}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
