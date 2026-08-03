import assert from "node:assert/strict";
import test from "node:test";
import type { VerikitClient } from "@verikit/client";
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
