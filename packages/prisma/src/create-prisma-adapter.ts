import type { FieldMap, RelationshipMap, Resource } from "@verikit/core";
import type { ResourceAdapter, ResourceListParams } from "@verikit/server";
import {
  buildSelect,
  isRecordNotFoundError,
  mapValuesToData,
  presentRow,
  type PrismaFieldMap,
} from "./mapping.js";

/**
 * Structural subset of a generated Prisma model delegate (e.g. `prisma.post`) that this
 * adapter drives. Kept loose (`any` args/results) rather than imported from `@prisma/client`:
 * a generated client's per-model argument/return types are specific to that model and schema,
 * there's no exported type that describes "any model delegate" generically, and every real
 * delegate is a structural superset of this anyway (same shape `@verikit/drizzle`'s
 * `AnyDrizzleDatabase` uses for the same reason).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- see above */
export interface PrismaModelDelegate {
  findMany(args?: any): Promise<any[]>;
  count(args?: any): Promise<number>;
  findUnique(args: any): Promise<any>;
  findFirst?(args: any): Promise<any>;
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  updateMany?(args: any): Promise<{ count: number }>;
  delete(args: any): Promise<any>;
  deleteMany?(args: any): Promise<{ count: number }>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Id coercion between the adapter's raw string path segment and the value Prisma's `where`
 * expects. Unlike `@verikit/drizzle` (which introspects a real column's `dataType` to coerce
 * automatically), a Prisma model delegate exposes no such runtime metadata, so this is
 * explicit configuration rather than inference.
 */
export interface PrismaIdConfig<TId = unknown> {
  /** The Prisma scalar name of the model's primary (or other unique) id field. */
  field: string;
  /**
   * Decodes a route-segment string into the value used in Prisma's `where`. Return
   * `undefined` to signal the segment can never correspond to a real record (e.g. a
   * non-numeric segment against an `Int` id), which lets `find`/`update`/`delete` report
   * "missing" without even querying, mirroring `@verikit/drizzle`'s `coerceId`. Defaults to
   * the identity function, which only suits a string-typed id (cuid/uuid); a numeric or
   * composite id must supply this.
   */
  fromPath?: (segment: string) => TId | undefined;
  /**
   * Encodes the raw Prisma id value into the canonical string `id` returned to clients.
   * Defaults to `String(value)`.
   */
  toPath?: (value: TId) => string;
}

/**
 * Which case-insensitive search strategy `.searchable()` fields use. Prisma's `mode:
 * "insensitive"` filter is only implemented for PostgreSQL (and MongoDB); passing it on
 * SQLite or MySQL throws `PrismaClientValidationError` at query time. SQLite's own `contains`
 * is already ASCII-case-insensitive without it; MySQL's case-sensitivity is a property of the
 * column's collation, which Prisma can't override from the query API. Omit this (or pass
 * `"sqlite"`/`"mysql"`, which take the same code path) unless the datasource is PostgreSQL.
 * Only `"sqlite"` is exercised by this package's own test suite; `"postgresql"`'s branch is
 * implemented per Prisma's documented behavior but isn't integration-tested here (no
 * PostgreSQL instance in this repo's test environment) — establish and test your own
 * provider's search behavior before relying on it in production.
 *
 * Separately, unlike `@verikit/drizzle` (which escapes `%`/`_` in the search term before
 * building its own `LIKE ... ESCAPE '\'`), this adapter's search goes through Prisma's
 * `contains` filter, which has no escape-character option. A search term containing `%` or
 * `_` is passed through and interpreted as a SQL wildcard by the underlying database, not
 * matched literally. There's no adapter-level fix for this without dropping to raw SQL (and
 * losing cross-provider portability with it); a consumer that needs literal-substring search
 * semantics must filter or escape those characters itself before calling the adapter.
 */
export type PrismaSearchProvider = "postgresql" | "sqlite" | "mysql";

export interface PrismaAdapterOptions<TFields extends FieldMap> {
  /** The generated Prisma model delegate this adapter reads/writes, e.g. `prisma.post`. */
  model: PrismaModelDelegate;
  /**
   * Required resource-field-to-Prisma-scalar mapping, covering every field the resource
   * declares. Used for reads, writes, search, and sorting. There is no automatic
   * same-name fallback (unlike `@verikit/drizzle`'s column resolution) because a Prisma
   * delegate has no introspectable schema to fall back against; every field must be listed
   * explicitly. Relation fields and arbitrary Prisma `include`/`select` values are out of
   * scope — see `ResourceAdapter`'s docstring on why relationship loading isn't part of this
   * contract yet.
   */
  fields: { [K in keyof TFields & string]: string };
  /** Names the model's primary (or other unique) scalar and how to codec it. */
  id: PrismaIdConfig;
  /** See `PrismaSearchProvider`. */
  provider?: PrismaSearchProvider;
}

/** A canonical API record returned by the Prisma adapter. */
export interface PrismaResourceRecord extends Record<string, unknown> {
  /** The id, encoded via `id.toPath`, suitable for resource URLs. */
  id: string;
}

/**
 * Builds a `ResourceAdapter` backed by a Prisma model delegate, so `@verikit/server` never
 * has to import `@prisma/client` itself. Every operation selects and returns only the
 * configured `fields` plus the canonical `id` — never a whole model row — matching
 * `ResourceAdapter`'s contract that adapter records are API records, not ORM rows.
 * @throws {Error} If `fields` is missing a mapping for a field the resource declares, or if a
 * `.searchable()` field's `fieldType` isn't text-like (`text`/`textarea`/`email`) — Prisma's
 * `contains` filter only works on `String` scalars.
 */
export function createPrismaAdapter<
  TFields extends FieldMap,
  TRelationships extends RelationshipMap,
  TTable = unknown,
>(
  resource: Resource<string, TFields, TTable, TRelationships>,
  options: PrismaAdapterOptions<TFields>,
): ResourceAdapter<PrismaResourceRecord> {
  const { model, id } = options;
  const fields = options.fields as PrismaFieldMap;
  const schema = resource.toSchema();

  const unmapped = Object.keys(schema.fields).filter(
    (name) => !Object.hasOwn(fields, name),
  );

  if (unmapped.length > 0) {
    throw new Error(
      `@verikit/prisma: resource "${resource.name}" has no Prisma field mapping for: ${unmapped.join(", ")}. Every declared field needs an entry in \`fields\`.`,
    );
  }

  const searchableScalars = Object.entries(schema.fields)
    .filter(([, field]) => field.searchable)
    .map(([name, field]) => {
      if (
        field.fieldType !== "text" &&
        field.fieldType !== "textarea" &&
        field.fieldType !== "email"
      ) {
        throw new Error(
          `@verikit/prisma: resource "${resource.name}"'s searchable field "${name}" has fieldType "${field.fieldType}". Search only supports text fields.`,
        );
      }

      return fields[name]!;
    });

  const select = buildSelect(fields, id.field);
  const fromPath = id.fromPath ?? ((segment: string) => segment as unknown);
  const toPath = id.toPath ?? ((value: unknown) => String(value));

  function present(
    row: Record<string, unknown> | null | undefined,
  ): PrismaResourceRecord | undefined {
    return row
      ? (presentRow(row, fields, id.field, toPath) as PrismaResourceRecord)
      : undefined;
  }

  function searchWhere(term: string) {
    const insensitive = options.provider === "postgresql";

    return {
      OR: searchableScalars.map((scalar) => ({
        [scalar]: insensitive
          ? { contains: term, mode: "insensitive" }
          : { contains: term },
      })),
    };
  }

  function scopeWhere(scope: Record<string, unknown> | undefined) {
    if (!scope || Object.keys(scope).length === 0) return undefined;
    return Object.fromEntries(
      Object.entries(scope).map(([name, value]) => {
        const scalar = fields[name];
        if (!scalar) {
          throw new Error(
            `@verikit/prisma: resource "${resource.name}" scope field "${name}" has no Prisma mapping.`,
          );
        }
        return [scalar, value];
      }),
    );
  }

  function combinedWhere(
    scope: Record<string, unknown> | undefined,
    extra?: Record<string, unknown>,
  ) {
    const constraints = [scopeWhere(scope), extra].filter(Boolean);
    return constraints.length === 0
      ? undefined
      : constraints.length === 1
        ? constraints[0]
        : { AND: constraints };
  }

  return {
    async list(params: ResourceListParams) {
      // A search term against a resource with no searchable fields can never match
      // anything; treat it as an unsatisfiable filter (zero results), matching
      // @verikit/drizzle's convention for the same case.
      if (params.search && searchableScalars.length === 0) {
        return { records: [], total: 0 };
      }

      const where = combinedWhere(
        params.scope,
        params.search ? searchWhere(params.search) : undefined,
      );
      const sort = params.sort;
      const sortScalar = sort && fields[sort.field];
      const orderBy =
        sort && sortScalar ? { [sortScalar]: sort.direction } : undefined;

      // Two independent queries, not one transaction: only the model delegate is
      // available here, not the top-level PrismaClient that owns `$transaction`. A
      // concurrent write between these two calls can make `total` and `records.length`
      // momentarily disagree across a page boundary; a consumer that needs a consistent
      // snapshot should pass a delegate bound to an active `$transaction` callback.
      const [rows, total] = await Promise.all([
        model.findMany({
          where,
          select,
          ...(orderBy && { orderBy }),
          skip: (params.page - 1) * params.pageSize,
          take: params.pageSize,
        }),
        model.count({ where }),
      ]);

      return {
        records: rows.map((row) => present(row)!),
        total,
      };
    },

    async find(pathId: string, scope?: Record<string, unknown>) {
      const value = fromPath(pathId);

      if (value === undefined) {
        return undefined;
      }

      if (scope && !model.findFirst) {
        throw new Error(
          "@verikit/prisma: scoped reads require a Prisma delegate with findFirst().",
        );
      }
      const row = scope
        ? await model.findFirst!({
            where: combinedWhere(scope, { [id.field]: value }),
            select,
          })
        : await model.findUnique({ where: { [id.field]: value }, select });

      return present(row);
    },

    async create(values: Record<string, unknown>) {
      const data = mapValuesToData(values, fields);
      const row = await model.create({ data, select });
      return present(row)!;
    },

    async update(
      pathId: string,
      values: Record<string, unknown>,
      scope?: Record<string, unknown>,
    ) {
      const value = fromPath(pathId);

      if (value === undefined) {
        return undefined;
      }

      const data = mapValuesToData(values, fields);

      // Prisma's update() only accepts a unique selector, so it cannot express
      // `{ id, organizationId }`. updateMany makes the tenant predicate atomic;
      // the scoped find then returns the canonical public record.
      if (scope) {
        if (!model.updateMany) {
          throw new Error(
            "@verikit/prisma: scoped updates require a Prisma delegate with updateMany().",
          );
        }
        const result = await model.updateMany({
          where: combinedWhere(scope, { [id.field]: value }),
          data,
        });
        return result.count === 0 ? undefined : this.find(pathId, scope);
      }

      try {
        const row = await model.update({
          where: { [id.field]: value },
          data,
          select,
        });

        return present(row);
      } catch (error) {
        if (isRecordNotFoundError(error)) {
          return undefined;
        }

        throw error;
      }
    },

    async delete(pathId: string, scope?: Record<string, unknown>) {
      const value = fromPath(pathId);

      if (value === undefined) {
        return;
      }

      if (scope) {
        if (!model.deleteMany) {
          throw new Error(
            "@verikit/prisma: scoped deletes require a Prisma delegate with deleteMany().",
          );
        }
        await model.deleteMany({
          where: combinedWhere(scope, { [id.field]: value }),
        });
        return;
      }

      try {
        await model.delete({ where: { [id.field]: value } });
      } catch (error) {
        if (!isRecordNotFoundError(error)) {
          throw error;
        }
      }
    },
  };
}
