'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { PAGE_DEFS } from '@/lib/permissions'

type PermMap = Record<string, boolean>

interface PermissionsCtx {
  permissions: PermMap
  canAccess: (pageKey: string) => boolean
  ready: boolean
}

const PermissionsContext = createContext<PermissionsCtx>({
  permissions: {},
  canAccess: () => true,
  ready: false,
})

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<PermMap>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/admin/permissions')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPermissions(d.data)
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  function canAccess(pageKey: string): boolean {
    if (!ready) {
      // Fail-open while loading: use built-in defaults from PAGE_DEFS
      const def = PAGE_DEFS.find((p) => p.key === pageKey)
      return def ? true : false
    }
    return permissions[pageKey] ?? false
  }

  return (
    <PermissionsContext.Provider value={{ permissions, canAccess, ready }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
