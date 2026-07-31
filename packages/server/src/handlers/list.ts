import { parseListParams } from "../http/parse-request.js";
import { dataResponse, forbiddenResponse } from "../http/responses.js";
import {
  maybeCheckResourceOperation,
  redactFields,
  unreadableFieldNames,
} from "../permissions.js";
import type { HandlerContext } from "./context.js";

/** Handles both `GET {base}` (list) and `GET {base}/search` (a smaller-page-size alias). */
export async function handleList(
  ctx: HandlerContext,
  options: { defaultPageSize?: number } = {},
): Promise<Response> {
  const { entry, actor, url } = ctx;

  const permission = await maybeCheckResourceOperation(
    entry.config.permissions,
    "read",
    { actor },
  );

  if (!permission.allowed) {
    return forbiddenResponse(permission.message);
  }

  const { sort, ...rest } = parseListParams(url, options);

  // `sort.field` is caller-controlled and reaches the adapter verbatim.
  // Dropping anything outside the resource's own field names keeps an
  // adapter that builds a raw `ORDER BY <field>` (or similar) from having to
  // defend against arbitrary identifiers itself.
  const params = {
    ...rest,
    ...(sort && Object.hasOwn(entry.fields, sort.field) && { sort }),
  };

  const result = await entry.config.adapter.list(params);
  const hidden = await unreadableFieldNames(
    entry.fields,
    entry.config.permissions,
    {
      actor,
    },
  );

  const records = result.records.map((record) =>
    redactFields(record as Record<string, unknown>, hidden),
  );

  return dataResponse(records, {
    meta: { total: result.total, page: params.page, pageSize: params.pageSize },
  });
}
