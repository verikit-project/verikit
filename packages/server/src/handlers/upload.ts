import {
  checkFieldAccess,
  ForbiddenError,
  matchesAccept,
  NotFoundError,
  ValidationError,
  VerikitError,
} from "@verikit/core";
import { dataResponse } from "../http/responses.js";
import { readRequestBytes } from "../http/parse-request.js";
import { maybeCheckResourceOperation } from "../permissions.js";
import type { HandlerContext } from "./context.js";
import type { FileStorage } from "../storage.js";

interface UploadField {
  fieldType: "file" | "image";
  accept?: readonly string[];
  maxSize?: number;
}

/** Handles `POST {base}/uploads/:field` multipart requests. */
export async function handleUpload(
  ctx: HandlerContext,
  fieldName: string,
  storage: FileStorage | undefined,
): Promise<Response> {
  const field = ctx.entry.fields[fieldName];
  if (!field || (field.fieldType !== "file" && field.fieldType !== "image")) {
    throw new NotFoundError();
  }
  const uploadField = field as typeof field & UploadField;
  if (!storage) {
    throw new VerikitError(
      "File storage is not configured.",
      "NOT_IMPLEMENTED",
      501,
    );
  }
  if (ctx.entry.config.permissions !== "open") {
    const permissions = ctx.entry.config.permissions;
    // Uploads lack record context, so only create permission is checked here;
    // record-dependent update permissions are enforced by the update handler.
    const creatable = await maybeCheckResourceOperation(permissions, "create", {
      actor: ctx.actor,
    });
    if (!creatable.allowed) {
      throw new ForbiddenError(creatable.message);
    }
    const access = await checkFieldAccess(
      permissions.getRuntime(),
      fieldName,
      "write",
      { actor: ctx.actor },
    );
    if (!access.allowed) throw new ForbiddenError(access.reason);
  }
  if (
    !ctx.request.headers.get("content-type")?.startsWith("multipart/form-data")
  ) {
    throw new VerikitError(
      "Expected multipart/form-data.",
      "UNSUPPORTED_MEDIA_TYPE",
      415,
    );
  }
  const body = await readRequestBytes(ctx.request, ctx.maxBodyBytes);
  if (!body.ok) {
    throw new VerikitError("Payload too large.", "PAYLOAD_TOO_LARGE", 413);
  }
  // Reconstruct a request only after the bounded read. Drop Content-Length so a
  // bogus client-supplied value cannot affect the platform multipart parser.
  const headers = new Headers(ctx.request.headers);
  headers.delete("content-length");
  const multipartRequest = new Request(ctx.request.url, {
    method: ctx.request.method,
    headers,
    // `readRequestBytes` returns an exactly-sized ArrayBuffer-backed view,
    // so reuse its buffer without copying the upload.
    body: body.value.buffer as ArrayBuffer,
  });
  const form = await multipartRequest.formData();
  const candidate = form.get("file");
  // `File` is not a global in every supported Node runtime, while multipart
  // parsers still return a Blob-compatible File object.
  if (
    !(candidate instanceof Blob) ||
    typeof (candidate as File).name !== "string"
  )
    throw new ValidationError('Expected a "file" part.');
  const file = candidate as File;
  if (uploadField.maxSize !== undefined && file.size > uploadField.maxSize) {
    throw new VerikitError(
      "File exceeds the field's maximum size.",
      "PAYLOAD_TOO_LARGE",
      413,
    );
  }
  if (
    uploadField.accept &&
    uploadField.accept.length > 0 &&
    !matchesAccept(uploadField.accept, file)
  ) {
    throw new VerikitError(
      "File type is not accepted by this field.",
      "UNSUPPORTED_MEDIA_TYPE",
      415,
    );
  }
  const stored = await storage.put({
    resource: ctx.entry.config.resource.name,
    field: fieldName,
    file,
    actor: ctx.actor,
  });
  return dataResponse(stored, { status: 201 });
}
