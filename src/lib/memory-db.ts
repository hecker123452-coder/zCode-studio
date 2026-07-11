// In-memory fallback database for serverless environments (Vercel, etc.)
// Used when SQLite/Prisma is not available (e.g., Vercel serverless)
// This is a temporary store — data is lost on cold start, but persists
// across warm invocations within the same serverless instance.

interface DeployedProjectRecord {
  id: string
  html: string
  fileName: string
  title: string
  views: number
  createdAt: Date
}

// Use globalThis to persist across hot reloads in dev and warm invocations in serverless
const globalStore = globalThis as unknown as {
  __deployStore?: Map<string, DeployedProjectRecord>
}

if (!globalStore.__deployStore) {
  globalStore.__deployStore = new Map()
}

const store = globalStore.__deployStore

export const memoryDB = {
  async create(data: { id: string; html: string; fileName: string; title: string }): Promise<DeployedProjectRecord> {
    const record: DeployedProjectRecord = {
      ...data,
      views: 0,
      createdAt: new Date(),
    }
    store.set(data.id, record)
    return record
  },

  async findById(id: string): Promise<DeployedProjectRecord | null> {
    return store.get(id) || null
  },

  async findAll(): Promise<DeployedProjectRecord[]> {
    return Array.from(store.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  },

  async incrementViews(id: string): Promise<void> {
    const record = store.get(id)
    if (record) {
      record.views++
      store.set(id, record)
    }
  },

  async delete(id: string): Promise<void> {
    store.delete(id)
  },
}
