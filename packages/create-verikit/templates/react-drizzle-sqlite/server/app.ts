import { createDrizzleAdapter } from "@verikit/drizzle";
import { createServer } from "@verikit/server";
import { Hono } from "hono";
import { db } from "../db/client.ts";
import { posts } from "../db/schema.ts";
import { post } from "../resources/post.ts";

const api = createServer({
  basePath: "/api",
  resources: [
    {
      resource: post,
      adapter: createDrizzleAdapter(db, post, {
        versionColumn: posts.revision,
      }),
      // "open" skips permission checks. Replace it with definePermissions()
      // from @verikit/core, and add a `context` option above that reads the
      // signed-in user from the request.
      permissions: "open",
    },
  ],
});

export const app = new Hono();

app.all("/api/*", (c) => api(c.req.raw));
