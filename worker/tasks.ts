import { jsonError, listJson, makeId } from './storage.js';

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

function validateTask(
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

export async function handleTasks(
  request: Request,
  env: Env,
  segments: string[],
  method: string
): Promise<Response> {
  const [, id] = segments;
  const now = Date.now();

  try {
    if (method === 'GET' && !id) {
      const tasks = await listJson<Task>(env.PRODUCTS, PREFIX);
      tasks.sort((a, b) => b.updatedAt - a.updatedAt);
      return Response.json(tasks);
    }

    if (method === 'GET' && id) {
      const raw = await env.PRODUCTS.get(keyOf(id));
      if (!raw) return jsonError('Không tìm thấy task', 404);
      return Response.json(JSON.parse(raw) as Task);
    }

    if (method === 'POST' && !id) {
      const valid = validateTask(await request.json());
      if ('error' in valid) return jsonError(valid.error, 400);
      const task: Task = {
        id: makeId(),
        ...valid.value,
        createdAt: now,
        updatedAt: now,
      };
      await env.PRODUCTS.put(keyOf(task.id), JSON.stringify(task));
      return Response.json(task, { status: 201 });
    }

    if ((method === 'PUT' || method === 'PATCH') && id) {
      const raw = await env.PRODUCTS.get(keyOf(id));
      if (!raw) return jsonError('Không tìm thấy task', 404);
      const existing = JSON.parse(raw) as Task;
      const valid = validateTask(await request.json());
      if ('error' in valid) return jsonError(valid.error, 400);
      const updated: Task = {
        ...existing,
        ...valid.value,
        updatedAt: now,
      };
      await env.PRODUCTS.put(keyOf(id), JSON.stringify(updated));
      return Response.json(updated);
    }

    if (method === 'DELETE' && id) {
      await env.PRODUCTS.delete(keyOf(id));
      return Response.json({ ok: true });
    }

    return jsonError('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return jsonError('Lỗi server', 500);
  }
}