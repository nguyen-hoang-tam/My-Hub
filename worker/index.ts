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
  partnerId: string;
  type: string;
  category: string;
  name: string;
  zaloTemplateId: string;
  zaloTemplate: string;
  variables: string[];
  sampleMessage: string;
  createdAt: number;
  updatedAt: number;
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

function keyOf(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

function znsKeyOf(id: string): string {
  return `${ZNS_PREFIX}${id}`;
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
  const { partnerId, type, category, name, zaloTemplateId, zaloTemplate, variables, sampleMessage } = body;
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
    },
  };
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

    if (method === "DELETE" && id) {
      await env.PRODUCTS.delete(znsKeyOf(id));
      return Response.json({ ok: true });
    }
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