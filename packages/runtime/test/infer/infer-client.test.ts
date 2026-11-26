import assert from "node:assert/strict";
import test from "node:test";
import { boolean, defineResource, text } from "@verikit/core";
import { action } from "../../src/actions/builders/index.js";
import type {
  InferClientActions,
  InferClientResource,
} from "../../src/infer/index.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

function assertType<T extends true>(): T | undefined {
  return undefined;
}

const publish = action("publish")
  .label("Publish")
  .form({ note: text().required(), notify: boolean() })
  .returns<{ publishedAt: string }>();
const archive = action("archive").confirmation("Archive?");

const posts = defineResource("posts", {
  fields: { title: text().required() },
  actions: [publish, archive],
});

test("InferClientActions maps declarations to input/result definitions keyed by name", () => {
  type Actions = InferClientActions<typeof posts>;

  assertType<Equal<keyof Actions, "publish" | "archive">>();
  assertType<Equal<Actions["publish"]["result"], { publishedAt: string }>>();
  assertType<
    Equal<
      NonNullable<Actions["publish"]["input"]>,
      { note: string; notify?: boolean | null | undefined }
    >
  >();
  assertType<Equal<Actions["archive"]["input"], undefined>>();
  assertType<Equal<Actions["archive"]["result"], unknown>>();

  assert.deepEqual(
    posts.actions.map(({ name }) => name),
    ["publish", "archive"],
  );
});

test("InferClientActions is empty for a resource without actions", () => {
  const tags = defineResource("tags", { fields: { name: text() } });

  assertType<Equal<keyof InferClientActions<typeof tags>, never>>();
  assert.deepEqual(tags.actions, []);
});

test("InferClientResource infers the record from fields alongside actions", () => {
  type Posts = InferClientResource<typeof posts>;

  assertType<Equal<Posts["record"]["title"], string>>();
  assertType<Equal<keyof Posts["actions"], "publish" | "archive">>();
});

test(".returns() is type-only and constrains .execute()", () => {
  const plain = action("publish");

  assert.equal(plain.returns<number>(), plain);

  const typed = action("count").returns<number>();
  typed.execute(() => 1);
  // @ts-expect-error the handler must return the declared result type.
  typed.execute(() => "one");
});
