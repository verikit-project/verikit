import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { createServer } from "@verikit/server";
import { createInMemoryAdapter } from "@verikit/server/testing";
import { getTableColumns, getTableName } from "drizzle-orm";
import { loadResources } from "../src/load-resources.js";
import { findActions } from "../src/render-registry.js";
import {
  addOpenPermission,
  generate,
  makeAction,
  makeResource,
  readConfig,
} from "../src/project.js";
import { loaded, PERMISSIONS_FILE, project } from "./helpers.js";

function read(root: string, file: string): string {
  return readFileSync(path.join(root, file), "utf8");
}

async function importFrom(root: string, file: string) {
  return import(`${pathToFileURL(path.join(root, file)).href}?t=${Date.now()}`);
}

describe("readConfig", () => {
  it("uses conventional paths without a package.json", () => {
    const root = project();
    writeFileSync(path.join(root, "package.json"), "{}");
    const config = readConfig(path.join(root, "missing"));

    assert.equal(config.dialect, "sqlite");
    assert.equal(config.schemaFile, path.join(root, "missing", "db/schema.ts"));
    assert.equal(readConfig(root).resourcesDir, path.join(root, "resources"));
  });

  it("reads overrides and rejects unknown dialects", () => {
    const root = project({
      "package.json": JSON.stringify({
        verikit: { dialect: "postgresql", schema: "src/db.ts" },
      }),
    });
    assert.equal(readConfig(root).dialect, "postgresql");
    assert.equal(readConfig(root).schemaFile, path.join(root, "src/db.ts"));

    const bad = project({
      "package.json": JSON.stringify({ verikit: { dialect: "mysql" } }),
    });
    assert.throws(
      () => readConfig(bad),
      /must be "sqlite" or "postgresql", not "mysql"/,
    );
  });
});

