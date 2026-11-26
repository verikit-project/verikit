import { count } from "drizzle-orm";
import { db } from "./client.ts";
import { posts } from "./schema.ts";

/** Adds a few example rows to an empty database so the first run has data. */
export function seed(): void {
  const [{ total }] = db.select({ total: count() }).from(posts).all();

  if (total > 0) {
    return;
  }

  db.insert(posts)
    .values([
      {
        title: "Welcome to Verikit",
        body: "This table, its search, and the create/edit forms all come from resources/post.ts.",
        published: true,
      },
      {
        title: "Add a field",
        body: "Add a field in resources/post.ts, then run npm run db:generate. Or create a resource: npx verikit make:resource Tag name:text",
        published: true,
      },
      {
        title: "Draft post",
        body: "Unpublished posts work too.",
        published: false,
      },
    ])
    .run();
}
