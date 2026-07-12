import { FieldBuilder } from "./base.js";
import {
  FileConstraints,
  withAccept,
  withMaxSize,
  withMultiple,
} from "./shared/file-constraints.js";

/**
 * Schema describing a generic file upload field.
 */
export interface FileFieldSchema extends FileConstraints {
  fieldType: "file";
}

/**
 * Fluent builder for generic file upload fields.
 *
 * File fields store a file reference or upload token. Storage strategy,
 * upload transport, and persistence are intentionally left to adapters.
 */
export class FileFieldBuilder<
  TValue = string | null | undefined,
> extends FieldBuilder<TValue, FileFieldSchema> {
  constructor(
    state: Omit<FileFieldSchema, "type" | "name"> = {
      fieldType: "file",
    },
  ) {
    super(state);
  }

  /**
   * Restrict accepted MIME types or file extensions.
   */
  accept(types: readonly string[]): FileFieldBuilder<TValue> {
    return new FileFieldBuilder(withAccept(this.state, types));
  }

  /**
   * Set the maximum accepted upload size in bytes.
   */
  maxSize(bytes: number): FileFieldBuilder<TValue> {
    return new FileFieldBuilder(withMaxSize(this.state, bytes));
  }

  /**
   * Allow one or many uploaded files.
   */
  multiple(enabled = true): FileFieldBuilder<TValue> {
    return new FileFieldBuilder(withMultiple(this.state, enabled));
  }
}

/**
 * Create a generic file upload field.
 */
export function file(accept?: readonly string[]): FileFieldBuilder {
  return accept ? new FileFieldBuilder().accept(accept) : new FileFieldBuilder();
}
