import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { wireResourceActions } from "../src/wire-actions.js";

const wire = (source: string) =>
  wireResourceActions(source, "post", "./post.actions.ts", "postActions");

describe("wireResourceActions", () => {
  it("adds the import after the last import and the actions line", () => {
    const result = wire(`import { a } from "a";
import {
  b,
} from "b";

export const post = defineResource("post", {
  fields: {},
});
`);

    assert.deepEqual(result, {
      status: "wired",
      source: `import { a } from "a";
import {
  b,
} from "b";
import * as postActions from "./post.actions.ts";

export const post = defineResource("post", {
  actions: Object.values(postActions),
  fields: {},
});
`,
    });
  });

  it("puts the import first in a file without imports", () => {
    const result = wire(
      `const post = defineResource('post', {\n  fields: {},\n});\n`,
    );
    assert.equal(result.status, "wired");
    assert.match(
      (result as { source: string }).source,
      /^import \* as postActions from "\.\/post\.actions\.ts";\nconst post/,
    );
  });

  it("leaves wired files alone and explains what it can't edit", () => {
    assert.deepEqual(wire(`import * as x from "./post.actions.ts";`), {
      status: "already",
    });
    assert.deepEqual(wire(`defineResource("post", { fields: {} });`), {
      status: "manual",
      reason: 'couldn\'t find defineResource("post", {',
    });
    assert.deepEqual(
      wire(`defineResource("post", {\n  actions: [x],\n  fields: {},\n});`),
      { status: "manual", reason: "it already sets `actions`" },
    );
  });
});
