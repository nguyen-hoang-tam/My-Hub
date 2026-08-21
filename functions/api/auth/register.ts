import {
  createSession,
  getUserByEmail,
  hashPassword,
  makeSalt,
  normalizeEmail,
  putUser,
  toPublicUser,
} from '../../_lib/auth.js';
import { jsonError } from '../../_lib/storage.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
  const body = (await context.request.json().catch(() => null)) as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
  } | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!name) return jsonError('Vui lòng nhập họ tên', 400);
  if (!EMAIL_RE.test(email)) return jsonError('Email không hợp lệ', 400);
  if (password.length < 6) return jsonError('Mật khẩu tối thiểu 6 ký tự', 400);

  const existing = await getUserByEmail(context.env, email);
  if (existing) return jsonError('Email này đã được đăng ký', 400);

  const salt = makeSalt();
  const user = {
    email,
    name,
    role: 'user' as const,
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: Date.now(),
  };
  await putUser(context.env, user);

  const token = await createSession(context.env, user.email);
  return Response.json({ token, user: toPublicUser(user) }, { status: 201 });
};
