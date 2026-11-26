import { count } from "drizzle-orm";
import { db } from "./client.ts";
import { signups } from "./schema.ts";

/** Adds a few example signups to an empty database so the first run has data. */
export function seed(): void {
  const [{ total }] = db.select({ total: count() }).from(signups).all();

  if (total > 0) {
    return;
  }

  db.insert(signups)
    .values([
      { email: "ada@example.com", name: "Ada Lovelace", source: "friend" },
      { email: "grace@example.com", name: "Grace Hopper", source: "search" },
      {
        email: "alan@example.com",
        name: "Alan Turing",
        source: "social",
        status: "invited",
      },
    ])
    .run();
}
