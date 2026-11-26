import { Hono } from "hono";
import { drizzleAdapter } from "verikit/drizzle";
import { createServer } from "verikit/server";
import { handlers } from "../actions/index.ts";
import { db } from "../db/client.ts";
import { tables } from "../db/schema.ts";
import { resources } from "../resources/index.ts";
import { permissions } from "./permissions.ts";

// Every resource in resources/ is served at /api/<resource name> and stored
// in its generated table. The tables' `revision` column gives resources with
// permissions safe concurrent updates automatically.
const api = createServer({
  basePath: "/api",
  adapter: drizzleAdapter(db, { tables }),
  resources: resources.map((resource) => ({
    resource,
    handlers: handlers[resource.name],
    permissions: permissions[resource.name],
  })),
});

export const app = new Hono();

app.all("/api/*", (c) => api(c.req.raw));
