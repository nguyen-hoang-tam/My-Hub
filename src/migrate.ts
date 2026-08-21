import { taskApi, type Task } from './api/tasks'

const STORAGE_KEY = 'myhub.tasks'
const MIGRATED_KEY = 'myhub.tasks.migrated'

type StoredTask = {
  id?: string
  title?: string
  department?: string
  status?: string
  done?: boolean
  deadline?: string | null
  image?: string | null
  images?: string[]
  deletedAt?: string
}

const DEPARTMENTS = ['Dev', 'BA', 'QC', 'UXUI'] as const
const STATUSES = ['new', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const

function normalize(stored: StoredTask): Task | null {
  if (!stored || typeof stored.title !== 'string' || stored.title.trim() === '') return null
  const department = DEPARTMENTS.includes(stored.department as (typeof DEPARTMENTS)[number])
    ? (stored.department as Task['departments'][number])
    : 'Dev'
  let status = stored.status as Task['status']
  if (!STATUSES.includes(status)) {
    status = stored.done ? 'completed' : 'new'
  }
  const images = Array.isArray(stored.images)
    ? stored.images.filter((i): i is string => typeof i === 'string')
    : typeof stored.image === 'string' && stored.image
      ? [stored.image]
      : []
  const now = Date.now()
  return {
    id: stored.id ?? crypto.randomUUID(),
    title: stored.title.trim(),
    departments: [department],
    status,
    deadline: typeof stored.deadline === 'string' && stored.deadline ? stored.deadline : null,
    images,
    createdAt: now,
    updatedAt: now,
  }
}

export async function migrateLegacyTasks(): Promise<number> {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return 0
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 0

    let stored: unknown
    try {
      stored = JSON.parse(raw)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      return 0
    }
    if (!Array.isArray(stored)) {
      localStorage.removeItem(STORAGE_KEY)
      return 0
    }

    const existing = await taskApi.getAll().catch(() => [])
    const existingIds = new Set(existing.map((t) => t.id))
    const existingTitles = new Set(existing.map((t) => t.title.trim().toLowerCase()))

    let migrated = 0
    for (const item of stored as StoredTask[]) {
      const task = normalize(item)
      if (!task) continue
      if (existingIds.has(task.id)) continue
      if (existingTitles.has(task.title.toLowerCase())) continue
      try {
        await taskApi.create({
          title: task.title,
          departments: task.departments,
          status: task.status,
          deadline: task.deadline,
          images: task.images,
        })
        migrated += 1
      } catch {
        // keep going
      }
    }

    localStorage.removeItem(STORAGE_KEY)
    localStorage.setItem(MIGRATED_KEY, '1')
    return migrated
  } catch {
    return 0
  }
}