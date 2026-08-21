import { listJson, makeId } from './storage.js';

export type Department = 'Dev' | 'BA' | 'QC' | 'UXUI';
export type Status = 'new' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  userId: string;
  title: string;
  departments: Department[];
  status: Status;
  deadline: string | null;
  images: string[];
  createdAt: number;
  updatedAt: number;
}

export type TaskInput = Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

const PREFIX = 'task:';

function keyOf(id: string): string {
  return `${PREFIX}${id}`;
}

const VALID_DEPARTMENTS = ['Dev', 'BA', 'QC', 'UXUI'] as const;
const VALID_STATUSES = ['new', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const;

function isDepartment(value: unknown): value is Department {
  return VALID_DEPARTMENTS.includes(value as Department);
}

function normalizeDepartments(value: unknown): Department[] {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return [...new Set(list.filter(isDepartment))];
}

type RawTask = Partial<Task> & { department?: unknown; specific?: unknown; specifics?: unknown };

// Chuyển task cũ sang dạng mới:
// - `department: string` -> `departments: string[]`
// - bỏ trường specific/specifics không còn dùng
function normalizeTask(raw: RawTask): Task {
  const departments = Array.isArray(raw.departments)
    ? normalizeDepartments(raw.departments)
    : normalizeDepartments(raw.department);
  const rest = { ...(raw as Record<string, unknown>) };
  delete rest.specific;
  delete rest.specifics;
  return { ...(rest as unknown as Task), departments };
}

interface ParsedFields {
  title?: string;
  departments?: Department[];
  status?: Status;
  deadline?: string | null;
  images?: string[];
}

// Validate từng trường có mặt trong body; trả về các field hợp lệ
function parseFields(body: Record<string, unknown>): { error: string } | { fields: ParsedFields } {
  const fields: ParsedFields = {};

  if ('title' in body) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      return { error: 'Tiêu đề không được để trống' };
    }
    fields.title = body.title.trim();
  }
  if ('departments' in body || 'department' in body) {
    const departments = normalizeDepartments(body.departments ?? body.department);
    if (departments.length === 0) {
      return { error: 'Phòng ban không hợp lệ' };
    }
    fields.departments = departments;
  }
  if ('status' in body) {
    if (!VALID_STATUSES.includes(body.status as Status)) {
      return { error: 'Trạng thái không hợp lệ' };
    }
    fields.status = body.status as Status;
  }
  if ('deadline' in body) {
    fields.deadline = typeof body.deadline === 'string' && body.deadline ? body.deadline : null;
  }
  if ('images' in body) {
    if (!Array.isArray(body.images)) {
      return { error: 'Hình ảnh không hợp lệ' };
    }
    fields.images = body.images.filter((i): i is string => typeof i === 'string');
  }

  return { fields };
}

export function validateTask(
  body: unknown
): { error: string } | { value: TaskInput } {
  if (!body || typeof body !== 'object') {
    return { error: 'Body không hợp lệ' };
  }
  const parsed = parseFields(body as Record<string, unknown>);
  if ('error' in parsed) return parsed;

  const { title, departments, status } = parsed.fields;
  if (!title) return { error: 'Tiêu đề không được để trống' };
  if (!departments || departments.length === 0) return { error: 'Phòng ban không hợp lệ' };
  if (!status) return { error: 'Trạng thái không hợp lệ' };

  return {
    value: {
      title,
      departments,
      status,
      deadline: parsed.fields.deadline ?? null,
      images: parsed.fields.images ?? [],
    },
  };
}

export async function listTasks(kv: KVNamespace, userId: string): Promise<Task[]> {
  const tasks = await listJson<Task>(kv, PREFIX);
  return tasks
    .map(normalizeTask)
    .filter((t) => t.userId === userId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getTask(kv: KVNamespace, id: string): Promise<Task | null> {
  const raw = await kv.get(keyOf(id));
  return raw ? normalizeTask(JSON.parse(raw) as RawTask) : null;
}

export async function createTask(
  kv: KVNamespace,
  body: unknown,
  userId: string
): Promise<{ error: string } | { task: Task }> {
  const valid = validateTask(body);
  if ('error' in valid) return { error: valid.error };
  const now = Date.now();
  const task: Task = {
    id: makeId(),
    userId,
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
  body: unknown,
  userId: string
): Promise<{ error: string; notFound?: boolean } | { task: Task }> {
  const existing = await getTask(kv, id);
  if (!existing || existing.userId !== userId) return { error: 'Không tìm thấy task', notFound: true };
  if (!body || typeof body !== 'object') {
    return { error: 'Body không hợp lệ' };
  }
  const parsed = parseFields(body as Record<string, unknown>);
  if ('error' in parsed) return { error: parsed.error };
  if (Object.keys(parsed.fields).length === 0) {
    return { error: 'Không có dữ liệu để cập nhật' };
  }
  const updated: Task = {
    ...existing,
    ...parsed.fields,
    updatedAt: Date.now(),
  };
  await kv.put(keyOf(id), JSON.stringify(updated));
  return { task: updated };
}

export async function deleteTask(kv: KVNamespace, id: string, userId: string): Promise<boolean> {
  const existing = await getTask(kv, id);
  if (!existing || existing.userId !== userId) return false;
  await kv.delete(keyOf(id));
  return true;
}
