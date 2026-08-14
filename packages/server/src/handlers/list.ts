import { ForbiddenError } from "@verikit/core";
import { parseFilters, parseListParams } from "../http/parse-request.js";
import { dataResponse } from "../http/responses.js";
import {
  maybeCheckResourceOperation,
  presentRecord,
  unreadableFieldNames,
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
  const hidden = await unreadableFieldNames(
    entry.fields,
    entry.config.permissions,
    { actor },
  );
// Reject filters on unreadable fields to prevent inference through pagination totals.
  const filters = Object.fromEntries(
    Object.entries(parseFilters(url, entry.fields)).filter(
      ([name]) => !hidden.has(name),
    ),
  );
  const searchFields = Object.entries(entry.fields)
    .filter(([name, field]) => field.searchable && !hidden.has(name))
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
      !hidden.has(sort.field) && { sort }),
  };

  const result = await entry.config.adapter.list(params);
  const records = result.records.map((record) =>
    presentRecord(record as Record<string, unknown>, entry.fields, hidden),
  );

  return dataResponse(records, {
    meta: { total: result.total, page: params.page, pageSize: params.pageSize },
  });
}
