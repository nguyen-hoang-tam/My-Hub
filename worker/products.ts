import { jsonError, listJson, makeId } from "./storage.js";

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

function keyOf(id: string): string {
  return `${KEY_PREFIX}${id}`;
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

export async function handleProducts(
  request: Request,
  env: Env,
  segments: string[],
  method: string
): Promise<Response> {
  const [, id] = segments;
  const now = Date.now();

  try {
    if (method === "GET" && !id) {
      const products = await listJson<Product>(env.PRODUCTS, KEY_PREFIX);
      products.sort((a, b) => b.updatedAt - a.updatedAt);
      return Response.json(products);
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
}
