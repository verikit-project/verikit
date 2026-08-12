import { checkFieldAccess } from "@verikit/core";
import {
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  dataResponse,
} from "../http/responses.js";
import { readRequestBytes } from "../http/parse-request.js";
import type { HandlerContext } from "./context.js";
import type { FileStorage } from "../storage.js";

interface UploadField {
  fieldType: "file" | "image";
  accept?: readonly string[];
  maxSize?: number;
}

function accepts(
  type: string,
  name: string,
  accepted: readonly string[] | undefined,
): boolean {
  if (!accepted || accepted.length === 0) return true;
  const normalizedType = type.toLowerCase();
  const normalizedName = name.toLowerCase();

  return accepted.some((rule) => {
    const normalizedRule = rule.toLowerCase();
    if (normalizedRule.endsWith("/*")) {
      return normalizedType.startsWith(normalizedRule.slice(0, -1));
    }
    if (normalizedRule.startsWith(".")) {
      return normalizedName.endsWith(normalizedRule);
    }
    return normalizedType === normalizedRule;
  });
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
  const body = await readRequestBytes(ctx.request, ctx.maxBodyBytes);
  if (!body.ok) {
    return errorResponse(413, "Payload too large.");
  }
  // Reconstruct a request only after the bounded read. Drop Content-Length so a
  // bogus client-supplied value cannot affect the platform multipart parser.
  const headers = new Headers(ctx.request.headers);
  headers.delete("content-length");
  const multipartBody = new Uint8Array(body.value).buffer;
  const multipartRequest = new Request(ctx.request.url, {
    method: ctx.request.method,
    headers,
    body: multipartBody,
  });
  const form = await multipartRequest.formData();
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
  if (!accepts(file.type, file.name, uploadField.accept)) {
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
