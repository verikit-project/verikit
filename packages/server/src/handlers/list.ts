import { parseFilters, parseListParams } from "../http/parse-request.js";
import { dataResponse, forbiddenResponse } from "../http/responses.js";
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
    return forbiddenResponse(permission.message);
  }

  const { sort, ...rest } = parseListParams(url, options);
  const scope = await resolveScope(entry, actor);
  const hidden = await unreadableFieldNames(
    entry.fields,
    entry.config.permissions,
    { actor },
  );
  // Filtering changes both records and pagination totals, so an unreadable
  // field must be excluded before the adapter sees it. Otherwise a caller
  // could infer the field through `meta.total` despite response redaction.
  const filters = Object.fromEntries(
    Object.entries(parseFilters(url, entry.fields)).filter(
      ([name]) => !hidden.has(name),
    ),
  );
  const searchFields = Object.entries(entry.fields)
    .filter(([name, field]) => field.searchable && !hidden.has(name))
    .map(([name]) => name);

  // `sort.field` is caller-controlled and reaches the adapter verbatim. Dropping
  // anything outside the resource's own `.sortable()` field names keeps an adapter that
  // builds a raw `ORDER BY <field>` (or similar) from having to defend against arbitrary
  // or unintended-cost identifiers itself, since a field only reaches the adapter here
  // if the schema explicitly opted it in for sorting, not just because it exists.
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
