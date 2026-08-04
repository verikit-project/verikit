import { VerikitClientError } from "./errors.js";
import type {
  HeadersSource,
  ListParams,
  ValidationIssueLike,
} from "./types.js";

/**
 * Serializes `ListParams` the same way `parseListParams` on the server reads them back.
 */
export function buildListQuery(params: ListParams): URLSearchParams {
  const query = new URLSearchParams();

  if (params.page !== undefined) {
    query.set("page", String(params.page));
  }

  if (params.pageSize !== undefined) {
    query.set("pageSize", String(params.pageSize));
  }

  if (params.search !== undefined) {
    query.set("search", params.search);
  }

  if (params.sort) {
    query.set("sort", params.sort.field);
    query.set("order", params.sort.direction ?? "asc");
  }

  return query;
}

function buildUrl(
  baseUrl: string,
  segments: readonly string[],
  query?: URLSearchParams,
): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const path = segments.map(encodeURIComponent).join("/");
  const url = path.length > 0 ? `${trimmedBase}/${path}` : trimmedBase;
  const queryString = query?.toString();

  return queryString ? `${url}?${queryString}` : url;
}

async function resolveHeaders(
  source: HeadersSource | undefined,
  hasBody: boolean,
): Promise<Headers> {
  const headers = new Headers();

  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }

  if (!source) {
    return headers;
  }

  const resolved = typeof source === "function" ? await source() : source;
  new Headers(resolved).forEach((value, key) => headers.set(key, value));

  return headers;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();

  if (text.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function toClientError(
  response: Response,
  parsed: unknown,
): VerikitClientError {
  const errorBody = (parsed as { error?: Record<string, unknown> } | undefined)
    ?.error;

  if (!errorBody || typeof errorBody.message !== "string") {
    return new VerikitClientError(
      response.status,
      response.statusText || "Request failed",
    );
  }

  const { message, issues, ...extra } = errorBody;

  return new VerikitClientError(response.status, message, {
    issues: issues as ValidationIssueLike[] | undefined,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  });
}

export interface SendRequestParams {
  fetchImpl: typeof fetch;
  baseUrl: string;
  headers?: HeadersSource;
  method: string;
  segments: readonly string[];
  query?: URLSearchParams;
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Builds the URL, resolves headers, serializes the body, sends the request, and either returns the parsed JSON body (`undefined` for a 204) or throws a `VerikitClientError` built from the server's error envelope.
 */
export async function sendRequest(params: SendRequestParams): Promise<unknown> {
  const hasBody = params.body !== undefined;
  const headers = await resolveHeaders(params.headers, hasBody);

  const response = await params.fetchImpl(
    buildUrl(params.baseUrl, params.segments, params.query),
    {
      method: params.method,
      headers,
      body: hasBody ? JSON.stringify(params.body) : undefined,
      signal: params.signal,
    },
  );

  const parsed = await parseResponseBody(response);

  if (!response.ok) {
    throw toClientError(response, parsed);
  }

  return parsed;
}
