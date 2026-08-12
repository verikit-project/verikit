import type { ResourceFilter } from "@verikit/server";

/** Resource field name -> Prisma scalar name. */
export type PrismaFieldMap = Record<string, string>;

/**
 * Translates a `ResourceFilter` (`eq`/`gte`/`gt`/`lte`/`lt`) into Prisma's own scalar filter
 * shape. Only `eq` needs renaming (Prisma calls it `equals`); the range keys already match
 * Prisma's own names, so they pass through unchanged.
 */
export function mapFilterToPrisma(
  filter: ResourceFilter,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  if (filter.eq !== undefined) mapped.equals = filter.eq;
  if (filter.gte !== undefined) mapped.gte = filter.gte;
  if (filter.gt !== undefined) mapped.gt = filter.gt;
  if (filter.lte !== undefined) mapped.lte = filter.lte;
  if (filter.lt !== undefined) mapped.lt = filter.lt;

  return mapped;
}

/**
 * The only `select` this adapter ever sends: the configured resource fields plus the id
 * field, and nothing else. There's no `include`/relation key here on purpose  a Prisma
 * adapter must not auto-include relations any more than the Drizzle adapter auto-joins
 * them (see `ResourceAdapter`'s docstring in `@verikit/server`).
 */
export function buildSelect(
  fields: PrismaFieldMap,
  idField: string,
): Record<string, true> {
  const select: Record<string, true> = { [idField]: true };

  for (const scalar of Object.values(fields)) {
    select[scalar] = true;
  }

  return select;
}

/**
 * Translates a Prisma row (keyed by Prisma scalar names, shaped by `buildSelect`) into the
 * canonical API record: resource field names plus a string `id`. Since `select` never asks
 * for anything outside `fields` + the id field, this can't leak an undeclared column even if
 * a caller handed `row` more keys than expected.
 */
export function presentRow(
  row: Record<string, unknown>,
  fields: PrismaFieldMap,
  idField: string,
  toPath: (value: unknown) => string,
): Record<string, unknown> {
  const record: Record<string, unknown> = { id: toPath(row[idField]) };

  for (const [name, scalar] of Object.entries(fields)) {
    record[name] = row[scalar];
  }

  return record;
}

/**
 * Translates a create/update payload (keyed by resource field names, already validated by
 * `@verikit/server`) into Prisma `data` (keyed by Prisma scalar names). A key outside
 * `fields` is dropped rather than thrown on: `createPrismaAdapter` requires `fields` to map
 * every declared resource field, so the only way to reach this case is a caller that
 * bypasses that validation (e.g. calling the adapter directly, as this package's own tests
 * do), matching `@verikit/drizzle`'s convention for the same situation.
 */
export function mapValuesToData(
  values: Record<string, unknown>,
  fields: PrismaFieldMap,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(values)) {
    const scalar = fields[name];

    if (scalar) {
      data[scalar] = value;
    }
  }

  return data;
}

/**
 * True for Prisma's "record to update/delete not found" error (`P2025`). `ResourceAdapter`'s
 * `update`/`delete` contract requires an adapter to catch this and translate it to the
 * missing-record signal (`undefined` / a no-op) rather than let it propagate as an unhandled
 * rejection. Checked structurally (`error.code`) instead of `instanceof
 * Prisma.PrismaClientKnownRequestError` so this doesn't depend on which generated
 * `@prisma/client` export path a consumer's Prisma version puts that class on.
 */
export function isRecordNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2025"
  );
}
