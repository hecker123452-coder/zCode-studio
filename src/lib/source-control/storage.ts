/**
 * IndexedDB-based storage for Source Control snapshots.
 *
 * Replaces localStorage for storing commit snapshots.
 * localStorage has 5MB limit → crashes with large projects.
 * IndexedDB has 50MB+ limit and handles binary data better.
 */

const DB_NAME = 'zcode-source-control'
const DB_VERSION = 1
const STORE_COMMITS = 'commits'
const STORE_SNAPSHOTS = 'snapshots'

export interface CommitRecord {
  id: string
  message: string
  createdAt: number
  files: Array<{ fileId: string; name: string; content: string; path: string }>
}

export interface SnapshotRecord {
  fileId: string
  content: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_COMMITS)) {
        db.createObjectStore(STORE_COMMITS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'fileId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveCommit(commit: CommitRecord): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_COMMITS, 'readwrite')
    tx.objectStore(STORE_COMMITS).put(commit)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function loadCommits(): Promise<CommitRecord[]> {
  const db = await openDB()
  const result = await new Promise<CommitRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_COMMITS, 'readonly')
    const req = tx.objectStore(STORE_COMMITS).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return result.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteCommit(id: string): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_COMMITS, 'readwrite')
    tx.objectStore(STORE_COMMITS).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function saveSnapshot(fileId: string, content: string): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite')
    tx.objectStore(STORE_SNAPSHOTS).put({ fileId, content })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function loadSnapshots(): Promise<Record<string, string>> {
  const db = await openDB()
  const result = await new Promise<SnapshotRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readonly')
    const req = tx.objectStore(STORE_SNAPSHOTS).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
  db.close()
  const map: Record<string, string> = {}
  for (const s of result) {
    map[s.fileId] = s.content
  }
  return map
}

export async function clearAllSnapshots(): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite')
    tx.objectStore(STORE_SNAPSHOTS).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}
