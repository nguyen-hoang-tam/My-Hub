import { createTask, listTasks } from '../../_lib/tasks.js';
import { requireUser } from '../../_lib/auth.js';
import { jsonError } from '../../_lib/storage.js';

export const onRequestGet = async (context: { request: Request; env: Env }): Promise<Response> => {
  const auth = await requireUser(context.request, context.env);
  if ('error' in auth) return auth.error;
  return Response.json(await listTasks(context.env.PRODUCTS, auth.user.email));
};

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const auth = await requireUser(context.request, context.env);
  if ('error' in auth) return auth.error;
  const result = await createTask(context.env.PRODUCTS, await context.request.json(), auth.user.email);
  if ('error' in result) return jsonError(result.error, 400);
  return Response.json(result.task, { status: 201 });
};
