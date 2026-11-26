import { QueryClient } from "@tanstack/react-query";
import { createClient } from "@verikit/client";
import { defineResource, text, textarea } from "@verikit/core";
import { VerikitProvider } from "@verikit/react";
import { createServer, type ResourceAdapter } from "@verikit/server";
import { createInMemoryAdapter } from "@verikit/server/testing";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

export const post = defineResource("post", {
  fields: {
    title: text().label("Title").required().searchable(),
    body: textarea().label("Body"),
  },
});

export const category = defineResource("category", {
  fields: { name: text().label("Name").required() },
});

export interface PostRecord extends Record<string, unknown> {
  id: string;
  title: string;
  body?: string;
}

/** Lets a test hold an adapter call open until it calls `release()`. */
export function gate(): { wait: Promise<void>; release: () => void } {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { wait, release };
}

/**
 * Mounts UI against a real `@verikit/server` handler backed by the in-memory
 * adapter, called in-process through the client's `fetch` option.
 */
export function setup(
  initial: PostRecord[] = [],
  wrap: (
    adapter: ResourceAdapter<PostRecord>,
  ) => ResourceAdapter<PostRecord> = (adapter) => adapter,
) {
  const posts = createInMemoryAdapter<PostRecord>(initial, {
    searchableFields: ["title"],
  });
  const categories = createInMemoryAdapter<{ id: string; name: string }>([]);
  const server = createServer({
    basePath: "/api",
    resources: [
      { resource: post, adapter: wrap(posts), permissions: "open" },
      { resource: category, adapter: categories, permissions: "open" },
    ],
  });
  const client = createClient({
    baseUrl: "http://localhost/api",
    fetch: (input, init) => server(new Request(input, init)),
  });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  return {
    records: posts.records,
    render(node: ReactElement) {
      act(() => {
        root.render(
          <VerikitProvider client={client} queryClient={queryClient}>
            {node}
          </VerikitProvider>,
        );
      });
    },
    cleanup() {
      act(() => root.unmount());
      container.remove();
      queryClient.clear();
      document.body.innerHTML = "";
      window.history.replaceState(null, "", "/");
    },
  };
}
