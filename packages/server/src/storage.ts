/** Durable location returned by a file storage backend. Persist this value in a file field. */
export interface StoredFile {
  url: string;
  key?: string;
  name: string;
  type: string;
  size: number;
}

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
