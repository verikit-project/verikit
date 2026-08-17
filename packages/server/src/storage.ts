/** Durable location returned by a file storage backend. Persist this value in a file field. */
export interface StoredFile {
  url: string;
  key?: string;
  name: string;
  type: string;
  size: number;
}

/** Context supplied to an upload processor before a file reaches storage. */
export interface UploadProcessorInput {
  resource: string;
  field: string;
  file: File;
  actor: unknown;
}

/**
 * Inspects or transforms an upload after field validation and before persistence.
 * Throw `VerikitError` to reject it, or return a sanitized replacement `File`.
 */
export type UploadProcessor = (
  input: UploadProcessorInput,
) => File | Promise<File>;

/**
 * Storage boundary for `file()` and `image()` fields. Implement this with S3,
 * R2, local disk, etc.; the server never decides where bytes live.
 */
export interface FileStorage {
  put(input: {
    resource: string;
    field: string;
    file: File;
    actor: unknown;
  }): Promise<StoredFile>;
}
