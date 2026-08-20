export function makeId(): string {
  return crypto.randomUUID();
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function listJson<T>(kv: KVNamespace, prefix: string): Promise<T[]> {
  const list = await kv.list({ prefix });
  const items: T[] = [];
  for (const { name } of list.keys) {
    const raw = await kv.get(name);
    if (raw !== null) items.push(JSON.parse(raw) as T);
  }
  return items;
}