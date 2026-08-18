import { jsonError, listJson, makeId } from "../storage.js";
import type { ZnsConfigItem } from "./types.js";

const ZNS_PREFIX = "zns:";

export function znsKeyOf(id: string): string {
  return `${ZNS_PREFIX}${id}`;
}

export function listZnsConfigs(env: Env): Promise<ZnsConfigItem[]> {
  return listJson<ZnsConfigItem>(env.PRODUCTS, ZNS_PREFIX).then((items) =>
    items.sort((a, b) => b.updatedAt - a.updatedAt)
  );
}

function parseZnsBody(body: Record<string, unknown>): {
  error?: string;
  item?: Omit<ZnsConfigItem, "id" | "createdAt" | "updatedAt">;
} {
  const {
    partnerId,
    type,
    category,
    name,
    zaloTemplateId,
    zaloTemplate,
    variables,
    sampleMessage,
    accessToken,
    phone,
    mapping,
    events,
    ready,
  } = body;
  if (typeof name !== "string" || name.trim() === "") return { error: "Name is required" };
  if (typeof zaloTemplateId !== "string" || zaloTemplateId.trim() === "") {
    return { error: "zaloTemplateId is required" };
  }
  if (typeof zaloTemplate !== "string" || zaloTemplate.trim() === "") {
    return { error: "zaloTemplate is required" };
  }
  if (typeof sampleMessage !== "string" || sampleMessage.trim() === "") {
    return { error: "sampleMessage is required" };
  }
  return {
    item: {
      partnerId: typeof partnerId === "string" ? partnerId.trim() : "",
      type: typeof type === "string" ? type.trim() : "Zalo",
      category: typeof category === "string" ? category.trim() : "",
      name: name.trim(),
      zaloTemplateId: zaloTemplateId.trim(),
      zaloTemplate: zaloTemplate.trim(),
      variables: Array.isArray(variables)
        ? variables
            .map((v) => (typeof v === "string" ? v.trim().replace(/[{}]/g, "") : ""))
            .filter(Boolean)
        : [],
      sampleMessage: sampleMessage.trim(),
      accessToken: typeof accessToken === "string" ? accessToken.trim() : "",
      phone: typeof phone === "string" ? phone.trim() : "",
      mapping:
        mapping && typeof mapping === "object"
          ? (mapping as Record<string, string>)
          : {},
      events: Array.isArray(events)
        ? events.filter((e): e is string => typeof e === "string")
        : [],
      ready: ready === undefined ? false : Boolean(ready),
    },
  };
}

export async function handleZnsConfigs(
  request: Request,
  env: Env,
  method: string,
  id: string | undefined,
  sub: string | undefined
): Promise<Response> {
  if (method === "GET" && !id) {
    return Response.json(await listZnsConfigs(env));
  }

  if (method === "POST" && !id) {
    const parsed = parseZnsBody((await request.json()) as Record<string, unknown>);
    if (parsed.error || !parsed.item) return jsonError(parsed.error ?? "Invalid body", 400);
    const now = Date.now();
    const item: ZnsConfigItem = { ...parsed.item, id: makeId(), createdAt: now, updatedAt: now };
    await env.PRODUCTS.put(znsKeyOf(item.id), JSON.stringify(item));
    return Response.json(item, { status: 201 });
  }

  if (method === "GET" && id && !sub) {
    const raw = await env.PRODUCTS.get(znsKeyOf(id));
    if (!raw) return jsonError("Config not found", 404);
    return Response.json(JSON.parse(raw) as ZnsConfigItem);
  }

  if ((method === "PUT" || method === "PATCH") && id && !sub) {
    const raw = await env.PRODUCTS.get(znsKeyOf(id));
    if (!raw) return jsonError("Config not found", 404);
    const existing = JSON.parse(raw) as ZnsConfigItem;
    const parsed = parseZnsBody((await request.json()) as Record<string, unknown>);
    if (parsed.error || !parsed.item) return jsonError(parsed.error ?? "Invalid body", 400);
    const item: ZnsConfigItem = { ...parsed.item, id: existing.id, createdAt: existing.createdAt, updatedAt: Date.now() };
    await env.PRODUCTS.put(znsKeyOf(id), JSON.stringify(item));
    return Response.json(item);
  }

  if (method === "DELETE" && id) {
    await env.PRODUCTS.delete(znsKeyOf(id));
    return Response.json({ ok: true });
  }

  return jsonError("Method not allowed", 405);
}
