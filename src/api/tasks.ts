import { request } from './client'

export type Department = 'Dev' | 'BA' | 'QC' | 'UXUI'

export interface Task {
  id: string
  title: string
  departments: Department[]
  status: 'new' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
  deadline: string | null
  images: string[]
  createdAt: number
  updatedAt: number
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>

export const taskApi = {
  getAll: (): Promise<Task[]> => request<Task[]>('/api/tasks'),

  getOne: (id: string): Promise<Task> => request<Task>(`/api/tasks/${id}`),

  create: (data: TaskInput): Promise<Task> =>
    request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<TaskInput>): Promise<Task> =>
    request<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ ok: boolean }> =>
    request<{ ok: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),
}