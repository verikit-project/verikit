import type { FieldMap, RelationshipMap, Resource } from "@verikit/core";
import type { ResourceAdapter, ResourceListParams } from "@verikit/server";
import { asc, count, desc, eq, is, type Table } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { MySqlDatabase } from "drizzle-orm/mysql-core";
import { MySqlTable } from "drizzle-orm/mysql-core";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  coerceId,
  mapValuesToRow,
  resolveFieldColumns,
  resolveIdColumn,
  searchCondition,
} from "./columns.js";

/**
 * Structural union of the drizzle database clients this adapter can drive.
 * All three dialects expose the same `select`/`insert`/`update`/`delete`
 * entry points; only their generic parameters differ, which is why this is a
 * type union rather than a shared base class.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- dialect-specific generics vary per driver; only the shared query-builder surface is used */
export type AnyDrizzleDatabase =
  | BaseSQLiteDatabase<"sync" | "async", any, any, any>
  | PgDatabase<any, any, any>
  | MySqlDatabase<any, any, any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Builds a `ResourceAdapter` backed by a drizzle table, so `@verikit/server`
 * never has to import drizzle-orm itself: `createServer()` only ever talks
 * to the `ResourceAdapter` interface, and this is the piece that turns that
 * interface into real queries.
 *
 * Column mapping: a field maps to the same-named table column by default, or
 * to an explicit one via `from(column).as(field())` when the names differ.
 * The row's id always comes from the table's own primary key column — a
 * resource doesn't need to declare an "id" field for this to work.
 *
 * @throws {Error} If `resource.table` is missing, the table doesn't declare
 * exactly one primary key column, or the table is a MySQL table (MySQL has
 * no `RETURNING` support, so `create`/`update` can't be implemented on it
 * yet).
 */
export function createDrizzleAdapter<
  TFields extends FieldMap,
  TTable extends Table,
  TRelationships extends RelationshipMap,
>(
  db: AnyDrizzleDatabase,
  resource: Resource<string, TFields, TTable, TRelationships>,
): ResourceAdapter<TTable["$inferSelect"]> {
  const { table } = resource;

  if (!table) {
    throw new Error(
      `@verikit/drizzle: resource "${resource.name}" has no table. Pass one via defineResource(name, { table: ... }).`,
    );
  }

  if (is(table, MySqlTable)) {
    throw new Error(
      `@verikit/drizzle: resource "${resource.name}" uses a MySQL table, which isn't supported yet (MySQL/mysql2 has no RETURNING support). Use Postgres or SQLite for now.`,
    );
  }

  const schema = resource.toSchema();
  const idColumn = resolveIdColumn(table, resource.name);
  const columnsByField = resolveFieldColumns(table, schema.fields);
  const searchableColumns = Object.entries(schema.fields)
    .filter(([, field]) => field.searchable)
    .map(([name]) => {
      const resolved = columnsByField.get(name);

      if (!resolved) {
        throw new Error(
          `@verikit/drizzle: resource "${resource.name}"'s searchable field "${name}" has no matching column. Add a same-named column, or map one via from(column).as(...).`,
        );
      }

      return resolved.column;
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the query-builder chain's shape differs per dialect; conditionally built below regardless of which one `db` is
  const client = db as any;

  async function selectById(value: unknown) {
    const [record] = await client
      .select()
      .from(table)
      .where(eq(idColumn, value))
      .limit(1);

    return record;
  }

  return {
    async list(params: ResourceListParams) {
      const where = params.search
        ? searchCondition(searchableColumns, params.search)
        : undefined;

      let rowsQuery = client.select().from(table);
      let totalQuery = client.select({ value: count() }).from(table);

      if (where) {
        rowsQuery = rowsQuery.where(where);
        totalQuery = totalQuery.where(where);
      }

      if (params.sort) {
        const sortColumn = columnsByField.get(params.sort.field)?.column;

        if (sortColumn) {
          rowsQuery = rowsQuery.orderBy(
            params.sort.direction === "desc"
              ? desc(sortColumn)
              : asc(sortColumn),
          );
        }
      }

      const [records, [totalRow]] = await Promise.all([
        rowsQuery
          .limit(params.pageSize)
          .offset((params.page - 1) * params.pageSize),
        totalQuery,
      ]);

      return { records, total: totalRow?.value ?? 0 };
    },

    async find(id: string) {
      const value = coerceId(idColumn, id);

      if (value === undefined) {
        return undefined;
      }

      return selectById(value);
    },

    async create(values: Record<string, unknown>) {
      const row = mapValuesToRow(values, columnsByField);
      const [record] = await client.insert(table).values(row).returning();
      return record;
    },

    async update(id: string, values: Record<string, unknown>) {
      const value = coerceId(idColumn, id);

      if (value === undefined) {
        throw new Error(
          `@verikit/drizzle: no record with id "${id}" to update.`,
        );
      }

      const row = mapValuesToRow(values, columnsByField);

      // An empty payload (or one whose fields all mapped to no column) is a
      // legitimate no-op: the caller already confirmed the record exists, so
      // this returns it unchanged rather than sending drizzle a `set({})`,
      // which throws "No values to set" instead of updating zero columns.
      if (Object.keys(row).length === 0) {
        const record = await selectById(value);

        if (!record) {
          throw new Error(
            `@verikit/drizzle: no record with id "${id}" to update.`,
          );
        }

        return record;
      }

      const [record] = await client
        .update(table)
        .set(row)
        .where(eq(idColumn, value))
        .returning();

      if (!record) {
        throw new Error(
          `@verikit/drizzle: no record with id "${id}" to update.`,
        );
      }

      return record;
    },

    async delete(id: string) {
      const value = coerceId(idColumn, id);

      if (value === undefined) {
        return;
      }

      await client.delete(table).where(eq(idColumn, value));
    },
  };
}
