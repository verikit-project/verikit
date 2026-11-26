import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertUniqueFields, parseFieldSpec } from "../src/field-spec.js";
import {
  renderActionRegistry,
  renderResourceRegistry,
} from "../src/render-registry.js";
import { renderAction, renderResource } from "../src/render-resource.js";
import { renderSchema } from "../src/render-schema.js";
import { loaded } from "./helpers.js";

describe("parseFieldSpec", () => {
  it("parses names, types, arguments, and nullability", () => {
    assert.deepEqual(parseFieldSpec("published_at:DateTime?"), {
      name: "publishedAt",
      type: "datetime",
      nullable: true,
    });
    assert.deepEqual(parseFieldSpec("status:select: draft ,published,"), {
      name: "status",
      type: "select",
      nullable: false,
      options: ["draft", "published"],
    });
    assert.deepEqual(parseFieldSpec("author:belongsto:blog-user"), {
      name: "author",
      type: "belongsTo",
      nullable: false,
      target: "blogUser",
    });
  });

  it("explains invalid specs", () => {
    assert.throws(() => parseFieldSpec(""), /must start with a letter/);
    assert.throws(() => parseFieldSpec("id:text"), /reserved/);
    assert.throws(() => parseFieldSpec("title"), /unknown type ""/);
    assert.throws(
      () => parseFieldSpec("title:string"),
      /unknown type "string"/,
    );
    assert.throws(() => parseFieldSpec("status:select"), /list the options/);
    assert.throws(() => parseFieldSpec("author:belongsTo"), /name the target/);
    assert.throws(() => parseFieldSpec("title:text:x"), /takes no argument/);
  });
});

describe("assertUniqueFields", () => {
  it("rejects duplicates, including a belongsTo's foreign key", () => {
    assert.throws(
      () => assertUniqueFields(["a:text", "a:number"].map(parseFieldSpec)),
      /"a" is defined twice/,
    );
    assert.throws(
      () =>
        assertUniqueFields(
          ["author:belongsTo:user", "authorId:text"].map(parseFieldSpec),
        ),
      /"authorId" is defined twice/,
    );
  });
});

describe("renderResource", () => {
  it("renders every field type", () => {
    const source = renderResource(
      "post",
      [
        "title:text",
        "body:textarea?",
        "contact:email",
        "rating:number",
        "views:integer",
        "published:boolean",
        "archived:boolean?",
        "day:date",
        "at:datetime?",
        "status:select:draft,published",
        "author:belongsTo:user",
        "editor:belongsTo:user?",
        "parent:belongsTo:post?",
      ].map(parseFieldSpec),
      { user: { exportName: "user", file: "user.ts", displayField: "name" } },
    );

    assert.equal(
      source,
      `import { belongsTo, boolean, date, datetime, defineResource, email, number, select, text, textarea } from "@verikit/core";
import { user } from "./user.ts";

export const post = defineResource("post", {
  fields: {
    title: text().label("Title").required().searchable().sortable(),
    body: textarea().label("Body").nullable().searchable(),
    contact: email().label("Contact").required().searchable().sortable(),
    rating: number().label("Rating").required().sortable().filterable(),
    views: number().step(1).label("Views").required().sortable().filterable(),
    published: boolean().label("Published").default(false).filterable(),
    archived: boolean().label("Archived").nullable().filterable(),
    day: date().label("Day").required().sortable().filterable(),
    at: datetime().label("At").nullable().sortable().filterable(),
    status: select().options(["draft", "published"]).label("Status").required().filterable(),
    authorId: text().label("Author").required().formHidden().tableHidden(),
    editorId: text().label("Editor").nullable().formHidden().tableHidden(),
    parentId: text().label("Parent").nullable().formHidden().tableHidden(),
  },
  relationships: (field) => ({
    author: belongsTo(() => user).label("Author").displayField("name").via(field("authorId")),
    editor: belongsTo(() => user).label("Editor").displayField("name").via(field("editorId")),
    parent: belongsTo(() => post).label("Parent").displayField("title").via(field("parentId")),
  }),
});
`,
    );
  });

  it("renders a resource with no fields", () => {
    assert.match(renderResource("tag", []), /fields: \{\},\n\}\);/);
  });

  it("sorts imports from several target files", () => {
    const source = renderResource(
      "post",
      ["author:belongsTo:user", "tag:belongsTo:tag"].map(parseFieldSpec),
      {
        user: { exportName: "user", file: "user.ts" },
        tag: { exportName: "tag", file: "tag.ts" },
      },
    );
    assert.match(
      source,
      /import \{ tag \} from "\.\/tag\.ts";\nimport \{ user \} from "\.\/user\.ts";/,
    );
  });

  it("omits displayField when the target has no text field", () => {
    const source = renderResource("tag", [
      parseFieldSpec("parent:belongsTo:tag?"),
    ]);
    assert.match(
      source,
      /parent: belongsTo\(\(\) => tag\)\.label\("Parent"\)\.via\(field\("parentId"\)\),/,
    );
    assert.doesNotMatch(source, /^import \{ tag \}/m);
  });

  it("renders an action skeleton", () => {
    const source = renderAction("post", "publishNow");
    assert.match(source, /export const publishNow = action\("publishNow"\)/);
    assert.match(source, /\.label\("Publish now"\)/);
  });
});

