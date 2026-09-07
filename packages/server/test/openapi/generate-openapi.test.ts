import assert from "node:assert/strict";
import test from "node:test";
import {
  belongsTo,
  definePermissions,
  defineResource,
  hasMany,
  image,
  number,
  text,
} from "@verikit/core";
import { action } from "@verikit/runtime";
import { generateOpenApiDocument } from "../../src/openapi/generate-openapi.js";
import { createServer } from "../../src/create-server.js";
import type { CreateServerOptions } from "../../src/create-server.js";
import { createInMemoryAdapter } from "../../src/testing/in-memory-adapter.js";

function buildOptions(withStorage: boolean): CreateServerOptions {
  const author = defineResource("author", { fields: { name: text() } });
  const comment = defineResource("comment", { fields: { body: text() } });
  const post = defineResource("post", {
    fields: {
      title: text().required().searchable().sortable(),
      price: number().filterable(),
      cover: image(),
    },
    relationships: {
      author: belongsTo(() => author),
      comments: hasMany(() => comment),
    },
  });

  const publish = action("publish").label("Publish").form({ note: text() });
  const refresh = action("refresh");

  const postPermissions = definePermissions()
    .can("create", true)
    .can("list", true)
    .can("read", true)
    .can("update", true)
    .can("delete", true)
    .field("title", { read: true, write: true })
    .field("price", { read: true, write: true })
    .field("cover", { read: true, write: true })
    .action("publish", true);

  return {
    basePath: "/api",
    resources: [
      {
        resource: author,
        adapter: createInMemoryAdapter([]),
        permissions: "open",
      },
      {
        resource: comment,
        adapter: createInMemoryAdapter([]),
        permissions: "open",
      },
      {
        resource: post,
        adapter: createInMemoryAdapter([]),
        actions: [publish, refresh],
        permissions: postPermissions,
      },
    ],
    ...(withStorage && {
      storage: {
        put: async () => ({
          url: "https://files.example/f",
          name: "f.png",
          type: "image/png",
          size: 1,
        }),
      },
    }),
  };
}

const info = { title: "Test API", version: "1.0.0" };

test("top-level document shape", () => {
  const document = generateOpenApiDocument(buildOptions(true), info);

  assert.equal(document.openapi, "3.1.0");
  assert.deepEqual(document.info, info);
  assert.deepEqual(document.servers, [{ url: "/api" }]);
});

test("omits servers when no base path is configured", () => {
  const options = buildOptions(true);
  options.basePath = undefined;

  assert.equal(generateOpenApiDocument(options, info).servers, undefined);
});

test("list operation documents page/pageSize/search/sort/order/filter", () => {
  const document = generateOpenApiDocument(buildOptions(true), info);
  const parameters = document.paths["/post"]!.get!.parameters!;
  const byName = Object.fromEntries(parameters.map((p) => [p.name, p]));

  assert.ok(byName.page);
  assert.ok(byName.pageSize);
  assert.ok(byName.search);
  assert.deepEqual(byName.sort!.schema, { type: "string", enum: ["title"] });
  assert.deepEqual(byName.order!.schema, {
    type: "string",
    enum: ["asc", "desc"],
  });
  assert.equal(byName.filter!.style, "deepObject");
  assert.deepEqual(
    (byName.filter!.schema as { properties: Record<string, unknown> })
      .properties,
    { price: { type: "number" } },
  );
});

test("create operation references the Create schema for its body and the response schema for 201", () => {
  const document = generateOpenApiDocument(buildOptions(true), info);
  const create = document.paths["/post"]!.post!;

  assert.deepEqual(create.requestBody!.content["application/json"]!.schema, {
    $ref: "#/components/schemas/postCreate",
  });
  const body201 = create.responses["201"]!.content!["application/json"]!
    .schema as { properties: { data: unknown } };
  assert.deepEqual(body201.properties.data, {
    $ref: "#/components/schemas/post",
  });
});

