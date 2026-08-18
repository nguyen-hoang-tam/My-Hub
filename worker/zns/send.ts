import { jsonError, listJson, makeId } from "../storage.js";
import type { ZnsConfigItem, ZnsHistoryItem } from "./types.js";
import { listZnsConfigs, znsKeyOf } from "./configs.js";

const ZNS_LOG_PREFIX = "znslog:";
const ZALO_ZNS_URL = "https://business.openapi.zalo.me/message/template";

function znsLogKeyOf(id: string): string {
  return `${ZNS_LOG_PREFIX}${id}`;
}

function resolveTemplateData(config: ZnsConfigItem, order: Record<string, string>): Record<string, string> {
  const data: Record<string, string> = {};
  for (const v of config.variables) {
    const field = config.mapping ? config.mapping[v] : undefined;
    data[v] = field && order[field] ? order[field] : "";
  }
  return data;
}

async function zaloSend(config: ZnsConfigItem, payload: Record<string, unknown>): Promise<{
  response: Response;
  data: unknown;
  isSuccess: boolean;
}> {
  let zaloRes: Response;
  let zaloData: unknown;
  try {
    zaloRes = await fetch(ZALO_ZNS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: config.accessToken,
      },
      body: JSON.stringify(payload),
    });
    zaloData = await zaloRes.json().catch(() => null);
  } catch (err) {
    zaloData = { networkError: err instanceof Error ? err.message : String(err) };
    zaloRes = new Response(null, { status: 500 });
  }
  const zaloError =
    zaloData && typeof zaloData === "object" && "error" in zaloData
      ? (zaloData as { error?: unknown }).error
      : undefined;
  const isSuccess =
    zaloRes.ok && (zaloError === undefined || zaloError === null || zaloError === 0);
  return { response: zaloRes, data: zaloData, isSuccess };
}

async function logHistory(
  env: Env,
  log: {
    config: ZnsConfigItem;
    phone: string;
    orderId: string;
    payload: Record<string, unknown>;
    data: unknown;
    isSuccess: boolean;
  }
): Promise<void> {
  const entry: ZnsHistoryItem = {
    id: makeId(),
    orderId: log.orderId,
    phone: log.phone,
    templateId: log.config.zaloTemplateId,
    templateName: log.config.name,
    sentAt: Date.now(),
    status: log.isSuccess ? "success" : "failed",
    error: log.isSuccess
      ? ""
      : typeof log.data === "string"
        ? log.data
        : JSON.stringify(log.data ?? {}),
    request: log.payload,
    response: log.data,
  };
  await env.PRODUCTS.put(znsLogKeyOf(entry.id), JSON.stringify(entry));
}

export function listHistory(env: Env): Promise<ZnsHistoryItem[]> {
  return listJson<ZnsHistoryItem>(env.PRODUCTS, ZNS_LOG_PREFIX).then((items) =>
    items.sort((a, b) => b.sentAt - a.sentAt)
  );
}

export async function handleZnsSend(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as {
    configId: string;
    templateData?: Record<string, string>;
    phone?: string;
    order?: Record<string, string>;
  };
  const raw = await env.PRODUCTS.get(znsKeyOf(body.configId));
  if (!raw) return jsonError("Config not found", 404);
  const config = JSON.parse(raw) as ZnsConfigItem;

  const template_data = body.templateData ?? resolveTemplateData(config, body.order ?? {});
  const phone = body.phone ?? config.phone;
  if (!phone) return jsonError("Phone is required", 400);
  if (!config.accessToken) return jsonError("Access token chưa được cấu hình", 400);

  const payload: Record<string, unknown> = {
    phone,
    template_id: config.zaloTemplateId,
    template_data,
  };
  const { response, data, isSuccess } = await zaloSend(config, payload);
  await logHistory(env, {
    config,
    phone,
    orderId: body.order?.order_code ?? "",
    payload,
    data,
    isSuccess,
  });
  return Response.json({ status: response.status, ok: isSuccess, data });
}

export async function handleZnsEvent(request: Request, env: Env, eventKey: string): Promise<Response> {
  const body = ((await request.json().catch(() => null)) as { order?: Record<string, string> } | null) ?? {};
  const order = body.order ?? {};
  const all = await listZnsConfigs(env);
  const targets = all.filter((c) => c.ready && (c.events ?? []).includes(eventKey));
  const results: unknown[] = [];
  for (const c of targets) {
    const template_data = resolveTemplateData(c, order);
    const phone = order.phone ?? c.phone;
    const payload: Record<string, unknown> = {
      phone,
      template_id: c.zaloTemplateId,
      template_data,
    };
    const { data, isSuccess } = await zaloSend(c, payload);
    await logHistory(env, {
      config: c,
      phone,
      orderId: order.order_code ?? "",
      payload,
      data,
      isSuccess,
    });
    results.push({ configId: c.id, name: c.name, ok: isSuccess, data });
  }
  return Response.json({ event: eventKey, sent: results.length, results });
}
