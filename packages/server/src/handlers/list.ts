import { ForbiddenError, ValidationError } from "@verikit/core";
import { parseFilters, parseListParams } from "../http/parse-request.js";
import { dataResponse } from "../http/responses.js";
import {
  maybeCheckResourceOperation,
  presentRecord,
  unreadableFieldNames,
  unreadableQueryFieldNames,
} from "../permissions.js";
import { relationshipLabels } from "../relationship-labels.js";
import type { RouteTableEntry } from "../routing/route-table.js";
import {
  listActionAvailability,
  parseIncludes,
} from "./action-availability.js";
import type { HandlerContext } from "./context.js";
import { resolveScope } from "../access.js";

/** Options for {@link handleList}. */
export interface HandleListOptions {
  /** Page size when the request doesn't set one. */
  defaultPageSize?: number;
  /**
   * `false` for relationship pickers, which ignore `include` (they never
   * report actions or relationship labels).
   */
  includes?: false;
  /**
   * Fields searched in addition to the resource's `.searchable()` ones, such
   * as a picker target's `displayField`. Fields the actor can't query are
   * still left out.
   */
  extraSearchFields?: readonly string[];
  /** Every registered resource, for `include=relationships` targets. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- actor erased, as in `HandlerContext`
  table?: readonly RouteTableEntry<any>[];
}

/**
 * Handles both `GET {base}` (list) and `GET {base}/search` (a smaller-page-size alias). With `include=actions`, also reports which actions the actor can't run on the returned page as `meta.actions`; with `include=relationships`, the page's `belongsTo` display labels as `meta.relationships`. Neither applies when `options.includes` is `false`.
 */
export async function handleList(
  ctx: HandlerContext,
  options: HandleListOptions = {},
): Promise<Response> {
  const { entry, actor, url } = ctx;

  const permission = await maybeCheckResourceOperation(
    entry.config.permissions,
    "list",
    { actor },
  );

  if (!permission.allowed) {
    throw new ForbiddenError(permission.message);
  }

  const includes =
    options.includes === false ? new Set<string>() : parseIncludes(url);
  const { sort, ...rest } = parseListParams(url, options);
  const scope = await resolveScope(entry, actor);
  // Query parameters are evaluated before records exist. Only a static allow
  // rule can grant query access; contextual rules fail closed so they cannot
  // leak values through filtering, sorting, searching, or pagination totals.
  const queryHidden = unreadableQueryFieldNames(
    entry.fields,
    entry.config.permissions,
  );
  const filters = parseFilters(url, entry.fields);
  const unreadableFilterNames = Object.keys(filters).filter((name) =>
    queryHidden.has(name),
  );
  if (unreadableFilterNames.length > 0) {
    throw new ValidationError(
      "Invalid filters.",
      unreadableFilterNames.map((name) => ({
        path: ["filter", name],
        message: "Field is not available for filtering.",
      })),
    );
  }
  const extraSearchFields = new Set(options.extraSearchFields);
  const searchFields = Object.entries(entry.fields)
    .filter(
      ([name, field]) =>
        (field.searchable || extraSearchFields.has(name)) &&
        !queryHidden.has(name),
    )
    .map(([name]) => name);

  // Restrict caller-controlled sort fields to the schema's sortable allow-list
  // before passing them to the adapter.
  const params = {
    ...rest,
    ...(scope && { scope }),
    ...(Object.keys(filters).length > 0 && { filters }),
    ...(rest.search !== undefined && { searchFields }),
    ...(sort &&
      entry.fields[sort.field]?.sortable &&
      !queryHidden.has(sort.field) && { sort }),
  };

  const result = await entry.config.adapter.list(params);
  const records = await Promise.all(
    result.records.map(async (record) => {
      const publicRecord = record as Record<string, unknown>;
      // Unlike query capabilities, response visibility is resolved against the
      // actual row. This makes record-aware read rules safe for list/search.
      const hidden = await unreadableFieldNames(
        entry.fields,
        entry.config.permissions,
        { actor, record: publicRecord },
      );
      return presentRecord(publicRecord, entry.fields, hidden);
    }),
  );

  const [actions, relationships] = await Promise.all([
    includes.has("actions")
      ? listActionAvailability(ctx, result.records as Record<string, unknown>[])
      : undefined,
    includes.has("relationships")
      ? relationshipLabels(entry, options.table ?? [], records, actor)
      : undefined,
  ]);

  return dataResponse(records, {
    meta: {
      total: result.total,
      page: params.page,
      pageSize: params.pageSize,
      ...(actions && { actions }),
      ...(relationships && { relationships }),
    },
  });
}
