import { jsonError } from './storage.js';

export type UserRole = 'admin' | 'user';

export interface StoredUser {
  email: string;
  name: string;
  role: UserRole;
  salt: string;
  passwordHash: string;
  createdAt: number;
  createdBy?: string;
}

export interface PublicUser {
  email: string;
  name: string;
  role: UserRole;
  createdAt: number;
}

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 ngày

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function userKey(email: string): string {
  return `user:${normalizeEmail(email)}`;
}

export function makeSalt(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getUserByEmail(env: Env, email: string): Promise<StoredUser | null> {
  const raw = await env.PRODUCTS.get(userKey(email));
  return raw ? (JSON.parse(raw) as StoredUser) : null;
}

export async function putUser(env: Env, user: StoredUser): Promise<void> {
  await env.PRODUCTS.put(userKey(user.email), JSON.stringify(user));
}

export function toPublicUser(user: StoredUser): PublicUser {
  return { email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
}

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = crypto.randomUUID();
  await env.PRODUCTS.put(`session:${token}`, JSON.stringify({ userId }), {
    expirationTtl: SESSION_TTL,
  });
  return token;
}

async function getSessionUser(request: Request, env: Env): Promise<StoredUser | null> {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const raw = await env.PRODUCTS.get(`session:${token}`);
  if (!raw) return null;
  const { userId } = JSON.parse(raw) as { userId: string };
  return getUserByEmail(env, userId);
}

type AuthResult = { user: StoredUser } | { error: Response };

export async function requireUser(request: Request, env: Env): Promise<AuthResult> {
  const user = await getSessionUser(request, env);
  if (!user) return { error: jsonError('Unauthorized', 401) };
  return { user };
}

export async function requireAdmin(request: Request, env: Env): Promise<AuthResult> {
  const result = await requireUser(request, env);
  if ('error' in result) return result;
  if (result.user.role !== 'admin') {
    return { error: jsonError('Chỉ admin mới có quyền thực hiện', 403) };
  }
  return result;
}
