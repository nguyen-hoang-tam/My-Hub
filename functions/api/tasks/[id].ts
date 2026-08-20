import { deleteTask, getTask, updateTask } from '../../_lib/tasks.js';
import { jsonError } from '../../_lib/storage.js';

export const onRequestGet = async (context: { env: Env; params: { id: string } }): Promise<Response> => {
  const task = await getTask(context.env.PRODUCTS, context.params.id);
  if (!task) return jsonError('Không tìm thấy task', 404);
  return Response.json(task);
};

export const onRequestPut = async (context: {
  request: Request;
  env: Env;
  params: { id: string };
}): Promise<Response> => {
  const result = await updateTask(context.env.PRODUCTS, context.params.id, await context.request.json());
  if ('error' in result) return jsonError(result.error, result.notFound ? 404 : 400);
  return Response.json(result.task);
};

export const onRequestPatch = onRequestPut;

export const onRequestDelete = async (context: { env: Env; params: { id: string } }): Promise<Response> => {
  await deleteTask(context.env.PRODUCTS, context.params.id);
  return Response.json({ ok: true });
};