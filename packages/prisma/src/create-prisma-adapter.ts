import type { FieldMap, RelationshipMap, Resource } from "@verikit/core";
import {
  UniqueConstraintError,
  type ResourceAdapter,
  type ResourceListParams,
} from "@verikit/server";
import {
  buildSelect,
  isRecordNotFoundError,
  isUniqueConstraintError,
  mapFilterToPrisma,
  mapValuesToData,
  presentRow,
  uniqueConstraintFields,
  type PrismaFieldMap,
} from "./mapping.js";

/**
 * Structural subset of a Prisma model delegate used by this adapter.
 * Kept generic to avoid coupling to generated model-specific types.
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
  updateManyAndReturn?(args: any): Promise<any[]>;
  delete(args: any): Promise<any>;
  deleteMany?(args: any): Promise<{ count: number }>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Runs a list operation with the model delegate bound to a Prisma transaction.
 * For example: `(operation) => prisma.$transaction((tx) => operation(tx.post))`.
 */
export type PrismaListTransaction = <T>(
  operation: (model: PrismaModelDelegate) => Promise<T>,
) => Promise<T>;

/**
 * Coerces raw string IDs into the type expected by Prisma `where` clauses.
 * Explicit configuration is required because Prisma exposes no runtime ID type metadata.
 */
export interface PrismaIdConfig<TId = unknown> {
  /** The Prisma scalar name of the model's primary (or other unique) id field. */
  field: string;
  /**
   * Decodes a route-segment ID for Prisma `where` clauses.
   * Return `undefined` for invalid IDs to skip the query and report "missing".
   * Defaults to identity; numeric or composite IDs require an implementation.
   */
  fromPath?: (segment: string) => TId | undefined;
  /**
   * Encodes the raw Prisma id value into the canonical string `id` returned to clients.
   * Defaults to `String(value)`.
   */
  toPath?: (value: TId) => string;
}

/**
 * Case-insensitive search strategy for `.searchable()` fields.
 * PostgreSQL uses Prisma's `mode: "insensitive"`; SQLite and MySQL rely on
 * collation. `%`, `_`, and `\` are matched literally across providers.
 */
export type PrismaSearchProvider = "postgresql" | "sqlite" | "mysql";

export interface PrismaAdapterOptions<TFields extends FieldMap> {
  /** The generated Prisma model delegate this adapter reads/writes, e.g. `prisma.post`. */
  model: PrismaModelDelegate;
  /**
   * Maps every resource field to its Prisma scalar field.
   * All fields must be explicitly mapped; relations and Prisma `include`/`select`
   * values are not supported.
   */
  fields: { [K in keyof TFields & string]: string };
  /** Names the model's primary (or other unique) scalar and how to codec it. */
  id: PrismaIdConfig;
  /** See `PrismaSearchProvider`. */
  provider?: PrismaSearchProvider;
  /**
   * Runs `list()` records and count queries in the same transaction to keep
   * pagination consistent. Required because the adapter cannot open a transaction
   * from a model delegate alone.
   *
   * Use Prisma's `RepeatableRead` isolation for a stable pagination snapshot.
   */
  listTransaction: PrismaListTransaction;
}

/** A canonical API record returned by the Prisma adapter. */
export interface PrismaResourceRecord extends Record<string, unknown> {
  /** The id, encoded via `id.toPath`, suitable for resource URLs. */
  id: string;
}

