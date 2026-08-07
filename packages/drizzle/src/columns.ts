import type { FieldSchema } from "@verikit/core";
import { type Column, getTableColumns, or, sql, type Table } from "drizzle-orm";

/**
 * A field's storage column, plus the table's own JS property key for it. `jsKey` is what drizzle's `.values()`/`.set()` expect on write it only differs from the field name when the field was mapped via `from(column).as(...)`.
 */
export interface ResolvedColumn {
  column: Column;
  jsKey: string;
}

/**
 * Resolves each field's storage column: a `from(column).as(...)` source takes priority (handles field/column name mismatches); otherwise falls back to a same-named column on the table. Fields with neither are left unmapped. @throws {Error} If a field's `from(column)` source isn't actually one of `table`'s own columns.
 */
export function resolveFieldColumns(
  table: Table,
  fields: Record<string, FieldSchema>,
): Map<string, ResolvedColumn> {
  const tableColumns = getTableColumns(table) as Record<string, Column>;
  const resolved = new Map<string, ResolvedColumn>();

  for (const [name, field] of Object.entries(fields)) {
    if (field.source?.mode === "consume") {
      const column = field.source.column as Column;
      const jsKey = Object.keys(tableColumns).find(
        (key) => tableColumns[key] === column,
      );

      if (!jsKey) {
        throw new Error(
          `@verikit/drizzle: field "${name}"'s from(column) isn't a column of its resource's table.`,
        );
      }

      resolved.set(name, { column, jsKey });
      continue;
    }

    const column = tableColumns[name];

    if (column) {
      resolved.set(name, { column, jsKey: name });
    }
  }

  return resolved;
}

/**
 * Translates a create/update payload (keyed by resource field name) into a row object keyed by the table's own JS column keys. A key that isn't one of the resource's declared fields is dropped silently, since `ResourceAdapter.create`/`update` accept a plain `Record<string, unknown>`, so a caller that doesn't route through `@verikit/server`'s field-filtered validation (e.g. calling the adapter directly, as this package's own tests do) can send extras that were never meant to reach storage. A key that *is* a declared field but has no resolvable column is a resource misconfiguration instead (a typo, or a forgotten `from(column).as(...)`), so that case throws rather than silently discarding a value the schema promised to persist. @throws {Error} If `values` has a key naming a declared field with no resolvable column.
 */
export function mapValuesToRow(
  resourceName: string,
  values: Record<string, unknown>,
  fields: Record<string, FieldSchema>,
  columnsByField: Map<string, ResolvedColumn>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(values)) {
    const resolved = columnsByField.get(name);

    if (resolved) {
      row[resolved.jsKey] = value;
      continue;
    }

    if (Object.hasOwn(fields, name)) {
      throw new Error(
        `@verikit/drizzle: resource "${resourceName}"'s field "${name}" has no matching column, so its value can't be persisted. Add a same-named column, or map one via from(column).as(...).`,
      );
    }
  }

  return row;
}

/**
 * Finds the table's single-column primary key, used to satisfy the `ResourceAdapter` contract's raw string `id`. Resources don't need to declare their own "id" field for this the primary key is a storage-level concern the table already knows about. @throws {Error} If the table has zero or multiple primary key columns.
 */
export function resolveIdColumn(table: Table, resourceName: string): Column {
  const columns = Object.values(
    getTableColumns(table) as Record<string, Column>,
  );
  const primaryColumns = columns.filter((column) => column.primary);

  if (primaryColumns.length !== 1) {
    throw new Error(
      `@verikit/drizzle: resource "${resourceName}"'s table must declare exactly one primary key column (found ${primaryColumns.length}).`,
    );
  }

  return primaryColumns[0]!;
}

/**
 * Coerces the adapter's raw string `id` to the id column's storage type. Returns `undefined` for a numeric column given a non-numeric id, letting callers treat it as "no such record" instead of sending `NaN` to the driver.
 */
export function coerceId(column: Column, id: string): unknown {
  if (column.dataType === "number") {
    const value = Number(id);
    return Number.isNaN(value) ? undefined : value;
  }

  return id;
}

const LIKE_ESCAPE = "\\";

function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `${LIKE_ESCAPE}${char}`);
}

/**
 * Builds a case-insensitive, cross-dialect "contains" condition across the given columns. Deliberately avoids drizzle's `ilike()` (Postgres-only SQL keyword) in favor of `lower(...) like lower(...)`, which Postgres, SQLite, and MySQL all understand the same way.
 */
export function searchCondition(columns: Column[], term: string) {
  if (columns.length === 0) {
    return undefined;
  }

  const pattern = `%${escapeLikeTerm(term)}%`;

  return or(
    ...columns.map(
      (column) => sql`lower(${column}) like lower(${pattern}) escape '\\'`,
    ),
  );
}
