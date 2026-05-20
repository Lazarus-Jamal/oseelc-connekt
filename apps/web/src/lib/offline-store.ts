const DB_NAME = 'oseelc-offline'
const DB_VERSION = 1
const STORE = 'pending-submissions'

export interface PendingSubmission {
  id: string
  type: 'declaration' | 'expense'
  label: string        // description lisible pour l'UI
  endpoint: string
  method: 'POST' | 'PATCH'
  body: any
  createdAt: number
  status: 'pending' | 'syncing' | 'error'
  errorMsg?: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function savePending(item: Omit<PendingSubmission, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const db = await openDB()
  const record: PendingSubmission = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    status: 'pending',
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => resolve(record.id)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPending(): Promise<PendingSubmission[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as PendingSubmission[])
    req.onerror = () => reject(req.error)
  })
}

export async function updatePending(id: string, patch: Partial<PendingSubmission>): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const record = getReq.result
      if (!record) { resolve(); return }
      store.put({ ...record, ...patch })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function removePending(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function syncPending(onProgress?: (item: PendingSubmission, ok: boolean) => void): Promise<{ ok: number; failed: number }> {
  const items = await getPending()
  let ok = 0; let failed = 0

  for (const item of items) {
    await updatePending(item.id, { status: 'syncing' })
    try {
      const res = await fetch(item.endpoint, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await removePending(item.id)
      ok++
      onProgress?.(item, true)
    } catch (e: any) {
      await updatePending(item.id, { status: 'error', errorMsg: e.message })
      failed++
      onProgress?.(item, false)
    }
  }
  return { ok, failed }
}
