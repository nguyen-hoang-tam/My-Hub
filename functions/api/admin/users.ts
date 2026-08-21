import {
  deleteUser,
  getUserByEmail,
  hashPassword,
  countUsersByRole,
  makeSalt,
  normalizeEmail,
  putUser,
  requireAdmin,
  revokeUserSessions,
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

  // Chi tiết 1 user (bao gồm mật khẩu gốc để admin tra cứu)
  const emailParam = new URL(context.request.url).searchParams.get('email');
  if (emailParam) {
    const user = await getUserByEmail(context.env, normalizeEmail(emailParam));
    if (!user) return jsonError('Không tìm thấy user', 404);
    return Response.json({ ...toPublicUser(user), password: user.password ?? null });
  }

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
    password,
    createdAt: Date.now(),
    createdBy: auth.user.email,
  };
  await putUser(context.env, user);

  return Response.json(
    { success: true, message: 'Tạo tài khoản thành công', user: toPublicUser(user) },
    { status: 201 },
  );
};

// Sửa thông tin / khóa-mở khóa tài khoản
export const onRequestPut = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const auth = await requireAdmin(context.request, context.env);
  if ('error' in auth) return auth.error;

  const body = (await context.request.json().catch(() => null)) as {
    email?: unknown;
    name?: unknown;
    role?: unknown;
    disabled?: unknown;
  } | null;
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
  if (!email) return jsonError('Thiếu email', 400);

  const user = await getUserByEmail(context.env, email);
  if (!user) return jsonError('Không tìm thấy user', 404);

  if (typeof body?.name === 'string' && body.name.trim()) user.name = body.name.trim();

  if (typeof body?.role === 'string') {
    if (!VALID_ROLES.includes(body.role as UserRole)) return jsonError('Vai trò không hợp lệ', 400);
    user.role = body.role as UserRole;
  }

  if (typeof body?.disabled === 'boolean') {
    if (body.disabled && user.email === auth.user.email) {
      return jsonError('Không thể khóa chính tài khoản của bạn', 400);
    }
    if (body.disabled && user.role === 'admin') {
      const adminCount = await countUsersByRole(context.env, 'admin');
      if (adminCount <= 1) return jsonError('Không thể khóa admin duy nhất của hệ thống', 400);
    }
    user.disabled = body.disabled;
  }

  await putUser(context.env, user);
  // Khóa -> thu hồi toàn bộ session để đăng xuất ngay
  if (user.disabled) await revokeUserSessions(context.env, user.email);

  return Response.json({ success: true, user: toPublicUser(user) });
};

// Xóa tài khoản
export const onRequestDelete = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const auth = await requireAdmin(context.request, context.env);
  if ('error' in auth) return auth.error;

  const email = normalizeEmail(new URL(context.request.url).searchParams.get('email') ?? '');
  if (!email) return jsonError('Thiếu email', 400);
  if (email === auth.user.email) return jsonError('Không thể xóa chính tài khoản của bạn', 400);

  const user = await getUserByEmail(context.env, email);
  if (!user) return jsonError('Không tìm thấy user', 404);

  if (user.role === 'admin') {
    const adminCount = await countUsersByRole(context.env, 'admin');
    if (adminCount <= 1) return jsonError('Không thể xóa admin duy nhất của hệ thống', 400);
  }

  await revokeUserSessions(context.env, user.email);
  await deleteUser(context.env, user.email);

  return Response.json({ success: true });
};
