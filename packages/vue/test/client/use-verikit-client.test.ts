import assert from "node:assert/strict";
import test from "node:test";
import type { VerikitClient } from "@verikit/client";
import { QueryClient, useQueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { useVerikitClient, VerikitProvider } from "../../src/client/index.js";

const fakeClient = { resource: () => ({}) } as unknown as VerikitClient;

const Consumer = defineComponent({
  setup() {
    const client = useVerikitClient();
    return () => h("span", typeof client.resource);
  },
});

test("useVerikitClient throws when called outside a VerikitProvider", () => {
  assert.throws(
    () => mount(Consumer),
    /useVerikitClient must be used within a VerikitProvider/,
  );
});

test("VerikitProvider supplies the client to descendants via useVerikitClient", () => {
  const wrapper = mount(VerikitProvider, {
    props: { client: fakeClient },
    slots: { default: () => h(Consumer) },
  });

  assert.equal(wrapper.html(), "<span>function</span>");
});

test("a nested VerikitProvider overrides the client for its subtree", () => {
  const otherClient = {
    resource: () => ({ overridden: true }),
  } as unknown as VerikitClient;
  let seen: VerikitClient | undefined;

  const Capture = defineComponent({
    setup() {
      seen = useVerikitClient();
      return () => null;
    },
  });

  mount(VerikitProvider, {
    props: { client: fakeClient },
    slots: {
      default: () =>
        h(VerikitProvider, { client: otherClient }, () => h(Capture)),
    },
  });

  assert.equal(seen, otherClient);
});

test("VerikitProvider supplies its own QueryClient when none is given", () => {
  let seen: QueryClient | undefined;

  const Capture = defineComponent({
    setup() {
      seen = useQueryClient();
      return () => null;
    },
  });

  mount(VerikitProvider, {
    props: { client: fakeClient },
    slots: { default: () => h(Capture) },
  });

  assert.ok(seen instanceof QueryClient);
});

test("VerikitProvider reuses an app-supplied QueryClient instead of creating its own", () => {
  const appQueryClient = new QueryClient();
  let seen: QueryClient | undefined;

  const Capture = defineComponent({
    setup() {
      seen = useQueryClient();
      return () => null;
    },
  });

  mount(VerikitProvider, {
    props: { client: fakeClient, queryClient: appQueryClient },
    slots: { default: () => h(Capture) },
  });

  assert.equal(seen, appQueryClient);
});
