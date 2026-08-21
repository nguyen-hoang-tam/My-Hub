import { deleteTask, getTask, updateTask } from '../../_lib/tasks.js';
import { requireUser } from '../../_lib/auth.js';
import { jsonError } from '../../_lib/storage.js';

export const onRequestGet = async (context: {
  request: Request;
  env: Env;
  params: { id: string };
}): Promise<Response> => {
  const auth = await requireUser(context.request, context.env);
  if ('error' in auth) return auth.error;
  const task = await getTask(context.env.PRODUCTS, context.params.id);
  if (!task || task.userId !== auth.user.email) return jsonError('Không tìm thấy task', 404);
  return Response.json(task);
};

export const onRequestPut = async (context: {
  request: Request;
  env: Env;
  params: { id: string };
}): Promise<Response> => {
  const auth = await requireUser(context.request, context.env);
  if ('error' in auth) return auth.error;
  const result = await updateTask(
    context.env.PRODUCTS,
    context.params.id,
    await context.request.json(),
    auth.user.email,
  );
  if ('error' in result) return jsonError(result.error, result.notFound ? 404 : 400);
  return Response.json(result.task);
};

export const onRequestPatch = onRequestPut;

export const onRequestDelete = async (context: {
  request: Request;
  env: Env;
  params: { id: string };
}): Promise<Response> => {
  const auth = await requireUser(context.request, context.env);
  if ('error' in auth) return auth.error;
  const ok = await deleteTask(context.env.PRODUCTS, context.params.id, auth.user.email);
  if (!ok) return jsonError('Không tìm thấy task', 404);
  return Response.json({ ok: true });
};
