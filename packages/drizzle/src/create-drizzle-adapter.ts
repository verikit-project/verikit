import type { FieldMap, RelationshipMap, Resource } from "@verikit/core";
import type { ResourceAdapter, ResourceListParams } from "@verikit/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  is,
  isNull,
  lt,
  lte,
  type SQL,
  type Table,
} from "drizzle-orm";
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
 * Structural union of the drizzle database clients this adapter can drive. All three dialects expose the same `select`/`insert`/`update`/`delete` entry points; only their generic parameters differ, which is why this is a type union rather than a shared base class.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- dialect-specific generics vary per driver; only the shared query-builder surface is used */
export type AnyDrizzleDatabase =
  | BaseSQLiteDatabase<"sync" | "async", any, any, any>
  | PgDatabase<any, any, any>
  | MySqlDatabase<any, any, any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** A canonical API record returned by the Drizzle adapter. */
export interface DrizzleResourceRecord extends Record<string, unknown> {
  /** String form of the table's single primary key, suitable for resource URLs. */
  id: string;
}

/**
 * Builds a `ResourceAdapter` backed by a drizzle table, so `@verikit/server` never has to import drizzle-orm itself: `createServer()` only ever talks to the `ResourceAdapter` interface, and this is the piece that turns that interface into real queries. Column mapping: a field maps to the same-named table column by default, or to an explicit one via `from(column).as(field())` when the names differ. The row's id always comes from the table's own primary key column; a resource doesn't need to declare an "id" field for this to work. @throws {Error} If `resource.table` is missing, the table doesn't declare exactly one primary key column, or the table is a MySQL table (MySQL has no `RETURNING` support, so `create`/`update` can't be implemented on it yet).
 */
export function createDrizzleAdapter<
  TFields extends FieldMap,
  TTable extends Table,
  TRelationships extends RelationshipMap,
