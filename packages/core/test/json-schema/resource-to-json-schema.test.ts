import assert from "node:assert/strict";
import test from "node:test";
import { resourceToJsonSchema } from "../../src/json-schema/resource-to-json-schema.js";
import { boolean, number, text } from "../../src/fields/index.js";
import { belongsTo, hasMany } from "../../src/relationships/index.js";
import { defineResource } from "../../src/resource/index.js";

function defineProduct() {
  return defineResource("products", {
    fields: {
      name: text().required().searchable(),
      price: number().required().sortable(),
      active: boolean().default(true),
    },
  });
}

test("resourceToJsonSchema accepts a Resource and a ResourceSchema identically", () => {
  const resource = defineProduct();

  const fromResource = resourceToJsonSchema(resource, { operation: "create" });
  const fromSchema = resourceToJsonSchema(resource.toSchema(), {
    operation: "create",
  });

  assert.deepEqual(fromResource, fromSchema);
});

test("output carries $schema and title", () => {
  const schema = resourceToJsonSchema(defineProduct(), { operation: "create" });

  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.title, "products");
});

test("the Product example matches create/update/response shapes from the spec", () => {
  const product = defineProduct();

  const create = resourceToJsonSchema(product, { operation: "create" });
  assert.deepEqual(create.properties.name, { type: "string" });
  assert.deepEqual(create.properties.price, { type: "number" });
  assert.deepEqual(create.properties.active, {
    type: "boolean",
    default: true,
  });
  assert.deepEqual(create.required, ["name", "price"]);

  const update = resourceToJsonSchema(product, { operation: "update" });
  assert.equal(update.required, undefined);
  assert.deepEqual(Object.keys(update.properties), ["name", "price", "active"]);

  const response = resourceToJsonSchema(product, { operation: "response" });
  assert.deepEqual(response.required, ["name", "price", "active"]);
});

test("a belongsTo relationship appears as an optional string id reference on every surface", () => {
  const author = defineResource("author", { fields: { name: text() } });
  const post = defineResource("post", {
    fields: { title: text().required() },
    relationships: { author: belongsTo(() => author) },
  });

  for (const operation of ["create", "update", "response"] as const) {
    const schema = resourceToJsonSchema(post, { operation });
    assert.deepEqual(schema.properties.author, {
      type: "string",
      description: 'Id reference to the related "author" resource.',
    });
    assert.equal(
      schema.required?.includes("author") ?? false,
      false,
      `author must never be required for operation "${operation}"`,
    );
  }
});

test("a hasMany relationship is omitted from create/update and present as an array in response", () => {
  const comment = defineResource("comment", { fields: { body: text() } });
  const post = defineResource("post", {
    fields: { title: text().required() },
    relationships: { comments: hasMany(() => comment) },
  });

  assert.equal(
    "comments" in
      resourceToJsonSchema(post, { operation: "create" }).properties,
    false,
  );
  assert.equal(
    "comments" in
      resourceToJsonSchema(post, { operation: "update" }).properties,
    false,
  );
  assert.deepEqual(
    resourceToJsonSchema(post, { operation: "response" }).properties.comments,
    {
      type: "array",
      items: { type: "string" },
      description:
        'Array of id references to related "comment" resources. Not populated by default; requires an explicit include mechanism.',
    },
  );
});
