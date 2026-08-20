import { listJson, makeId } from './storage.js';

export interface Task {
  id: string;
  title: string;
  department: 'Dev' | 'BA' | 'QC' | 'UXUI';
  status: 'new' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  deadline: string | null;
  images: string[];
  createdAt: number;
  updatedAt: number;
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

const PREFIX = 'task:';

function keyOf(id: string): string {
  return `${PREFIX}${id}`;
}

const VALID_DEPARTMENTS = ['Dev', 'BA', 'QC', 'UXUI'] as const;
const VALID_STATUSES = ['new', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const;

export function validateTask(
  body: unknown
): { error: string } | { value: TaskInput } {
  if (!body || typeof body !== 'object') {
    return { error: 'Body không hợp lệ' };
  }
  const { title, department, status, deadline, images } = body as Record<string, unknown>;

  if (typeof title !== 'string' || title.trim() === '') {
    return { error: 'Tiêu đề không được để trống' };
  }
  if (!VALID_DEPARTMENTS.includes(department as (typeof VALID_DEPARTMENTS)[number])) {
    return { error: 'Phòng ban không hợp lệ' };
  }
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { error: 'Trạng thái không hợp lệ' };
  }

  return {
    value: {
      title: title.trim(),
      department: department as TaskInput['department'],
      status: status as TaskInput['status'],
      deadline: typeof deadline === 'string' && deadline ? deadline : null,
      images: Array.isArray(images) ? images.filter((i): i is string => typeof i === 'string') : [],
    },
  };
}

export async function listTasks(kv: KVNamespace): Promise<Task[]> {
  const tasks = await listJson<Task>(kv, PREFIX);
  tasks.sort((a, b) => b.updatedAt - a.updatedAt);
  return tasks;
}

export async function getTask(kv: KVNamespace, id: string): Promise<Task | null> {
  const raw = await kv.get(keyOf(id));
  return raw ? (JSON.parse(raw) as Task) : null;
}

export async function createTask(kv: KVNamespace, body: unknown): Promise<{ error: string } | { task: Task }> {
  const valid = validateTask(body);
  if ('error' in valid) return { error: valid.error };
  const now = Date.now();
  const task: Task = {
    id: makeId(),
    ...valid.value,
    createdAt: now,
    updatedAt: now,
  };
  await kv.put(keyOf(task.id), JSON.stringify(task));
  return { task };
}

export async function updateTask(
  kv: KVNamespace,
  id: string,
  body: unknown
): Promise<{ error: string; notFound?: boolean } | { task: Task }> {
  const existing = await getTask(kv, id);
  if (!existing) return { error: 'Không tìm thấy task', notFound: true };
  const valid = validateTask(body);
  if ('error' in valid) return { error: valid.error };
  const updated: Task = {
    ...existing,
    ...valid.value,
    updatedAt: Date.now(),
  };
  await kv.put(keyOf(id), JSON.stringify(updated));
  return { task: updated };
}

export async function deleteTask(kv: KVNamespace, id: string): Promise<void> {
  await kv.delete(keyOf(id));
}