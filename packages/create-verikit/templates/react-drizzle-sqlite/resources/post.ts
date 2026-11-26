import { boolean, defineResource, text, textarea } from "@verikit/core";
import { posts } from "../db/schema.ts";

// One definition drives the REST API (server/app.ts), validation, and the
// table and forms in the browser (src/App.tsx).
export const post = defineResource("post", {
  table: posts,
  fields: {
    title: text().label("Title").required().searchable(),
    // The column allows NULL, so the field must too: `.optional()` alone
    // rejects the null that empty rows come back with.
    body: textarea().label("Body").nullable().searchable(),
    published: boolean().label("Published").default(false),
  },
});