test("update operation has a required id path parameter and references the Update schema", () => {
  const document = generateOpenApiDocument(buildOptions(true), info);
  const update = document.paths["/post/{id}"]!.patch!;

  assert.deepEqual(update.parameters, [
    {
      name: "id",
      in: "path",
      required: true,
      description: "The record's id.",
      schema: { type: "string" },
    },
  ]);
  assert.deepEqual(update.requestBody!.content["application/json"]!.schema, {
    $ref: "#/components/schemas/postUpdate",
  });
});

test("delete operation returns a bodyless 204", () => {
  const document = generateOpenApiDocument(buildOptions(true), info);
  const del = document.paths["/post/{id}"]!.delete!;

  assert.deepEqual(del.responses["204"], {
    description: "The record was deleted.",
  });
});

test("components.schemas contains resource and error schemas", () => {
  const document = generateOpenApiDocument(buildOptions(true), info);
  const names = Object.keys(document.components.schemas);

  for (const expected of [
    "postCreate",
    "postUpdate",
    "post",
    "author",
    "comment",
    "postPublishInput",
    "Error",
    "ValidationError",
    "ForbiddenError",
    "NotFoundError",
    "ConflictError",
    "UnauthorizedError",
    "StoredFile",
  ]) {
    assert.ok(
      names.includes(expected),
      `expected components.schemas to include "${expected}"`,
    );
  }
});

test("action routes are concrete paths whose body wraps the form under input", () => {
  const document = generateOpenApiDocument(buildOptions(true), info);
  const actionPath = document.paths["/post/actions/publish"];

  assert.ok(actionPath?.post);
  const schema = actionPath.post.requestBody!.content["application/json"]!
    .schema as { properties: Record<string, unknown> };
  assert.deepEqual(schema.properties.input, {
    $ref: "#/components/schemas/postPublishInput",
  });
  assert.ok("confirmed" in schema.properties);
  assert.ok("recordId" in schema.properties);
});

test("actions without forms document an unconstrained input object", () => {
  const document = generateOpenApiDocument(buildOptions(true), info);
  const schema = document.paths["/post/actions/refresh"]!.post!.requestBody!
    .content["application/json"]!.schema as {
    properties: Record<string, unknown>;
  };

  assert.deepEqual(schema.properties.input, { type: "object" });
  assert.equal(document.components.schemas.postRefreshInput, undefined);
});

test("upload routes exist only when storage is configured", () => {
  const withStorage = generateOpenApiDocument(buildOptions(true), info);
  const withoutStorage = generateOpenApiDocument(buildOptions(false), info);

  assert.ok(withStorage.paths["/post/uploads/cover"]?.post);
  assert.equal(withoutStorage.paths["/post/uploads/cover"], undefined);

  const anyUploadPath = Object.keys(withoutStorage.paths).some((path) =>
    path.includes("/uploads/"),
  );
  assert.equal(anyUploadPath, false);
});

test("a belongsTo relationship gets a picker route; a hasMany relationship does not", () => {
  const document = generateOpenApiDocument(buildOptions(true), info);

  assert.ok(document.paths["/post/relationships/author"]?.get);
  assert.equal(document.paths["/post/relationships/comments"], undefined);
});

test("a picker for an unregistered relationship target has only generic query parameters", () => {
  const author = defineResource("author", { fields: { name: text() } });
  const post = defineResource("post", {
    fields: { title: text() },
    relationships: { author: belongsTo(() => author) },
  });
  const options: CreateServerOptions = {
    resources: [
      {
        resource: post,
        adapter: createInMemoryAdapter([]),
        permissions: "open",
      },
    ],
  };

  const parameters = generateOpenApiDocument(options, info).paths[
    "/post/relationships/author"
  ]!.get!.parameters!;

  assert.deepEqual(
    parameters.map((parameter) => parameter.name),
    ["page", "pageSize", "search"],
  );
});

test('permissions !== "open" document 403 only for non-record operations', () => {
  const document = generateOpenApiDocument(buildOptions(true), info);

  assert.ok(document.paths["/post"]!.get!.responses["403"]);
  assert.ok(document.paths["/post"]!.post!.responses["403"]);
  assert.equal(document.paths["/post/{id}"]!.get!.responses["403"], undefined);
  assert.equal(
    document.paths["/post/{id}"]!.patch!.responses["403"],
    undefined,
  );
  assert.equal(
    document.paths["/post/{id}"]!.delete!.responses["403"],
    undefined,
  );
  assert.equal(document.paths["/author"]!.get!.responses["403"], undefined);
  assert.equal(document.paths["/author"]!.post!.responses["403"], undefined);
});

