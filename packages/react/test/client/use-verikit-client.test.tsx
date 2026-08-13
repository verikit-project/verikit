import assert from "node:assert/strict";
import test from "node:test";
import type { VerikitClient } from "@verikit/client";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { useVerikitClient, VerikitProvider } from "../../src/client/index.js";

const fakeClient = { resource: () => ({}) } as unknown as VerikitClient;

function Consumer() {
  const client = useVerikitClient();
  return <span>{typeof client.resource}</span>;
}

test("useVerikitClient throws when called outside a VerikitProvider", () => {
  assert.throws(
    () => renderToStaticMarkup(<Consumer />),
    /useVerikitClient must be used within a VerikitProvider/,
  );
});

test("VerikitProvider supplies the client to descendants via useVerikitClient", () => {
  const markup = renderToStaticMarkup(
    <VerikitProvider client={fakeClient}>
      <Consumer />
    </VerikitProvider>,
  );
  assert.equal(markup, "<span>function</span>");
});

test("a nested VerikitProvider overrides the client for its subtree", () => {
  const otherClient = {
    resource: () => ({ overridden: true }),
  } as unknown as VerikitClient;
  let seen: VerikitClient | undefined;

  function Capture() {
    seen = useVerikitClient();
    return null;
  }

  renderToStaticMarkup(
    <VerikitProvider client={fakeClient}>
      <VerikitProvider client={otherClient}>
        <Capture />
      </VerikitProvider>
    </VerikitProvider>,
  );

  assert.equal(seen, otherClient);
});

test("VerikitProvider supplies its own QueryClient when none is given", () => {
  let seen: QueryClient | undefined;

  function Capture() {
    seen = useQueryClient();
    return null;
  }

  renderToStaticMarkup(
    <VerikitProvider client={fakeClient}>
      <Capture />
    </VerikitProvider>,
  );

  assert.ok(seen instanceof QueryClient);
});

test("VerikitProvider reuses an app-supplied QueryClient instead of creating its own", () => {
  const appQueryClient = new QueryClient();
  let seen: QueryClient | undefined;

  function Capture() {
    seen = useQueryClient();
    return null;
  }

  renderToStaticMarkup(
    <VerikitProvider client={fakeClient} queryClient={appQueryClient}>
      <Capture />
    </VerikitProvider>,
  );

  assert.equal(seen, appQueryClient);
});
