import { createTask, listTasks } from '../../_lib/tasks.js';
import { jsonError } from '../../_lib/storage.js';

export const onRequestGet = async (context: { env: Env }): Promise<Response> => {
  return Response.json(await listTasks(context.env.PRODUCTS));
};

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
  const result = await createTask(context.env.PRODUCTS, await context.request.json());
  if ('error' in result) return jsonError(result.error, 400);
  return Response.json(result.task, { status: 201 });
};