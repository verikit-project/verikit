import assert from "node:assert/strict";
import test from "node:test";
import type { ActionResult, VerikitClient } from "@verikit/client";
import { defineResource, text } from "@verikit/core";
import { action, type InferClientResource } from "@verikit/runtime";

// A client-safe declaration is the single source for the client's action types.
const publish = action("publish")
  .form({ note: text().required() })
  .returns<{ publishedAt: string }>();
const archive = action("archive").confirmation("Archive?");

const posts = defineResource("posts", {
  fields: { title: text().required() },
  actions: [publish, archive],
});

type Api = {
  posts: InferClientResource<typeof posts> & { record: { id: string } };
};

function checkInferredClient(client: VerikitClient<Api>) {
  const resource = client.resource("posts");

  const published: Promise<ActionResult<{ publishedAt: string }>> =
    resource.action("publish", { note: "Ship it" });
  void published;
  void resource.action("archive", undefined, {
    recordId: "1",
    confirmed: true,
  });
  void resource.list({ sort: { field: "title" } });

  // @ts-expect-error action names come from the resource's declarations.
  void resource.action("delete");

  // @ts-expect-error action input comes from the declared form.
  void resource.action("publish", { note: 1 });

  // @ts-expect-error required form fields stay required.
  void resource.action("publish", {});
}

test("InferClientResource plugs a resource's declared actions into VerikitClient", () => {
  // The compile-time checks above are the real assertions.
  assert.equal(typeof checkInferredClient, "function");
  assert.deepEqual(
    posts.actions.map(({ name }) => name),
    ["publish", "archive"],
  );
});
