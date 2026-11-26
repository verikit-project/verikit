import { createDrizzleAdapter } from "@verikit/drizzle";
import { createServer } from "@verikit/server";
import { Hono } from "hono";
import { actions } from "../actions/index.ts";
import { db } from "../db/client.ts";
import { tables } from "../db/schema.ts";
import { resources } from "../resources/index.ts";
import { permissions } from "./permissions.ts";

// Every resource in resources/ is served at /api/<resource name>.
const api = createServer({
  basePath: "/api",
  resources: resources.map((resource) => {
    const table = tables[resource.name];

    return {
      resource,
      adapter: createDrizzleAdapter(db, resource, {
        table,
        versionColumn: table.revision,
      }),
      actions: actions[resource.name],
      permissions: permissions[resource.name],
    };
  }),
});

export const app = new Hono();

app.all("/api/*", (c) => api(c.req.raw));
