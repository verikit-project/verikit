import { boolean, defineResource, text, textarea } from "@verikit/core";

// One definition drives the database table (db/schema.ts, generated), the
// REST API (server/app.ts), validation, and the admin panel (src/App.tsx).
// After changing fields, run `npm run db:generate`.
export const post = defineResource("post", {
  fields: {
    title: text().label("Title").required().searchable(),
    body: textarea().label("Body").nullable().searchable(),
    published: boolean().label("Published").default(false),
  },
});