>(
  db: AnyDrizzleDatabase,
  resource: Resource<string, TFields, TTable, TRelationships>,
): ResourceAdapter<DrizzleResourceRecord> {
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
  // Query aliases are the resource's public field names, not drizzle's table
  // property keys. This both supports `from(column).as(...)` and ensures ORM-only
  // columns can never enter an adapter result.
  const publicSelection = {
    ...Object.fromEntries(
      [...columnsByField.entries()]
        .filter(([name]) => name !== "id")
        .map(([name, resolved]) => [name, resolved.column]),
    ),
    id: idColumn,
  };

  function toPublicRecord(record: Record<string, unknown>) {
    return { ...record, id: String(record.id) };
  }

  function combineConditions(conditions: readonly SQL[]): SQL | undefined {
    return conditions.length ? and(...conditions) : undefined;
  }

  function scopeCondition(
    scope: Record<string, unknown> | undefined,
  ): SQL | undefined {
    if (!scope) return undefined;
    const conditions: SQL[] = [];
    for (const [name, value] of Object.entries(scope)) {
      const resolved = columnsByField.get(name);
      if (!resolved) {
        throw new Error(
          `@verikit/drizzle: resource "${resource.name}" scope field "${name}" has no matching column.`,
        );
      }
      conditions.push(
        value === null ? isNull(resolved.column) : eq(resolved.column, value),
      );
    }
    return combineConditions(conditions);
  }

  function filterCondition(
    filters: ResourceListParams["filters"],
  ): SQL | undefined {
    if (!filters) return undefined;
    const conditions: SQL[] = [];
    for (const [name, filter] of Object.entries(filters)) {
      const column = columnsByField.get(name)?.column;
      if (!column) continue;
      if (filter.eq !== undefined) {
        conditions.push(
          filter.eq === null ? isNull(column) : eq(column, filter.eq),
        );
      }
      if (filter.gte !== undefined) conditions.push(gte(column, filter.gte));
      if (filter.gt !== undefined) conditions.push(gt(column, filter.gt));
      if (filter.lte !== undefined) conditions.push(lte(column, filter.lte));
      if (filter.lt !== undefined) conditions.push(lt(column, filter.lt));
    }
    return combineConditions(conditions);
  }
  const searchableColumns = Object.entries(schema.fields)
    .filter(([, field]) => field.searchable)
    .map(([name]) => {
      const resolved = columnsByField.get(name);

      if (!resolved) {
        throw new Error(
          `@verikit/drizzle: resource "${resource.name}"'s searchable field "${name}" has no matching column. Add a same-named column, or map one via from(column).as(...).`,
        );
      }

      // searchCondition() builds a lower(...) like lower(...) comparison, which only
      // Postgres/MySQL/SQLite agree on for text columns. On a non-text column, Postgres
      // and MySQL throw at query time (SQLite's loose typing masks it by silently no-opping instead). `.searchable()` has no type restriction in @verikit/core, so this has to be a runtime check here rather than a compile-time one.
      if (resolved.column.dataType !== "string") {
        throw new Error(
          `@verikit/drizzle: resource "${resource.name}"'s searchable field "${name}" maps to a non-text column (dataType "${resolved.column.dataType}"). Search only supports text columns.`,
        );
      }

      return [name, resolved.column] as const;
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the query-builder chain's shape differs per dialect; conditionally built below regardless of which one `db` is
  const client = db as any;

  async function selectById(value: unknown, scope?: Record<string, unknown>) {
    const [record] = await client
      .select(publicSelection)
      .from(table)
      .where(and(eq(idColumn, value), scopeCondition(scope)))
      .limit(1);

    return record ? toPublicRecord(record) : undefined;
  }

  // Builds the row-fetch and count queries for `list()` against whichever client `tx`
  // is the outer transaction wrapper, either dialect's own client so both queries
  // always run against the same snapshot instead of two independent reads that a concurrent write could land between.
  function buildListQueries(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same dialect-erased client shape as `client` above
    tx: any,
    params: ResourceListParams,
    where: ReturnType<typeof searchCondition>,
  ) {
    let rowsQuery = tx.select(publicSelection).from(table);
    let totalQuery = tx.select({ value: count() }).from(table);

    if (where) {
      rowsQuery = rowsQuery.where(where);
      totalQuery = totalQuery.where(where);
    }

    if (params.sort) {
      const sortColumn = columnsByField.get(params.sort.field)?.column;

      if (sortColumn) {
        rowsQuery = rowsQuery.orderBy(
          params.sort.direction === "desc" ? desc(sortColumn) : asc(sortColumn),
        );
      }
    }

    return {
      rowsQuery: rowsQuery
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize),
      totalQuery,
    };
  }

  return {
    async list(params: ResourceListParams) {
      // A search term against a resource with no searchable fields can never
      // match anything; treat it as an unsatisfiable filter (zero results),
      // not as "no filter" (which would return every row unfiltered).
      const permittedSearchColumns = params.searchFields
        ? searchableColumns
            .filter(([name]) => params.searchFields!.includes(name))
            .map(([, column]) => column)
        : searchableColumns.map(([, column]) => column);
      if (params.search && permittedSearchColumns.length === 0) {
        return { records: [], total: 0 };
      }

      const search = params.search
        ? searchCondition(permittedSearchColumns, params.search)
        : undefined;
      const where = and(
        search,
        scopeCondition(params.scope),
        filterCondition(params.filters),
      );

      // better-sqlite3 is fully synchronous: its native `transaction()` wrapper throws
      // "Transaction function cannot return a promise" if the callback is `async`, so the
      // row and count queries have to run via their synchronous `.all()` method inside a plain callback instead of `await`-ing them. Every other drizzle dialect's `transaction()` is genuinely async and supports the `await Promise.all([...])` form.
      if (client.resultKind === "sync") {
        return client.transaction(() => {
          const { rowsQuery, totalQuery } = buildListQueries(
            client,
            params,
            where,
          );
          const records = rowsQuery.all();
          // A `count(*)` aggregate with no GROUP BY always returns exactly
          // one row (0 for no matches), never zero rows, across every
          // dialect this adapter targets.
          const [{ value: total }] = totalQuery.all();

          return { records: records.map(toPublicRecord), total };
        });
      }

      return client.transaction(async (tx: typeof client) => {
        const { rowsQuery, totalQuery } = buildListQueries(tx, params, where);
        const [records, [{ value: total }]] = await Promise.all([
          rowsQuery,
          totalQuery,
        ]);

        return { records: records.map(toPublicRecord), total };
      });
    },

    async find(id: string, scope?: Record<string, unknown>) {
      const value = coerceId(idColumn, id);

      if (value === undefined) {
        return undefined;
      }

      return selectById(value, scope);
    },

    async create(values: Record<string, unknown>) {
      const row = mapValuesToRow(
        resource.name,
        values,
        schema.fields,
        columnsByField,
      );
      const [record] = await client
        .insert(table)
        .values(row)
        .returning(publicSelection);
      return toPublicRecord(record);
    },

    async update(
      id: string,
      values: Record<string, unknown>,
      scope?: Record<string, unknown>,
    ) {
      const value = coerceId(idColumn, id);

      // No record can have this id (a non-numeric id against a numeric column), or the
      // record was deleted between the caller's own existence check and this call. Either
      // way, matches `find`'s "missing" signal (`undefined`) rather than throwing, so
      // `@verikit/server` can map it to a 404 instead of an opaque 500.
      if (value === undefined) {
        return undefined;
      }

      const row = mapValuesToRow(
        resource.name,
        values,
        schema.fields,
        columnsByField,
      );

      // An empty payload (or one whose keys are all undeclared, non-field extras) is a
      // legitimate no-op: the caller already confirmed the record exists, so this
      // returns it unchanged rather than sending drizzle a `set({})`, which throws "No values to set" instead of updating zero columns.
      if (Object.keys(row).length === 0) {
        return selectById(value, scope);
      }

      const [record] = await client
        .update(table)
        .set(row)
        .where(and(eq(idColumn, value), scopeCondition(scope)))
        .returning(publicSelection);

      return record ? toPublicRecord(record) : undefined;
    },

    async delete(id: string, scope?: Record<string, unknown>) {
      const value = coerceId(idColumn, id);

      if (value === undefined) {
        return;
      }

      await client
        .delete(table)
        .where(and(eq(idColumn, value), scopeCondition(scope)));
    },
  };
}
