import type {
  ActionOptions,
  ActionResult,
  ListParams,
  ListResponse,
  RequestOptions,
  ResourceClient,
  VerikitClient,
} from "@verikit/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { VerikitProvider } from "../../src/client/index.js";

export interface FakeRecord extends Record<string, unknown> {
  id: string;
  title: string;
}

export interface FakeResourceCalls {
  list: number;
  find: number;
  create: number;
  update: number;
  delete: number;
  upload: number;
  action: number;
}

/**
 * A hand-rolled fake `VerikitClient` (single resource, call-counting) mirrors the fake-fetch/in-memory-adapter pattern `@verikit/client`'s own tests use, so these hook tests stay fast and deterministic without a real server or network path.
 */
export interface FakeClientFailures {
  list?: boolean;
  update?: boolean;
  delete?: boolean;
}

type FakeMethod =
  "list" | "find" | "create" | "update" | "delete" | "upload" | "action";

export function createFakeClient(initial: readonly FakeRecord[] = []): {
  client: VerikitClient;
  calls: FakeResourceCalls;
  records: FakeRecord[];
  /**
   * Set a flag to `true` to make the next matching call reject once, then reset itself.
   */
  failNext: FakeClientFailures;
  /**
   * Makes the next call to `method` wait until the returned function is invoked, so a test can observe cache state while a "network" call is still in flight (e.g. to prove an optimistic update landed before the server responded, or that a hook with no built-in optimism left the cache untouched while waiting).
   */
  block: (method: FakeMethod) => () => void;
  /** The `ListParams` most recently passed to `list`/`search`, for asserting what a caller actually requested. */
  lastListParams: ListParams | undefined;
} {
  const records: FakeRecord[] = initial.map((record) => ({ ...record }));
  const calls: FakeResourceCalls = {
    list: 0,
    find: 0,
    create: 0,
    update: 0,
    delete: 0,
    upload: 0,
    action: 0,
  };
  const failNext: FakeClientFailures = {};
  const gates = new Map<FakeMethod, Promise<void>>();
  const state: { lastListParams: ListParams | undefined } = {
    lastListParams: undefined,
  };

  function block(method: FakeMethod): () => void {
    let release = () => {};
    gates.set(
      method,
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    return () => {
      release();
      gates.delete(method);
    };
  }

  async function waitForGate(method: FakeMethod): Promise<void> {
    await gates.get(method);
  }

  const resourceClient: ResourceClient<FakeRecord> = {
    async list(
      params?: ListParams,
      _options?: RequestOptions,
    ): Promise<ListResponse<FakeRecord>> {
      calls.list += 1;
      state.lastListParams = params;
      await waitForGate("list");

      if (failNext.list) {
        failNext.list = false;
        throw new Error("Simulated list failure.");
      }

      return {
        records: [...records],
        total: records.length,
        page: 1,
        pageSize: 25,
      };
    },

    search(params, options) {
      return resourceClient.list(params, options);
    },

    async find(id, _options) {
      calls.find += 1;
      await waitForGate("find");
      const record = records.find((candidate) => candidate.id === id);

      if (!record) {
        throw new Error(`Not found: ${id}`);
      }

      return record;
    },

    async create(input, _options) {
      calls.create += 1;
      await waitForGate("create");
      const record = {
        id: crypto.randomUUID(),
        title: "",
        ...input,
      } as FakeRecord;
      records.push(record);
      return record;
    },

    async update(id, input, _options) {
      calls.update += 1;
      await waitForGate("update");

      if (failNext.update) {
        failNext.update = false;
        throw new Error("Simulated update failure.");
      }

      const index = records.findIndex((candidate) => candidate.id === id);

      if (index === -1) {
        throw new Error(`Not found: ${id}`);
      }

      records[index] = { ...records[index], ...input } as FakeRecord;
      return records[index] as FakeRecord;
    },

    async delete(id, _options) {
      calls.delete += 1;
      await waitForGate("delete");

      if (failNext.delete) {
        failNext.delete = false;
        throw new Error("Simulated delete failure.");
      }

      const index = records.findIndex((candidate) => candidate.id === id);

      if (index !== -1) {
        records.splice(index, 1);
      }
    },

    async upload(field, file, options) {
      calls.upload += 1;
      await waitForGate("upload");
      return {
        url: `blob:fake/${field}`,
        name: options?.filename ?? "upload.bin",
        type: file.type,
        size: file.size,
      };
    },

    async action<TResult = unknown>(
      actionName: string,
      input?: Record<string, unknown>,
      options?: ActionOptions,
    ): Promise<ActionResult<TResult>> {
      calls.action += 1;
      await waitForGate("action");
      return {
        result: { actionName, input, recordId: options?.recordId } as TResult,
        message: "done",
      };
    },
  };

  const client: VerikitClient = {
    resource<TRecord = Record<string, unknown>>(): ResourceClient<TRecord> {
      return resourceClient as unknown as ResourceClient<TRecord>;
    },
  };

  return {
    client,
    calls,
    records,
    failNext,
    block,
    get lastListParams() {
      return state.lastListParams;
    },
  };
}

export interface TestHarness {
  queryClient: QueryClient;
  /** The mounted container, for querying rendered DOM in interactive tests. */
  container: HTMLElement;
  render: (node: ReactElement) => Promise<void>;
  cleanup: () => void;
}

/**
 * Mounts `client` under `VerikitProvider` + a fresh, no-retry `QueryClientProvider`.
 */
export function setupHarness(client: VerikitClient): TestHarness {
  const queryClient = new QueryClient({
    defaultOptions: {
      // gcTime: 0 avoids a delayed-eviction timer outliving the test (and
      // then firing after installJsdom()'s globals are torn down).
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <VerikitProvider client={client}>{children}</VerikitProvider>
      </QueryClientProvider>
    );
  }

  return {
    queryClient,
    container,
    render: (node) =>
      act(async () => {
        root.render(<Providers>{node}</Providers>);
      }),
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      queryClient.clear();
      container.remove();
    },
  };
}

/**
 * Polls `predicate`, flushing React/microtask work between attempts, until it's true or `timeout` elapses.
 */
export async function waitFor(
  predicate: () => boolean,
  {
    timeout = 1000,
    interval = 5,
  }: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const start = Date.now();

  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error("waitFor: timed out");
    }

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, interval));
    });
  }
}
