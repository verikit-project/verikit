import { boolean, defineResource, from, text, textarea } from "@verikit/core";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text as sqliteText,
} from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: sqliteText("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: sqliteText("title").notNull(),
  body: sqliteText("body"),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
});

/** A table whose PK/column names don't match the resource's field names, to exercise `from(column).as(...)`. */
export const legacyPosts = sqliteTable("legacy_posts", {
  postId: sqliteText("post_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  headline: sqliteText("headline").notNull(),
});

export function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite);

  db.run(sql`
    create table posts (
      id text primary key,
      title text not null,
      body text,
      published integer not null default 0
    )
  `);

  db.run(sql`
    create table legacy_posts (
      post_id text primary key,
      headline text not null
    )
  `);

  return db;
}

export function createPostResource() {
  return defineResource("post", {
    table: posts,
    fields: {
      title: text().required().searchable(),
      body: textarea().searchable(),
      published: boolean().default(false),
    },
  });
}

export function createLegacyPostResource() {
  return defineResource("legacyPost", {
    table: legacyPosts,
    fields: {
      // Field name ("title") deliberately differs from the column's JS key
      // ("headline") to exercise from(column).as(...) name-mismatch mapping.
      title: from(legacyPosts.headline).as(text().required()),
    },
  });
}