/**
 * Creates a Prisma-backed `ResourceAdapter`.
 * Selects only configured fields plus `id`, never full model rows.
 *
 * @throws {Error} If a resource field is unmapped or a `.searchable()` field
 * is not text-like.
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

      return [name, fields[name]!] as const;
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

  function searchWhere(term: string, searchable: readonly string[]) {
    const insensitive = options.provider === "postgresql";

    return {
      OR: searchable.map((scalar) => ({
        [scalar]: insensitive
          ? { contains: term, mode: "insensitive" }
          : { contains: term },
      })),
    };
  }

  function matchesLiteralSearch(
    row: Record<string, unknown>,
    term: string,
    searchable: readonly string[],
  ): boolean {
    const normalizedTerm = term.toLowerCase();
    return searchable.some((scalar) => {
      const value = row[scalar];
      return (
        typeof value === "string" &&
        value.toLowerCase().includes(normalizedTerm)
      );
    });
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
    filters?: ResourceListParams["filters"],
  ) {
    const filterWhere = filters
      ? Object.fromEntries(
          Object.entries(filters).map(([name, filter]) => {
            const scalar = fields[name];
            if (!scalar) {
              throw new Error(
                `@verikit/prisma: resource "${resource.name}" filter field "${name}" has no Prisma mapping.`,
              );
            }
            return [scalar, mapFilterToPrisma(filter)];
          }),
        )
      : undefined;
    const constraints = [scopeWhere(scope), extra, filterWhere].filter(Boolean);
    return constraints.length === 0
      ? undefined
      : constraints.length === 1
        ? constraints[0]
        : { AND: constraints };
  }

  async function findRecord(
    pathId: string,
    scope?: Record<string, unknown>,
  ): Promise<PrismaResourceRecord | undefined> {
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
  }

  return {
    async list(params: ResourceListParams) {
      // Search with no searchable fields can never match; return zero results.
      const permittedSearchScalars = params.searchFields
        ? searchableScalars
            .filter(([name]) => params.searchFields!.includes(name))
            .map(([, scalar]) => scalar)
        : searchableScalars.map(([, scalar]) => scalar);
      if (params.search && permittedSearchScalars.length === 0) {
        return { records: [], total: 0 };
      }

      // Prisma `contains` can't escape LIKE metacharacters across all providers.
      // Apply literal matching locally so `%`, `_`, and `\` cannot widen results.
      const literalSearch =
        params.search !== undefined && /[\\%_]/.test(params.search);

      const where = combinedWhere(
        params.scope,
        params.search && !literalSearch
          ? searchWhere(params.search, permittedSearchScalars)
          : undefined,
        params.filters,
      );
      const sort = params.sort;
      const sortScalar = sort && fields[sort.field];
      const orderBy =
        sort && sortScalar ? { [sortScalar]: sort.direction } : undefined;

      const readPage = async (listModel: PrismaModelDelegate) => {
        if (literalSearch) {
          const rows = await listModel.findMany({
            where,
            select,
            ...(orderBy && { orderBy }),
          });
          const matchingRows = rows.filter((row) =>
            matchesLiteralSearch(row, params.search!, permittedSearchScalars),
          );
          const offset = (params.page - 1) * params.pageSize;
          return {
            rows: matchingRows.slice(offset, offset + params.pageSize),
            total: matchingRows.length,
          };
        }

        const [rows, total] = await Promise.all([
          listModel.findMany({
            where,
            select,
            ...(orderBy && { orderBy }),
            skip: (params.page - 1) * params.pageSize,
            take: params.pageSize,
          }),
          listModel.count({ where }),
        ]);

        return { rows, total };
      };
      const { rows, total } = await options.listTransaction(readPage);

      return {
        records: rows.map((row) => present(row)!),
        total,
      };
    },

    find: findRecord,

    async create(values: Record<string, unknown>) {
      const data = mapValuesToData(values, fields);

      try {
        const row = await model.create({ data, select });
        return present(row)!;
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new UniqueConstraintError(
            uniqueConstraintFields(error, fields),
          );
        }

        throw error;
      }
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
      // `{ id, organizationId }`. updateMany/updateManyAndReturn make the tenant
      // predicate atomic.
      if (scope) {
        const where = combinedWhere(scope, { [id.field]: value });

        try {
          // Return the updated row directly when supported; older Prisma delegates
          // fall back to `updateMany` followed by a scoped read.
          if (model.updateManyAndReturn) {
            const [row] = await model.updateManyAndReturn({
              where,
              data,
              select,
            });
            return present(row);
          }

          if (!model.updateMany) {
            throw new Error(
              "@verikit/prisma: scoped updates require a Prisma delegate with updateMany() or updateManyAndReturn().",
            );
          }
          const result = await model.updateMany({ where, data });
          return result.count === 0 ? undefined : findRecord(pathId, scope);
        } catch (error) {
          if (isUniqueConstraintError(error)) {
            throw new UniqueConstraintError(
              uniqueConstraintFields(error, fields),
            );
          }

          throw error;
        }
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

        if (isUniqueConstraintError(error)) {
          throw new UniqueConstraintError(
            uniqueConstraintFields(error, fields),
          );
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
