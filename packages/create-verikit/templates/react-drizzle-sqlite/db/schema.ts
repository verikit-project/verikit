import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Database tables. After changing this file, run `npm run db:generate` to
// create a migration; the app applies pending migrations when it starts.
export const posts = sqliteTable("posts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  body: text("body"),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  // Lets the server reject stale updates/deletes once a resource has
  // permissions. Keep it out of the resource's fields.
  revision: integer("revision").notNull().default(0),
});
