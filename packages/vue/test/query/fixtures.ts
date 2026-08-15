import type {
  ActionOptions,
  ActionResult,
  ListParams,
  ListResponse,
  RequestOptions,
  ResourceClient,
  VerikitClient,
} from "@verikit/client";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, type Component } from "vue";
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

export interface FakeClientFailures {
  list?: boolean | Error;
  create?: boolean | Error;
  update?: boolean | Error;
  delete?: boolean | Error;
}

type FakeMethod =
  "list" | "find" | "create" | "update" | "delete" | "upload" | "action";

/**
 * Resolves a failure flag to the error a fake call should throw once
 * (`true` for a generic message, or a specific `Error`), or `undefined`.
 */
function consumeFailure(
  flag: boolean | Error | undefined,
  defaultMessage: string,
): Error | undefined {
  if (!flag) {
    return undefined;
  }

  return flag instanceof Error ? flag : new Error(defaultMessage);
}

/**
 * A hand-rolled fake `VerikitClient` (single resource, call-counting), mirroring
 * `@verikit/client`'s own fake-fetch test pattern for fast, deterministic tests.
 */
export function createFakeClient(initial: readonly FakeRecord[] = []): {
  client: VerikitClient;
  calls: FakeResourceCalls;
  records: FakeRecord[];
  failNext: FakeClientFailures;
  block: (method: FakeMethod) => () => void;
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

      const listFailure = consumeFailure(
        failNext.list,
        "Simulated list failure.",
      );
      failNext.list = false;

      if (listFailure) {
        throw listFailure;
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

    async relationship<TTarget = Record<string, unknown>>(
      _name: string,
      params?: ListParams,
      options?: RequestOptions,
    ): Promise<ListResponse<TTarget>> {
      return resourceClient.list(params, options) as Promise<
        ListResponse<TTarget>
      >;
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

      const createFailure = consumeFailure(
        failNext.create,
        "Simulated create failure.",
      );
      failNext.create = false;

      if (createFailure) {
        throw createFailure;
      }

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

      const updateFailure = consumeFailure(
        failNext.update,
        "Simulated update failure.",
      );
      failNext.update = false;

      if (updateFailure) {
        throw updateFailure;
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

      const deleteFailure = consumeFailure(
        failNext.delete,
        "Simulated delete failure.",
      );
      failNext.delete = false;

      if (deleteFailure) {
        throw deleteFailure;
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
  /** Mounts `component` under `VerikitProvider` + this harness's `QueryClient`. */
  mountWithProvider: <T extends Component>(
    component: T,
    props?: Record<string, unknown>,
  ) => VueWrapper;
  cleanup: () => void;
}

/** Sets up a fresh, no-retry `QueryClient` wired to `client` via `VerikitProvider`. */
export function setupHarness(client: VerikitClient): TestHarness {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const wrappers: VueWrapper[] = [];

  return {
    queryClient,
    mountWithProvider: (component, props) => {
      const wrapper = mount(
        defineComponent({
          setup() {
            return () =>
              h(VerikitProvider, { client, queryClient }, () =>
                h(component, props),
              );
          },
        }),
      );
      wrappers.push(wrapper);
      return wrapper;
    },
    cleanup: () => {
      for (const wrapper of wrappers) {
        wrapper.unmount();
      }
      queryClient.clear();
    },
  };
}

/** Polls `predicate`, flushing Vue's microtask queue between attempts, until true or `timeout`. */
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

    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
