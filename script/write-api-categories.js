#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

const categories = [
  [
    "docs/api/core/_category_.json",
    {
      label: "Core API Reference",
      position: 1,
      link: {
        type: "doc",
        id: "api/core/core",
      },
    },
  ],
  [
    "docs/api/runtime/_category_.json",
    {
      label: "Runtime API Reference",
      position: 2,
      link: {
        type: "doc",
        id: "api/runtime/runtime",
      },
    },
  ],
];

for (const [relativePath, category] of categories) {
  const filePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(category, null, 2)}\n`);
}
