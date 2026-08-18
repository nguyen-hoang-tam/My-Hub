import { jsonError } from "../storage.js";
import { handleZnsConfigs } from "./configs.js";
import { handleZnsEvent, handleZnsSend, listHistory } from "./send.js";

export async function handleZns(
  request: Request,
  env: Env,
  segments: string[],
  method: string
): Promise<Response> {
  const [, action, id, sub] = segments;

  if (action === "history") {
    if (method === "GET") {
      return Response.json(await listHistory(env));
    }
    return jsonError("Method not allowed", 405);
  }

  if (action === "events" && method === "POST" && id) {
    return handleZnsEvent(request, env, id);
  }

  if (action === "send" && method === "POST") {
    return handleZnsSend(request, env);
  }

  if (action === "configs") {
    return handleZnsConfigs(request, env, method, id, sub);
  }

  return jsonError("Method not allowed", 405);
}