describe("make:resource and generate:schema", () => {
  it("creates resources whose generated schema and registry load and agree", async () => {
    const root = project({ "server/permissions.ts": PERMISSIONS_FILE });
    const config = readConfig(root);

    const first = await makeResource(config, "User", ["name:text"]);
    assert.deepEqual(first.created, [
      "resources/user.ts",
      "resources/index.ts",
      "actions/index.ts",
      "db/schema.ts",
    ]);
    assert.deepEqual(first.updated, ["server/permissions.ts"]);
    assert.match(first.notes.join("\n"), /"user" is open to everyone/);
    assert.match(first.notes.join("\n"), /npm run db:generate/);

    const second = await makeResource(config, "blog-post", [
      "title:text",
      "body:textarea?",
      "author:belongsTo:user",
    ]);
    assert.deepEqual(second.created, ["resources/blog-post.ts"]);
    assert.deepEqual(second.warnings, []);
    assert.match(
      read(root, "server/permissions.ts"),
      / {2}blogPost: "open",\n {2}user: "open",/,
    );

    const { resources } = await importFrom(root, "resources/index.ts");
    assert.deepEqual(
      resources.map((resource: { name: string }) => resource.name),
      ["blogPost", "user"],
    );

    const { tables } = await importFrom(root, "db/schema.ts");
    assert.equal(getTableName(tables.blogPost), "blog_posts");
    assert.deepEqual(Object.keys(getTableColumns(tables.blogPost)), [
      "id",
      "title",
      "body",
      "authorId",
      "revision",
    ]);
    assert.equal(getTableColumns(tables.blogPost).body.notNull, false);

    const check = await generate(config, { check: true });
    assert.deepEqual(check.stale, []);
  });

  it("reports and repairs drift, ignoring formatting", async () => {
    const root = project();
    const config = readConfig(root);
    await makeResource(config, "post", ["title:text"]);

    writeFileSync(
      path.join(root, "db/schema.ts"),
      read(root, "db/schema.ts").replace(
        "tables = {\n  post: posts,\n}",
        "tables = { post: posts }",
      ),
    );
    assert.deepEqual((await generate(config, { check: true })).stale, []);

    writeFileSync(
      path.join(root, "resources/post.ts"),
      read(root, "resources/post.ts").replace("text()", "text().unique()"),
    );
    const check = await generate(config, { check: true });
    assert.deepEqual(check.stale, ["db/schema.ts"]);
    assert.match(
      read(root, "db/schema.ts"),
      /title: text\("title"\)\.notNull\(\),/,
    );

    const fixed = await generate(config);
    assert.deepEqual(fixed.updated, ["db/schema.ts"]);
    assert.match(read(root, "db/schema.ts"), /\.notNull\(\)\.unique\(\),/);
  });

  it("labels pickers with the target's first text or email field", async () => {
    const root = project();
    const config = readConfig(root);
    await makeResource(config, "counter", ["count:integer"]);
    await makeResource(config, "member", ["age:integer", "email:email"]);
    await makeResource(config, "entry", [
      "counter:belongsTo:counter",
      "member:belongsTo:member",
    ]);

    const source = read(root, "resources/entry.ts");
    assert.match(
      source,
      /belongsTo\(\(\) => counter\)\.label\("Counter"\)\.via/,
    );
    assert.match(
      source,
      /belongsTo\(\(\) => member\)\.label\("Member"\)\.displayField\("email"\)\.via/,
    );
    await importFrom(root, "resources/entry.ts");
  });

  it("re-exports db/custom-schema.ts when it exists", async () => {
    const root = project({
      "db/custom-schema.ts": "export const extra = 1;\n",
    });
    await generate(readConfig(root));
    assert.match(
      read(root, "db/schema.ts"),
      /export \* from "\.\/custom-schema\.ts";/,
    );
  });

  it("refuses bad names, missing targets, and existing files", async () => {
    const root = project();
    const config = readConfig(root);

    await assert.rejects(makeResource(config, "tables", []), /reserved/);
    await assert.rejects(
      makeResource(config, "post", ["author:belongsTo:user"]),
      /belongs to "user", which doesn't exist yet/,
    );

    const created = await makeResource(config, "post", [
      "parent:belongsTo:post?",
    ]);
    assert.match(created.notes[0], /Add "post" to the permissions/);
    await assert.rejects(
      makeResource(config, "post", []),
      /already exists. Pass --force/,
    );

    const forced = await makeResource(config, "post", [], { force: true });
    assert.deepEqual(forced.updated.slice(0, 1), ["resources/post.ts"]);
  });
});

describe("apps that install the verikit meta-package", () => {
  it("generate imports from verikit", async () => {
    const root = project({
      "package.json": JSON.stringify({
        type: "module",
        dependencies: { verikit: "^1.0.0" },
      }),
      // Stands in for the real meta-package, which re-exports these.
      "node_modules/verikit/package.json": JSON.stringify({
        name: "verikit",
        type: "module",
        exports: { ".": "./index.js", "./server": "./server.js" },
      }),
      "node_modules/verikit/index.js":
        'export * from "@verikit/core";\nexport * from "@verikit/runtime";\n',
      "node_modules/verikit/server.js": 'export * from "@verikit/server";\n',
    });
    const config = readConfig(root);

    await makeResource(config, "post", ["title:text"]);
    await makeAction(config, "post", "publish");

    assert.match(read(root, "resources/post.ts"), /from "verikit";/);
    assert.match(
      read(root, "resources/post.actions.ts"),
      /import \{ action \} from "verikit";/,
    );
    assert.match(read(root, "actions/index.ts"), /from "verikit\/server";/);

    const { handlers } = await importFrom(root, "actions/index.ts");
    assert.equal(handlers.post[0].name, "publish");
  });

  it("checks devDependencies too", () => {
    const root = project({
      "package.json": JSON.stringify({ devDependencies: { verikit: "*" } }),
    });
    assert.equal(readConfig(root).imports.core, "verikit");
    assert.equal(readConfig(project()).imports.core, "@verikit/core");
  });
});

