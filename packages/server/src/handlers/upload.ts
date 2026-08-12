import { checkFieldAccess } from "@verikit/core";
import {
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  dataResponse,
} from "../http/responses.js";
import type { HandlerContext } from "./context.js";
import type { FileStorage } from "../storage.js";

interface UploadField {
  fieldType: "file" | "image";
  accept?: readonly string[];
  maxSize?: number;
}

function accepts(
  type: string,
  accepted: readonly string[] | undefined,
): boolean {
  if (!accepted || accepted.length === 0) return true;
  return accepted.some((rule) =>
    rule.endsWith("/*") ? type.startsWith(rule.slice(0, -1)) : type === rule,
  );
}

/** Handles `POST {base}/uploads/:field` multipart requests. */
export async function handleUpload(
  ctx: HandlerContext,
  fieldName: string,
  storage: FileStorage | undefined,
): Promise<Response> {
  const field = ctx.entry.fields[fieldName];
  if (!field || (field.fieldType !== "file" && field.fieldType !== "image")) {
    return notFoundResponse();
  }
  const uploadField = field as typeof field & UploadField;
  if (!storage) {
    return errorResponse(501, "File storage is not configured.");
  }
  if (ctx.entry.config.permissions !== "open") {
    const access = await checkFieldAccess(
      ctx.entry.config.permissions.getRuntime(),
      fieldName,
      "write",
      { actor: ctx.actor },
    );
    if (!access.allowed) return forbiddenResponse(access.reason);
  }
  if (
    !ctx.request.headers.get("content-type")?.startsWith("multipart/form-data")
  ) {
    return errorResponse(415, "Expected multipart/form-data.");
  }
  if (ctx.maxBodyBytes !== false) {
    const declared = Number(ctx.request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > ctx.maxBodyBytes) {
      return errorResponse(413, "Payload too large.");
    }
  }
  const form = await ctx.request.formData();
  const candidate = form.get("file");
  // `File` is not a global in every supported Node runtime, while multipart
  // parsers still return a Blob-compatible File object.
  if (
    !(candidate instanceof Blob) ||
    typeof (candidate as File).name !== "string"
  )
    return errorResponse(400, 'Expected a "file" part.');
  const file = candidate as File;
  if (uploadField.maxSize !== undefined && file.size > uploadField.maxSize) {
    return errorResponse(413, "File exceeds the field's maximum size.");
  }
  if (!accepts(file.type, uploadField.accept)) {
    return errorResponse(415, "File type is not accepted by this field.");
  }
  const stored = await storage.put({
    resource: ctx.entry.config.resource.name,
    field: fieldName,
    file,
    actor: ctx.actor,
  });
  return dataResponse(stored, { status: 201 });
}
