import { buildListQuery, sendRequest } from "./request.js";
import type {
  ActionOptions,
  ActionResult,
  HeadersSource,
  ListParams,
  ListResponse,
  RequestOptions,
  ResourceClient,
} from "./types.js";

interface ResourceClientDeps {
  fetchImpl: typeof fetch;
  baseUrl: string;
  headers?: HeadersSource;
  name: string;
}

interface RecordEnvelope<T> {
  data: T;
  message?: string;
}

interface ListEnvelope<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
}

/**
 * Implements the seven routes `@verikit/server`'s `createServer()` exposes per resource.
 */
export function createResourceClient<TRecord = Record<string, unknown>>(
  deps: ResourceClientDeps,
): ResourceClient<TRecord> {
  const { fetchImpl, baseUrl, headers, name } = deps;

  function run(
    method: string,
    segments: readonly string[],
    options: {
      query?: URLSearchParams;
      body?: unknown;
      signal?: AbortSignal;
    } = {},
  ): Promise<unknown> {
    return sendRequest({
      fetchImpl,
      baseUrl,
      headers,
      method,
      segments: [name, ...segments],
      query: options.query,
      body: options.body,
      signal: options.signal,
    });
  }

  async function list(
    endpoint: readonly string[],
    params: ListParams,
    options: RequestOptions,
  ): Promise<ListResponse<TRecord>> {
    const envelope = (await run("GET", endpoint, {
      query: buildListQuery(params),
      signal: options.signal,
    })) as ListEnvelope<TRecord>;

    return {
      records: envelope.data,
      total: envelope.meta.total,
      page: envelope.meta.page,
      pageSize: envelope.meta.pageSize,
    };
  }

  return {
    list: (params = {}, options = {}) => list([], params, options),
    search: (params = {}, options = {}) => list(["search"], params, options),

    async find(id, options = {}) {
      const envelope = (await run("GET", [id], {
        signal: options.signal,
      })) as RecordEnvelope<TRecord>;
      return envelope.data;
    },

    async create(input, options = {}) {
      const envelope = (await run("POST", [], {
        body: input,
        signal: options.signal,
      })) as RecordEnvelope<TRecord>;
      return envelope.data;
    },

    async update(id, input, options = {}) {
      const envelope = (await run("PATCH", [id], {
        body: input,
        signal: options.signal,
      })) as RecordEnvelope<TRecord>;
      return envelope.data;
    },

    async delete(id, options = {}) {
      await run("DELETE", [id], { signal: options.signal });
    },

    async action<TResult = unknown>(
      actionName: string,
      input?: Record<string, unknown>,
      options: ActionOptions = {},
    ): Promise<ActionResult<TResult>> {
      const body: Record<string, unknown> = {};

      if (input !== undefined) {
        body.input = input;
      }

      if (options.recordId !== undefined) {
        body.recordId = options.recordId;
      }

      if (options.confirmed !== undefined) {
        body.confirmed = options.confirmed;
      }

      const envelope = (await run("POST", ["actions", actionName], {
        body,
        signal: options.signal,
      })) as RecordEnvelope<TResult>;

      return { result: envelope.data, message: envelope.message };
    },
  };
}
