interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  quantity: number;
  createdAt: number;
  updatedAt: number;
}

const KEY_PREFIX = "product:";

interface ZnsConfigItem {
  id: string;
  name: string;
  accessToken: string;
  templateId: string;
  phone: string;
  templateData: Record<string, string>;
  trackingId: string;
  enabled: boolean;
  mapping: Record<string, string>;
  triggers: string[];
  createdAt: number;
  updatedAt: number;
}

interface ZaloTemplate {
  id: string;
  templateId: string;
  name: string;
  type: string;
  status: string;
  purpose: string;
  price: number;
  registeredAt: number;
}

interface ZnsHistoryItem {
  id: string;
  orderId: string;
  phone: string;
  templateId: string;
  templateName: string;
  sentAt: number;
  status: "success" | "failed";
  error: string;
  request: unknown;
  response: unknown;
}

const ZNS_PREFIX = "zns:";
const ZNS_LOG_PREFIX = "znslog:";
const ZNS_TEMPLATES_KEY = "zns_templates";
const ZALO_ZNS_URL = "https://business.openapi.zalo.me/message/template";
const ZALO_TEMPLATE_LIST_URL = "https://business.openapi.zalo.me/message/template?offset=0&limit=50";

function keyOf(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

function znsKeyOf(id: string): string {
  return `${ZNS_PREFIX}${id}`;
}

function znsLogKeyOf(id: string): string {
  return `${ZNS_LOG_PREFIX}${id}`;
}

async function listZnsConfigs(env: Env): Promise<ZnsConfigItem[]> {
  const list = await env.PRODUCTS.list({ prefix: ZNS_PREFIX });
  const items = await Promise.all(
    list.keys.map(async ({ name }) => {
      const raw = await env.PRODUCTS.get(name);
      return raw ? (JSON.parse(raw) as ZnsConfigItem) : null;
    })
  );
  return items
    .filter((c): c is ZnsConfigItem => c !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function parseZnsBody(body: Record<string, unknown>): {
  error?: string;
  item?: Omit<ZnsConfigItem, "id" | "createdAt" | "updatedAt">;
} {
  const { name, accessToken, templateId, phone, templateData, trackingId, enabled, mapping, triggers } = body;
  if (typeof name !== "string" || name.trim() === "") return { error: "Name is required" };
  if (typeof accessToken !== "string" || accessToken.trim() === "") {
    return { error: "accessToken is required" };
  }
  if (typeof templateId !== "string" || templateId.trim() === "") {
    return { error: "templateId is required" };
  }
  return {
    item: {
      name: name.trim(),
      accessToken: accessToken.trim(),
      templateId: templateId.trim(),
      phone: typeof phone === "string" ? phone.trim() : "",
      templateData:
        templateData && typeof templateData === "object"
          ? (templateData as Record<string, string>)
          : {},
      trackingId: typeof trackingId === "string" ? trackingId : "",
      enabled: enabled === undefined ? true : Boolean(enabled),
      mapping:
        mapping && typeof mapping === "object"
          ? (mapping as Record<string, string>)
          : {},
      triggers: Array.isArray(triggers) ? triggers.filter((t): t is string => typeof t === "string") : [],
    },
  };
}

async function listTemplates(env: Env): Promise<ZaloTemplate[]> {
  const raw = await env.PRODUCTS.get(ZNS_TEMPLATES_KEY);
  return raw ? (JSON.parse(raw) as ZaloTemplate[]) : [];
}

async function syncTemplates(env: Env, accessToken: string): Promise<{ ok: boolean; status: number; data: unknown }> {
  const zaloRes = await fetch(ZALO_TEMPLATE_LIST_URL, {
    method: "GET",
    headers: { access_token: accessToken },
  });
  const zaloData = await zaloRes.json().catch(() => null);
  if (!zaloRes.ok || !zaloData || typeof zaloData !== "object" || !("data" in zaloData)) {
    return { ok: zaloRes.ok, status: zaloRes.status, data: zaloData };
  }
  const data = zaloData as { data: { templates?: unknown[] } };
  const templates: ZaloTemplate[] = (data.data.templates ?? []).map((t, i) => {
    const template = t as Record<string, unknown>;
    return {
      id: String(template.template_id ?? makeId()),
      templateId: String(template.template_id ?? ""),
      name: String(template.template_name ?? "Unknown"),
      type: String(template.template_type ?? "Paragraph"),
      status: String(template.template_status ?? "WAIT"),
      purpose: String(template.purpose ?? ""),
      price: typeof template.price === "number" ? template.price : 0,
      registeredAt: Date.now() - i * 86400000,
    };
  });
  await env.PRODUCTS.put(ZNS_TEMPLATES_KEY, JSON.stringify(templates));
  return { ok: true, status: 200, data: templates };
}

async function listHistory(env: Env): Promise<ZnsHistoryItem[]> {
  const list = await env.PRODUCTS.list({ prefix: ZNS_LOG_PREFIX });
  const items = await Promise.all(
    list.keys.map(async ({ name }) => {
      const raw = await env.PRODUCTS.get(name);
      return raw ? (JSON.parse(raw) as ZnsHistoryItem) : null;
    })
  );
  return items
    .filter((h): h is ZnsHistoryItem => h !== null)
    .sort((a, b) => b.sentAt - a.sentAt);
}

async function handleZns(
  request: Request,
  env: Env,
  segments: string[],
  method: string
): Promise<Response> {
  const [, action, id, sub] = segments;

  if (action === "templates") {
    if (method === "GET" && !id) {
      return Response.json(await listTemplates(env));
    }
    if (method === "POST" && id === "seed") {
      const now = Date.now();
      const samples: ZaloTemplate[] = [
        { id: "t1", templateId: "7895417a7d3f9461cd2e", name: "Xác nhận đơn hàng", type: "Table", status: "ENABLE", purpose: "Giao dịch (IN_TRANSACTION)", price: 150, registeredAt: now - 4 * 86400000 },
        { id: "t2", templateId: "e12a9c0b7f2d84a1b0c3", name: "Thông báo giao hàng", type: "Paragraph", status: "ENABLE", purpose: "Giao dịch (IN_TRANSACTION)", price: 150, registeredAt: now - 4 * 86400000 },
        { id: "t3", templateId: "9c41a6e8d1b74f2a90e5", name: "Mã OTP xác thực", type: "OTP", status: "WAIT", purpose: "Xác thực tài khoản", price: 250, registeredAt: now - 5 * 86400000 },
        { id: "t4", templateId: "b27f0d3a9e5c8146f2a7", name: "Đánh giá dịch vụ", type: "Rating", status: "REJECT", purpose: "Chăm sóc khách hàng", price: 300, registeredAt: now - 6 * 86400000 },
        { id: "t5", templateId: "6d1e8b4f2a9c3075d1e6", name: "Nhắc thanh toán hóa đơn", type: "Paragraph", status: "ENABLE", purpose: "Giao dịch (IN_TRANSACTION)", price: 150, registeredAt: now - 6 * 86400000 },
        { id: "t6", templateId: "a34f1c7d8e2b9506c4f1", name: "Khuyến mãi sản phẩm mới", type: "Paragraph", status: "WAIT", purpose: "Quảng cáo", price: 500, registeredAt: now - 7 * 86400000 },
      ];
      await env.PRODUCTS.put(ZNS_TEMPLATES_KEY, JSON.stringify(samples));
      return Response.json({ ok: true, status: 200, data: samples });
    }
    if (method === "POST" && id === "sync") {
      const body = (await request.json()) as { accessToken?: string };
      if (!body.accessToken || body.accessToken.trim() === "") {
        return jsonError("accessToken is required", 400);
      }
      const result = await syncTemplates(env, body.accessToken.trim());
      return Response.json(result, { status: result.ok ? 200 : result.status });
    }
    return jsonError("Method not allowed", 405);
  }

  if (action === "history") {
    if (method === "GET") {
      return Response.json(await listHistory(env));
    }
    return jsonError("Method not allowed", 405);
  }

  if (action === "configs") {
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

    if (method === "PATCH" && id && sub === "toggle") {
      const raw = await env.PRODUCTS.get(znsKeyOf(id));
      if (!raw) return jsonError("Config not found", 404);
      const existing = JSON.parse(raw) as ZnsConfigItem;
      const item: ZnsConfigItem = { ...existing, enabled: !existing.enabled, updatedAt: Date.now() };
      await env.PRODUCTS.put(znsKeyOf(id), JSON.stringify(item));
      return Response.json(item);
    }

    if (method === "DELETE" && id) {
      await env.PRODUCTS.delete(znsKeyOf(id));
      return Response.json({ ok: true });
    }
  }

  if (action === "send" && method === "POST") {
    const body = (await request.json()) as {
      configId: string;
      templateData?: Record<string, string>;
      trackingId?: string;
      phone?: string;
      orderId?: string;
    };
    const raw = await env.PRODUCTS.get(znsKeyOf(body.configId));
    if (!raw) return jsonError("Config not found", 404);
    const config = JSON.parse(raw) as ZnsConfigItem;
    if (!config.enabled) return jsonError("Config is disabled", 400);

    const payload: Record<string, unknown> = {
      phone: body.phone ?? config.phone,
      template_id: config.templateId,
      template_data: body.templateData ?? config.templateData ?? {},
    };
    const trackingId = body.trackingId ?? config.trackingId;
    if (trackingId) payload.tracking_id = trackingId;

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
      zaloData &&
      typeof zaloData === "object" &&
      "error" in zaloData
        ? (zaloData as { error?: unknown }).error
        : undefined;
    const isSuccess =
      zaloRes.ok && (zaloError === undefined || zaloError === null || zaloError === 0);

    const log: ZnsHistoryItem = {
      id: makeId(),
      orderId: body.orderId ?? "",
      phone: String(payload.phone ?? ""),
      templateId: config.templateId,
      templateName: config.name,
      sentAt: Date.now(),
      status: isSuccess ? "success" : "failed",
      error: isSuccess ? "" : typeof zaloData === "string" ? zaloData : JSON.stringify(zaloData ?? {}),
      request: payload,
      response: zaloData,
    };
    await env.PRODUCTS.put(znsLogKeyOf(log.id), JSON.stringify(log));

    return Response.json({ status: zaloRes.status, ok: isSuccess, data: zaloData });
  }

  return jsonError("Method not allowed", 405);
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

async function listProducts(env: Env): Promise<Product[]> {
  const list = await env.PRODUCTS.list({ prefix: KEY_PREFIX });
  const products = await Promise.all(
    list.keys.map(async ({ name }) => {
      const raw = await env.PRODUCTS.get(name);
      return raw ? (JSON.parse(raw) as Product) : null;
    })
  );
  return products
    .filter((p): p is Product => p !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function makeId(): string {
  return crypto.randomUUID();
}

function parseBody(raw: unknown): {
  name?: unknown;
  price?: unknown;
  description?: unknown;
  quantity?: unknown;
} {
  if (raw && typeof raw === "object") {
    const { name, price, description, quantity } = raw as Record<string, unknown>;
    return { name, price, description, quantity };
  }
  return {};
}

function parseNumber(value: unknown, min: number): number | null {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || Number.isNaN(num) || num < min) return null;
  return num;
}

function validateProduct(
  fields: ReturnType<typeof parseBody>
): { name: string; price: number; description: string; quantity: number } | { error: string } {
  if (fields.name !== undefined && (typeof fields.name !== "string" || fields.name.trim() === "")) {
    return { error: "Name cannot be empty" };
  }
  if (fields.price !== undefined && parseNumber(fields.price, 0) === null) {
    return { error: "Price must be a non-negative number" };
  }
  if (fields.quantity !== undefined && parseNumber(fields.quantity, 0) === null) {
    return { error: "Quantity must be a non-negative number" };
  }
  if (fields.description !== undefined && typeof fields.description !== "string") {
    return { error: "Description must be a string" };
  }
  return {
    name: (fields.name as string) ?? "",
    price: parseNumber(fields.price, 0) ?? 0,
    description: (fields.description as string) ?? "",
    quantity: parseNumber(fields.quantity, 0) ?? 0,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return new Response(null, { status: 404 });
    }

    const segments = url.pathname.slice("/api/".length).split("/").filter(Boolean);
    const [resource, id] = segments;
    const method = request.method;

    if (resource === "zns") {
      return handleZns(request, env, segments, method);
    }

    if (resource !== "products") {
      return jsonError("Unknown resource", 404);
    }

    const now = Date.now();

    try {
      if (method === "GET" && !id) {
        return Response.json(await listProducts(env));
      }

      if (method === "GET" && id) {
        const raw = await env.PRODUCTS.get(keyOf(id));
        if (!raw) return jsonError("Product not found", 404);
        return Response.json(JSON.parse(raw) as Product);
      }

      if (method === "POST" && !id) {
        const fields = parseBody(await request.json());
        const valid = validateProduct(fields);
        if ("error" in valid) return jsonError(valid.error, 400);
        if (valid.name === "") return jsonError("Name is required", 400);

        const product: Product = {
          id: makeId(),
          ...valid,
          createdAt: now,
          updatedAt: now,
        };
        await env.PRODUCTS.put(keyOf(product.id), JSON.stringify(product));
        return Response.json(product, { status: 201 });
      }

      if ((method === "PUT" || method === "PATCH") && id) {
        const raw = await env.PRODUCTS.get(keyOf(id));
        if (!raw) return jsonError("Product not found", 404);

        const existing = JSON.parse(raw) as Product;
        const fields = parseBody(await request.json());
        const valid = validateProduct(fields);
        if ("error" in valid) return jsonError(valid.error, 400);

        const product: Product = {
          ...existing,
          name: fields.name !== undefined ? valid.name : existing.name,
          price: fields.price !== undefined ? valid.price : existing.price,
          description:
            fields.description !== undefined ? valid.description : existing.description,
          quantity: fields.quantity !== undefined ? valid.quantity : existing.quantity,
          updatedAt: now,
        };
        await env.PRODUCTS.put(keyOf(product.id), JSON.stringify(product));
        return Response.json(product);
      }

      if (method === "DELETE" && id) {
        await env.PRODUCTS.delete(keyOf(id));
        return Response.json({ ok: true });
      }

      if (method === "DELETE" && !id) {
        const list = await env.PRODUCTS.list({ prefix: KEY_PREFIX });
        await Promise.all(list.keys.map(({ name }) => env.PRODUCTS.delete(name)));
        return Response.json({ ok: true });
      }
    } catch (err) {
      console.error(err);
      return jsonError("Internal error", 500);
    }

    return jsonError("Method not allowed", 405);
  },
} satisfies ExportedHandler<Env>;