import { boolean, defineResource, text, textarea } from "@verikit/core";
import { PrismaClient } from "@prisma/client";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createPrismaAdapter } from "../src/create-prisma-adapter.js";

/**
 * A fresh SQLite-backed `PrismaClient` per call, schema created via raw SQL rather than
 * `prisma migrate`/`db push` so tests don't shell out to the CLI. Table/column shapes mirror
 * `packages/drizzle/test/fixtures.ts` (same field-mismatch and numeric-id cases) so the two
 * adapters' test suites stay easy to compare.
 */
export async function createTestDb(): Promise<PrismaClient> {
  const dir = await mkdtemp(path.join(tmpdir(), "verikit-prisma-"));
  const prisma = new PrismaClient({
    datasourceUrl: `file:${path.join(dir, "test.db")}`,
  });

  await prisma.$executeRawUnsafe(`
    create table posts (
      id text primary key,
      title text not null,
      body text,
      published integer not null default 0,
      secret text
    )
  `);

  await prisma.$executeRawUnsafe(`
    create table legacy_posts (
      post_id text primary key,
      headline text not null
    )
  `);

  await prisma.$executeRawUnsafe(`
    create table counters (
      id integer primary key autoincrement,
      label text not null
    )
  `);

  return prisma;
}

export function createPostResource() {
  return defineResource("post", {
    fields: {
      title: text().required().searchable(),
      body: textarea().searchable(),
      published: boolean().default(false),
    },
  });
}

export function createPostAdapter(db: PrismaClient) {
  return createPrismaAdapter(createPostResource(), {
    model: db.post,
    fields: { title: "title", body: "body", published: "published" },
    id: { field: "id" },
  });
}

/**
 * A resource whose field name ("title") deliberately differs from the Prisma scalar it maps
 * to ("headline"), exercising `fields`' name-mismatch mapping the same way
 * `packages/drizzle/test/fixtures.ts`'s `createLegacyPostResource` exercises
 * `from(column).as(...)`. Has no `.searchable()` field, for the "no searchable fields" case.
 */
export function createLegacyPostResource() {
  return defineResource("legacyPost", {
    fields: {
      title: text().required(),
    },
  });
}

export function createLegacyPostAdapter(db: PrismaClient) {
  return createPrismaAdapter(createLegacyPostResource(), {
    model: db.legacyPost,
    fields: { title: "headline" },
    id: { field: "postId" },
  });
}

/** A numeric (not string) primary key, to exercise `id.fromPath`/`id.toPath`. */
export function createCounterResource() {
  return defineResource("counter", {
    fields: { label: text().required() },
  });
}

export function createCounterAdapter(db: PrismaClient) {
  return createPrismaAdapter(createCounterResource(), {
    model: db.counter,
    fields: { label: "label" },
    id: {
      field: "id",
      fromPath: (segment: string) => {
        const value = Number(segment);
        return Number.isNaN(value) ? undefined : value;
      },
      toPath: (value: unknown) => String(value),
    },
  });
}