describe("make:action", () => {
  it("declares the action on the resource and registers a handler the server accepts", async () => {
    const root = project();
    const config = readConfig(root);
    await makeResource(config, "blogPost", ["title:text"]);

    const report = await makeAction(config, "blog-post", "Publish now");
    assert.deepEqual(report.created, [
      "resources/blog-post.actions.ts",
      "actions/blog-post/publish-now.ts",
    ]);
    assert.deepEqual(report.updated, [
      "resources/blog-post.ts",
      "actions/index.ts",
    ]);
    assert.match(
      read(root, "resources/blog-post.ts"),
      /import \* as blogPostActions from "\.\/blog-post\.actions\.ts";[\s\S]*actions: Object\.values\(blogPostActions\),/,
    );
    assert.match(
      read(root, "actions/blog-post/publish-now.ts"),
      /from "\.\.\/\.\.\/resources\/blog-post\.actions\.ts";/,
    );

    const { blogPost } = await importFrom(root, "resources/blog-post.ts");
    assert.deepEqual(Object.keys(blogPost.toSchema().actions), ["publishNow"]);

    const { handlers } = await importFrom(root, "actions/index.ts");
    const api = createServer({
      resources: [
        {
          resource: blogPost,
          adapter: createInMemoryAdapter(),
          handlers: handlers.blogPost,
          permissions: "open",
        },
      ],
    });
    const response = await api(
      new Request("http://test/blogPost/actions/publishNow", {
        method: "POST",
        body: "{}",
      }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, { ok: true });
  });

  it("appends later actions without editing the resource again", async () => {
    const root = project();
    const config = readConfig(root);
    await makeResource(config, "post", ["title:text"]);
    await makeAction(config, "post", "publish");
    const resourceBefore = read(root, "resources/post.ts");

    const report = await makeAction(config, "post", "archive");
    assert.deepEqual(report.created, ["actions/post/archive.ts"]);
    assert.deepEqual(report.updated, [
      "resources/post.actions.ts",
      "actions/index.ts",
    ]);
    assert.equal(read(root, "resources/post.ts"), resourceBefore);
    assert.match(
      read(root, "actions/index.ts"),
      /post: \[postArchive, postPublish\]/,
    );

    await assert.rejects(
      makeAction(config, "post", "publish"),
      /"publish" is already declared in resources\/post\.actions\.ts/,
    );
    const forced = await makeAction(config, "post", "publish", { force: true });
    assert.deepEqual(forced.updated, ["actions/post/publish.ts"]);
    assert.equal(
      read(root, "resources/post.actions.ts").match(/export const publish\b/g)
        ?.length,
      1,
    );
  });

  it("rejects bad names and unknown resources", async () => {
    const root = project();
    const config = readConfig(root);
    await makeResource(config, "blogPost", ["title:text"]);

    await assert.rejects(makeAction(config, "blogPost", "delete"), /reserved/);
    await assert.rejects(
      makeAction(config, "comment", "x"),
      /No resource named "comment". Known resources: blogPost\./,
    );
    await assert.rejects(
      makeAction(readConfig(project()), "post", "x"),
      /Known resources: none\./,
    );
  });

  it("explains how to connect a resource it can't edit", async () => {
    const root = project({
      "resources/post.ts": `import { defineResource, text } from "@verikit/core";\nexport const article = defineResource("post", { fields: { title: text().required() } });\n`,
    });

    const report = await makeAction(readConfig(root), "article", "archive");
    assert.deepEqual(report.created, [
      "resources/post.actions.ts",
      "actions/post/archive.ts",
      "resources/index.ts",
      "actions/index.ts",
      "db/schema.ts",
    ]);
    assert.match(
      report.notes.join("\n"),
      /Couldn't connect resources\/post\.ts to its actions[\s\S]*actions: Object\.values\(postActions\),/,
    );
  });
});

describe("loadResources", () => {
  it("collects resource exports and skips everything else", async () => {
    const root = project({
      "resources/a.ts": `import { defineResource, text } from "@verikit/core";\nexport const b = defineResource("b", { fields: { x: text().nullable() } });\nexport const a = defineResource("a", { fields: {} });\nexport const notResource = { name: "x" };\nexport const nothing = null;\n`,
      "resources/types.d.ts": "export type X = 1;\n",
      "resources/index.ts": "throw new Error('registry should be skipped');\n",
    });

    const resources = await loadResources(path.join(root, "resources"));
    assert.deepEqual(
      resources.map((resource) => [resource.exportName, resource.file]),
      [
        ["a", "a.ts"],
        ["b", "a.ts"],
      ],
    );
    assert.deepEqual(await loadResources(path.join(root, "missing")), []);
  });

  it("explains files that fail to load and duplicate names", async () => {
    const broken = project({
      "resources/bad.ts": "throw new Error('boom');\n",
    });
    await assert.rejects(
      loadResources(path.join(broken, "resources")),
      /Couldn't load resources\/bad\.ts: boom/,
    );

    const define = (exportName: string, name: string) =>
      `import { defineResource } from "@verikit/core";\nexport const ${exportName} = defineResource("${name}", { fields: {} });\n`;
    const sameName = project({
      "resources/a.ts": define("a", "post"),
      "resources/b.ts": define("b", "post"),
    });
    await assert.rejects(
      loadResources(path.join(sameName, "resources")),
      /Two resources are named "post" \(a\.ts and b\.ts\)/,
    );

    const sameExport = project({
      "resources/a.ts": define("post", "a"),
      "resources/b.ts": define("post", "b"),
    });
    await assert.rejects(
      loadResources(path.join(sameExport, "resources")),
      /Two files export "post"/,
    );
  });

  it("marks resources that set a table", async () => {
    const root = project({
      "resources/a.ts": `import { defineResource } from "@verikit/core";\nexport const a = defineResource("a", { table: {}, fields: {} });\n`,
    });
    const [resource] = await loadResources(path.join(root, "resources"));
    assert.equal(resource.hasTable, true);
  });
});

describe("findActions", () => {
  it("validates folders and file names", () => {
    const resources = [loaded("blogPost")];
    const root = project({
      "actions/index.ts": "",
      "actions/blog-post/publish.ts": "",
    });
    assert.deepEqual(findActions(path.join(root, "actions"), resources), [
      {
        resource: "blogPost",
        exportName: "publish",
        file: "blog-post/publish.ts",
      },
    ]);

    const stray = project({ "actions/comment/x.ts": "" });
    assert.throws(
      () => findActions(path.join(stray, "actions"), resources),
      /actions\/comment\/ doesn't match a resource\. .*actions\/blog-post\//,
    );
    assert.throws(
      () => findActions(path.join(stray, "actions"), []),
      /e\.g\. actions\/post\//,
    );

    const badName = project({ "actions/blog-post/2go.ts": "" });
    assert.throws(
      () => findActions(path.join(badName, "actions"), resources),
      /actions\/blog-post\/2go\.ts: "2go" must start with a letter/,
    );
  });
});

describe("addOpenPermission", () => {
  it("inserts once, and only into a permissions map", () => {
    const root = project({
      "with.ts": PERMISSIONS_FILE,
      "without.ts": "export const other = {\n};\n",
    });
    const file = path.join(root, "with.ts");

    assert.equal(
      addOpenPermission(path.join(root, "missing.ts"), "post"),
      false,
    );
    assert.equal(
      addOpenPermission(path.join(root, "without.ts"), "post"),
      false,
    );
    assert.equal(addOpenPermission(file, "post"), true);
    assert.equal(addOpenPermission(file, "post"), true);
    assert.equal(read(root, "with.ts").match(/post: "open"/g)?.length, 1);
    assert.ok(existsSync(file));
  });
});
