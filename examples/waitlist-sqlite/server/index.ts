import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { app } from "./app.ts";

const port = Number(process.env.PORT ?? 3000);

// Serves the `npm run build` output, falling back to index.html for
// client-side routes.
app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Verikit app running at http://localhost:${info.port}`);
});
