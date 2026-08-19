import type { FieldSchema } from "@verikit/core";
import { ValidationError, VerikitError } from "@verikit/core";
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
 * Parses resource filters and range operators by field type.
 * Invalid, unknown, or non-filterable filter parameters are rejected so a
 * caller never receives a broader result set than it requested.
 */
export function parseFilters(
  url: URL,
  fields: Record<string, FieldSchema>,
): Record<string, ResourceFilter> {
  const filters: Record<string, ResourceFilter> = {};
  const pattern = /^filter\[([^\]]+)\](?:\[(eq|gte|gt|lte|lt)\])?$/;

  for (const [key, raw] of url.searchParams) {
    const match = pattern.exec(key);
    if (!match) {
      if (key.startsWith("filter[")) {
        throw new ValidationError("Invalid filters.", [
          { path: [key], message: "Filter parameter is invalid." },
        ]);
      }
      continue;
    }
    const [, name, rawOperator] = match;
    const operator = (rawOperator ?? "eq") as keyof ResourceFilter;
    const field = fields[name!];
    if (!field) {
      throw new ValidationError("Invalid filters.", [
        { path: ["filter", name!], message: "Unknown filter field." },
      ]);
    }
    if (!field.filterable) {
      throw new ValidationError("Invalid filters.", [
        { path: ["filter", name!], message: "Field is not filterable." },
      ]);
    }
    const value = parseFilterValue(raw, field, operator);
    if (value === undefined) {
      throw new ValidationError("Invalid filters.", [
        {
          path: ["filter", name!, operator],
          message: "Filter value is invalid.",
        },
      ]);
    }
    const filter = (filters[name!] ??= {});
    filter[operator] = value as never;
  }

  return filters;
}

function parseFilterValue(
  raw: string,
  field: FieldSchema,
  operator: keyof ResourceFilter,
): string | number | boolean | null | undefined {
  // Allow null only for equality; range comparisons require non-null values.
  if (raw === "null") return operator === "eq" ? null : undefined;
  if (field.fieldType === "boolean") {
    return raw === "true" ? true : raw === "false" ? false : undefined;
  }
  if (field.fieldType === "number") {
    if (raw.trim() === "") return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  }
  return raw;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads a request body up to the configured byte limit.
 * Streamed bytes are authoritative regardless of `Content-Length`.
 */
export async function readRequestBytes(
  request: Request,
  maxBodyBytes: number | false,
): Promise<
  { ok: true; value: Uint8Array } | { ok: false; reason: "too-large" }
> {
  if (maxBodyBytes === false) {
    return { ok: true, value: new Uint8Array(await request.arrayBuffer()) };
  }

  const contentLength = request.headers.get("content-length");

  if (contentLength !== null) {
    const declaredLength = Number(contentLength);

    if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
      return { ok: false, reason: "too-large" };
    }
  }

  if (!request.body) {
    return { ok: true, value: new Uint8Array() };
  }

  const reader = request.body.getReader();
  let bytes = 0;
  const chunks: Uint8Array[] = [];

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

    chunks.push(value);
  }

  const value = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    value.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, value };
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
  const body = await readRequestBytes(
    request,
    options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
  );

  if (!body.ok) {
    return body;
  }

  const text = new TextDecoder().decode(body.value);

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

/**
 * Parses a JSON object body and throws the appropriate `VerikitError` on failure.
 */
export async function requireJsonObjectBody(
  request: Request,
  options: { maxBodyBytes?: number | false } = {},
): Promise<Record<string, unknown>> {
  const body = await parseJsonObjectBody(request, options);

  if (body.ok) {
    return body.value;
  }

  throw body.reason === "too-large"
    ? new VerikitError("Payload too large.", "PAYLOAD_TOO_LARGE", 413)
    : new ValidationError("Invalid JSON body.");
}
