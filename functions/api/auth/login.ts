import {
  createSession,
  getUserByEmail,
  hashPassword,
  normalizeEmail,
  toPublicUser,
} from '../../_lib/auth.js';
import { jsonError } from '../../_lib/storage.js';

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
  const body = (await context.request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password) return jsonError('Vui lòng nhập email và mật khẩu', 400);

  const user = await getUserByEmail(context.env, email);
  if (!user) return jsonError('Email hoặc mật khẩu không đúng', 401);
  if (user.disabled) return jsonError('Tài khoản đã bị khóa', 403);

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) return jsonError('Email hoặc mật khẩu không đúng', 401);

  const token = await createSession(context.env, user.email);
  return Response.json({ token, user: toPublicUser(user) });
};
