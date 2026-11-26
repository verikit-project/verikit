import { boolean, defineResource, text, textarea } from "@verikit/core";
import { posts } from "../db/schema.ts";

// One definition drives the REST API (server/app.ts), validation, and the
// table and forms in the browser (src/App.tsx).
export const post = defineResource("post", {
  table: posts,
  fields: {
    title: text().label("Title").required().searchable(),
    body: textarea().label("Body").searchable(),
    published: boolean().label("Published").default(false),
  },
});
