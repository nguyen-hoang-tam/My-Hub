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

const ZNS_CONFIG_KEY = "zns_config";
const ZALO_ZNS_URL = "https://business.openapi.zalo.me/message/template";

function keyOf(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

async function handleZns(
  request: Request,
  env: Env,
  segments: string[],
  method: string
): Promise<Response> {
  const [, action] = segments;

  if (action === "config") {
    if (method === "GET") {
      const raw = await env.PRODUCTS.get(ZNS_CONFIG_KEY);
      return Response.json(raw ? JSON.parse(raw) : { accessToken: "", templateId: "", phone: "" });
    }

    if (method === "PUT") {
      const body = (await request.json()) as Record<string, unknown>;
      const { accessToken, templateId, phone } = body;
      if (typeof accessToken !== "string" || accessToken.trim() === "") {
        return jsonError("accessToken is required", 400);
      }
      if (typeof templateId !== "string" || templateId.trim() === "") {
        return jsonError("templateId is required", 400);
      }
      const config = {
        accessToken: accessToken.trim(),
        templateId: templateId.trim(),
        phone: typeof phone === "string" ? phone.trim() : "",
      };
      await env.PRODUCTS.put(ZNS_CONFIG_KEY, JSON.stringify(config));
      return Response.json(config);
    }
  }

  if (action === "send") {
    if (method === "POST") {
      const raw = await env.PRODUCTS.get(ZNS_CONFIG_KEY);
      if (!raw) return jsonError("ZNS config not found. Vui lòng lưu cấu hình trước.", 400);
      const config = JSON.parse(raw) as {
        accessToken: string;
        templateId: string;
        phone: string;
      };
      if (!config.accessToken || !config.templateId) {
        return jsonError("ZNS config is incomplete", 400);
      }

      const body = (await request.json()) as {
        templateData?: Record<string, string>;
        trackingId?: string;
      };

      const payload: Record<string, unknown> = {
        phone: config.phone,
        template_id: config.templateId,
        template_data: body.templateData ?? {},
      };
      if (body.trackingId) payload.tracking_id = body.trackingId;

      const zaloRes = await fetch(ZALO_ZNS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: config.accessToken,
        },
        body: JSON.stringify(payload),
      });
      const zaloData = await zaloRes.json().catch(() => null);
      return Response.json({ status: zaloRes.status, ok: zaloRes.ok, data: zaloData });
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
        await env.PRODUCTS.put(keyOf(id), JSON.stringify(product));
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