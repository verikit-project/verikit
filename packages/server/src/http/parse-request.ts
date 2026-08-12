import type { FieldSchema } from "@verikit/core";
import type { ResourceFilter, ResourceListParams } from "../adapter.js";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
export const DEFAULT_MAX_BODY_BYTES = 1_048_576;

function parsePositiveInt(
  raw: string | null,
  fallback: number,
  max?: number,
): number {
  if (raw === null) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);

  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }

  return max !== undefined ? Math.min(value, max) : value;
}

/**
 * Parses `page`/`pageSize`/`sort`/`order`/`search` (or `q`) query params into `ResourceListParams`. Shared by the list and search routes; the search route passes a smaller `defaultPageSize` suited to combobox-style lookups.
 */
export function parseListParams(
  url: URL,
  options: { defaultPageSize?: number } = {},
): ResourceListParams {
  const query = url.searchParams;
  const search = query.get("search") ?? query.get("q") ?? undefined;
  const sortField = query.get("sort");
  const order = query.get("order");

  return {
    page: parsePositiveInt(query.get("page"), 1),
    pageSize: parsePositiveInt(
      query.get("pageSize"),
      options.defaultPageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    ),
    ...(search !== undefined && { search }),
    ...(sortField && {
      sort: {
        field: sortField,
        direction: order === "desc" ? "desc" : "asc",
      },
    }),
  };
}

/**
 * Parses `filter[field]=value` and range variants such as
 * `filter[createdAt][gte]=2026-01-01`. Values are decoded according to their
 * declared field type and unknown/non-filterable fields are ignored by callers.
 */
export function parseFilters(
  url: URL,
  fields: Record<string, FieldSchema>,
): Record<string, ResourceFilter> {
  const filters: Record<string, ResourceFilter> = {};
  const pattern = /^filter\[([^\]]+)\](?:\[(eq|gte|gt|lte|lt)\])?$/;

  for (const [key, raw] of url.searchParams) {
    const match = pattern.exec(key);
    if (!match) continue;
    const [, name, operator = "eq"] = match;
    const field = fields[name!];
    if (!field?.filterable) continue;
    const value = parseFilterValue(raw, field);
    if (value === undefined) continue;
    const filter = (filters[name!] ??= {});
    filter[operator as keyof ResourceFilter] = value as never;
  }

  return filters;
}

function parseFilterValue(
  raw: string,
  field: FieldSchema,
): string | number | boolean | null | undefined {
  if (raw === "null") return null;
  if (field.fieldType === "boolean") {
    return raw === "true" ? true : raw === "false" ? false : undefined;
  }
  if (field.fieldType === "number") {
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  }
  return raw;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readRequestText(
  request: Request,
  maxBodyBytes: number | false,
): Promise<{ ok: true; text: string } | { ok: false; reason: "too-large" }> {
  if (maxBodyBytes === false) {
    return { ok: true, text: await request.text() };
  }

  const contentLength = request.headers.get("content-length");

  if (contentLength !== null) {
    const declaredLength = Number(contentLength);

    if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
      return { ok: false, reason: "too-large" };
    }
  }

  if (!request.body) {
    return { ok: true, text: "" };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    bytes += value.byteLength;

    if (bytes > maxBodyBytes) {
      await reader.cancel();
      return { ok: false, reason: "too-large" };
    }

    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();

  return { ok: true, text };
}

/**
 * Safely reads and parses a JSON object body. An empty body is treated as `{}`. Resolves `{ ok: false }` for invalid JSON or a non-object payload (arrays/primitives), so handlers can respond 400 without a try/catch.
 */
export async function parseJsonObjectBody(
  request: Request,
  options: { maxBodyBytes?: number | false } = {},
): Promise<
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; reason: "invalid-json" | "too-large" }
> {
  const body = await readRequestText(
    request,
    options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
  );

  if (!body.ok) {
    return body;
  }

  const { text } = body;

  if (text.trim().length === 0) {
    return { ok: true, value: {} };
  }

  try {
    const parsed: unknown = JSON.parse(text);
    return isPlainObject(parsed)
      ? { ok: true, value: parsed }
      : { ok: false, reason: "invalid-json" };
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
}
