import {
  getUserByEmail,
  hashPassword,
  makeSalt,
  normalizeEmail,
  putUser,
  requireAdmin,
  toPublicUser,
  type StoredUser,
  type UserRole,
} from '../../_lib/auth.js';
import { jsonError, listJson } from '../../_lib/storage.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES: UserRole[] = ['user', 'admin'];

export const onRequestGet = async (context: { request: Request; env: Env }): Promise<Response> => {
  const auth = await requireAdmin(context.request, context.env);
  if ('error' in auth) return auth.error;
  const users = await listJson<StoredUser>(context.env.PRODUCTS, 'user:');
  return Response.json(users.map(toPublicUser).sort((a, b) => a.createdAt - b.createdAt));
};

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const auth = await requireAdmin(context.request, context.env);
  if ('error' in auth) return auth.error;

  const body = (await context.request.json().catch(() => null)) as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    role?: unknown;
  } | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const role = (typeof body?.role === 'string' ? body.role : 'user') as UserRole;

  if (!name) return jsonError('Vui lòng nhập họ tên', 400);
  if (!EMAIL_RE.test(email)) return jsonError('Email không hợp lệ', 400);
  if (password.length < 6) return jsonError('Mật khẩu tối thiểu 6 ký tự', 400);
  if (!VALID_ROLES.includes(role)) return jsonError('Vai trò không hợp lệ', 400);

  const existing = await getUserByEmail(context.env, email);
  if (existing) return jsonError('Email này đã tồn tại', 400);

  const salt = makeSalt();
  const user: StoredUser = {
    email,
    name,
    role,
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: Date.now(),
    createdBy: auth.user.email,
  };
  await putUser(context.env, user);

  return Response.json(
    { success: true, message: 'Tạo tài khoản thành công', user: toPublicUser(user) },
    { status: 201 },
  );
};
