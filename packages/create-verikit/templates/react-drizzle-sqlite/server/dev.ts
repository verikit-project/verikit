import { createServer } from "node:http";
import { getRequestListener } from "@hono/node-server";
import { createServer as createViteServer } from "vite";
import { seed } from "../db/seed.ts";
import { app } from "./app.ts";

const port = Number(process.env.PORT ?? 3000);

seed();

const handleApi = getRequestListener(app.fetch);

// One port for everything: /api/* goes to Hono, the rest to Vite.
const server = createServer((req, res) => {
  if (req.url?.startsWith("/api/")) {
    void handleApi(req, res);
    return;
  }

  vite.middlewares(req, res);
});

const vite = await createViteServer({
  server: { middlewareMode: true, hmr: { server } },
  appType: "spa",
});

server.listen(port, () => {
  console.log(`\n  Verikit app running at http://localhost:${port}\n`);
});