test("find/update/delete document an explicit 404", () => {
  const document = generateOpenApiDocument(buildOptions(true), info);
  const item = document.paths["/post/{id}"]!;

  assert.ok(item.get!.responses["404"]);
  assert.ok(item.patch!.responses["404"]);
  assert.ok(item.delete!.responses["404"]);
});

test("every operation carries a default error response", () => {
  const document = generateOpenApiDocument(buildOptions(true), info);

  for (const pathItem of Object.values(document.paths)) {
    for (const operation of [
      pathItem.get,
      pathItem.post,
      pathItem.patch,
      pathItem.delete,
    ]) {
      if (!operation) {
        continue;
      }
      assert.deepEqual(operation.responses.default, {
        description: "Unexpected error.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      });
    }
  }
});

for (const redactTitle of [false, true]) {
  test(`generated response contract matches CRUD records with an implicit ID (redaction: ${redactTitle})`, async () => {
    const resource = defineResource("post", {
      fields: { title: text().required() },
    });
    const permissions = definePermissions()
      .can("create", true)
      .can("update", true)
      .can("read", true)
      .can("list", true)
      .field("title", { read: !redactTitle, write: true });
    const options: CreateServerOptions = {
      resources: [
        {
          resource,
          permissions,
          adapter: createInMemoryAdapter([{ id: "1", title: "Original" }]),
        },
      ],
    };
    const schema = generateOpenApiDocument(options, info).components.schemas
      .post!;
    assert.deepEqual(schema.properties, {
      title: { type: "string" },
      id: { type: "string" },
    });
    assert.deepEqual(schema.required, ["id"]);
    assert.equal(schema.additionalProperties, false);
    const server = createServer(options);
    for (const [method, path, input] of [
      ["GET", "/post/1", undefined],
      ["GET", "/post", undefined],
      ["POST", "/post", { title: "Created" }],
      ["PATCH", "/post/1", { title: "Updated" }],
    ] as const) {
      const response = await server(
        new Request(`https://example.com${path}`, {
          method,
          body: JSON.stringify(input),
        }),
      );
      assert.ok(response.ok);
      const { data } = await response.json();
      const records = Array.isArray(data) ? data : [data];
      for (const record of records) {
        assert.equal(typeof record.id, "string");
        assert.equal(Object.hasOwn(record, "title"), !redactTitle);
        for (const required of schema.required!)
          assert.ok(Object.hasOwn(record, required));
        for (const [name, value] of Object.entries(record)) {
          assert.ok(
            Object.hasOwn(schema.properties!, name),
            `Unexpected response field: ${name}`,
          );
          assert.equal(typeof value, schema.properties![name]!.type);
        }
      }
    }
  });
}

test("declared ID permissions may redact the ID from the generated response contract", async () => {
  const resource = defineResource("post", {
    fields: { id: text().readOnly(), title: text().required() },
  });
  const options: CreateServerOptions = {
    resources: [
      {
        resource,
        adapter: createInMemoryAdapter([{ id: "1", title: "Visible" }]),
        permissions: definePermissions()
          .can("read", true)
          .field("title", { read: true }),
      },
    ],
  };
  const schema = generateOpenApiDocument(options, info).components.schemas
    .post!;
  assert.equal(schema.required, undefined);
  assert.deepEqual(schema.properties!.id, { type: "string" });
  const response = await createServer(options)(
    new Request("https://example.com/post/1"),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { title: "Visible" } });
});

test("update and delete document conditional-write conflicts", () => {
  const document = generateOpenApiDocument(buildOptions(true), info);
  for (const operation of [
    document.paths["/post/{id}"]!.patch!,
    document.paths["/post/{id}"]!.delete!,
  ]) {
    assert.deepEqual(
      operation.responses["409"]!.content!["application/json"]!.schema,
      { $ref: "#/components/schemas/ConflictError" },
    );
  }
});
