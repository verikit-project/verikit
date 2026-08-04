import type { ResourceListParams } from "../adapter.js";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Safely reads and parses a JSON object body. An empty body is treated as `{}`. Resolves `{ ok: false }` for invalid JSON or a non-object payload (arrays/primitives), so handlers can respond 400 without a try/catch.
 */
export async function parseJsonObjectBody(
  request: Request,
): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false }> {
  const text = await request.text();

  if (text.trim().length === 0) {
    return { ok: true, value: {} };
  }

  try {
    const parsed: unknown = JSON.parse(text);
    return isPlainObject(parsed) ? { ok: true, value: parsed } : { ok: false };
  } catch {
    return { ok: false };
  }
}