describe("renderSchema", () => {
  const fields = {
    title: { fieldType: "text", required: true, unique: true },
    body: { fieldType: "textarea", nullable: true },
    note: { fieldType: "text" },
    rating: { fieldType: "number", nullable: true },
    views: { fieldType: "number", step: 1, required: true },
    done: { fieldType: "boolean", defaultValue: false },
    label: { fieldType: "text", nullable: true, defaultValue: "x" },
    day: { fieldType: "date", nullable: true },
    at: { fieldType: "datetime", nullable: true },
    cover: { fieldType: "image", nullable: true },
    files: { fieldType: "file", multiple: true, nullable: true },
    size: {
      fieldType: "select",
      nullable: true,
      options: [{ value: 1 }, { value: 2 }],
    },
    flag: { fieldType: "select", nullable: true, options: [{ value: true }] },
    ratio: {
      fieldType: "select",
      nullable: true,
      options: [{ value: 0.5 }, { value: 1 }],
    },
    empty: { fieldType: "select", nullable: true },
    kind: {
      fieldType: "select",
      nullable: true,
      options: [{ value: "a" }, { value: 1 }],
    },
    authorId: { fieldType: "text", required: true },
    ownerId: { fieldType: "text", nullable: true },
    tagId: { fieldType: "text", nullable: true },
  };
  const relationships = {
    author: {
      relationshipType: "belongsTo",
      resource: "user",
      foreignKey: "authorId",
    },
    owner: {
      relationshipType: "belongsTo",
      resource: "ghost",
      foreignKey: "ownerId",
    },
    tag: { relationshipType: "belongsTo", resource: "user", foreignKey: {} },
    comments: { relationshipType: "hasMany", resource: "comment" },
    tags: { relationshipType: "belongsToMany", resource: "tag" },
  };
  const resources = [
    loaded("post", fields, { relationships }),
    loaded("user", { email: { fieldType: "email", required: true } }),
  ];

  it("maps fields to SQLite columns and reports mismatches", () => {
    const { source, warnings } = renderSchema(resources, "sqlite");

    assert.match(source, /^\/\/ Generated by `verikit generate:schema`/);
    assert.match(
      source,
      /import \{ integer, real, sqliteTable, text \} from "drizzle-orm\/sqlite-core";/,
    );
    for (const line of [
      'export const posts = sqliteTable("posts", {',
      'title: text("title").notNull().unique(),',
      'body: text("body"),',
      'note: text("note"),',
      'rating: real("rating"),',
      'views: integer("views").notNull(),',
      'done: integer("done", { mode: "boolean" }).notNull().default(false),',
      'label: text("label").default("x"),',
      'day: text("day"),',
      'at: text("at"),',
      'cover: text("cover"),',
      'files: text("files", { mode: "json" }).$type<string[]>(),',
      'size: integer("size"),',
      'flag: integer("flag", { mode: "boolean" }),',
      'kind: text("kind"),',
      'ratio: real("ratio"),',
      'empty: text("empty"),',
      'authorId: text("author_id").notNull().references(() => users.id),',
      'ownerId: text("owner_id"),',
      'tagId: text("tag_id"),',
      'revision: integer("revision").notNull().default(0),',
      "  post: posts,\n  user: users,",
    ]) {
      assert.ok(source.includes(line), line);
    }
    assert.equal(warnings.length, 2);
    assert.ok(
      warnings.some((w) => /post\.note is optional but not nullable/.test(w)),
    );
    assert.ok(warnings.some((w) => /post\.tags is belongsToMany/.test(w)));
  });

  it("maps fields to Postgres columns", () => {
    const { source } = renderSchema(resources, "postgresql", {
      customSchema: "custom-schema.ts",
    });

    assert.match(
      source,
      /import \{ boolean, date, doublePrecision, integer, jsonb, pgTable, text, timestamp \} from "drizzle-orm\/pg-core";/,
    );
    assert.match(source, /export \* from "\.\/custom-schema\.ts";/);
    for (const line of [
      'export const posts = pgTable("posts", {',
      'rating: doublePrecision("rating"),',
      'views: integer("views").notNull(),',
      'done: boolean("done").notNull().default(false),',
      'day: date("day", { mode: "string" }),',
      'at: timestamp("at", { mode: "string", withTimezone: true }),',
      'files: jsonb("files").$type<string[]>(),',
    ]) {
      assert.ok(source.includes(line), line);
    }
  });

  it("refuses resources that set a table or collide", () => {
    assert.throws(
      () => renderSchema([loaded("post", {}, { hasTable: true })], "sqlite"),
      /sets `table`/,
    );
    assert.throws(
      () => renderSchema([loaded("table")], "sqlite"),
      /"tables", which the tables map already uses/,
    );
    assert.throws(
      () => renderSchema([loaded("person"), loaded("persons")], "sqlite"),
      /"persons", which resource "person" already uses/,
    );
  });
});

describe("registries", () => {
  it("groups resources by file", () => {
    const source = renderResourceRegistry([
      loaded("post", {}, { file: "blog.ts" }),
      loaded("tag", {}, { file: "blog.ts" }),
      loaded("user"),
    ]);

    assert.match(source, /import \{ post, tag \} from "\.\/blog\.ts";/);
    assert.match(source, /import \{ user \} from "\.\/user\.ts";/);
    assert.match(
      source,
      /export const resources = \[post, tag, user\] as const;/,
    );
  });

  it("renders an empty resource registry", () => {
    assert.match(
      renderResourceRegistry([]),
      /export const resources = \[\] as const;/,
    );
  });

  it("groups actions by resource", () => {
    const source = renderActionRegistry([
      {
        resource: "blogPost",
        exportName: "publish",
        file: "blog-post/publish.ts",
      },
      {
        resource: "blogPost",
        exportName: "archive",
        file: "blog-post/archive.ts",
      },
    ]);

    assert.match(
      source,
      /import \{ publish as blogPostPublish \} from "\.\/blog-post\/publish\.ts";/,
    );
    assert.match(source, /blogPost: \[blogPostPublish, blogPostArchive\],/);
    assert.match(renderActionRegistry([]), /> = \{\n\};/);
  });
});
