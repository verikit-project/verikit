import { ForbiddenError } from "@verikit/core";
import { parseFilters, parseListParams } from "../http/parse-request.js";
import { dataResponse } from "../http/responses.js";
import {
  maybeCheckResourceOperation,
  presentRecord,
  unreadableFieldNames,
  unreadableQueryFieldNames,
} from "../permissions.js";
import type { HandlerContext } from "./context.js";
import { resolveScope } from "../access.js";

/**
 * Handles both `GET {base}` (list) and `GET {base}/search` (a smaller-page-size alias).
 */
export async function handleList(
  ctx: HandlerContext,
  options: { defaultPageSize?: number } = {},
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

  const { sort, ...rest } = parseListParams(url, options);
  const scope = await resolveScope(entry, actor);
  // Query parameters are evaluated before records exist. Only a static allow
  // rule can grant query access; contextual rules fail closed so they cannot
  // leak values through filtering, sorting, searching, or pagination totals.
  const queryHidden = unreadableQueryFieldNames(
    entry.fields,
    entry.config.permissions,
  );
  // Reject filters on unreadable fields to prevent inference through pagination totals.
  const filters = Object.fromEntries(
    Object.entries(parseFilters(url, entry.fields)).filter(
      ([name]) => !queryHidden.has(name),
    ),
  );
  const searchFields = Object.entries(entry.fields)
    .filter(([name, field]) => field.searchable && !queryHidden.has(name))
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

  return dataResponse(records, {
    meta: { total: result.total, page: params.page, pageSize: params.pageSize },
  });
}
