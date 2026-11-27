import { FieldBuilder, FieldBuilderWithValue } from "./base.js";
import {
  FileConstraints,
  ToMultipleFileValue,
  ToSingleFileValue,
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
 * Fluent builder for file upload fields. Storage strategy, upload transport, and persistence are intentionally left to adapters.
 */
export class FileFieldBuilder<
  TValue = string | null | undefined,
> extends FieldBuilder<TValue, FileFieldSchema> {
  /** Type-only; see `FieldBuilder.$kind`. @internal */
  declare readonly $kind: FileFieldBuilder<this["$arg"]>;

  constructor(
    state: Omit<FileFieldSchema, "type" | "name"> = {
      fieldType: "file",
    },
  ) {
    super(state);
  }

  /** Restricts accepted MIME types or file extensions. */
  accept(types: readonly string[]): this {
    return this.withPatch(withAccept(this.state, types));
  }

  /** Sets the maximum accepted upload size in bytes. */
  maxSize(bytes: number): this {
    return this.withPatch(withMaxSize(this.state, bytes));
  }

  /** Restricts the field back to a single uploaded file. */
  multiple(
    enabled: false,
  ): FieldBuilderWithValue<
    this,
    ToSingleFileValue<this["$value"]>,
    FileFieldSchema
  >;
  /** Allows one or many uploaded files, widening the value to an array. */
  multiple(
    enabled?: true,
  ): FieldBuilderWithValue<
    this,
    ToMultipleFileValue<this["$value"]>,
    FileFieldSchema
  >;
  multiple(
    enabled = true,
  ): FieldBuilderWithValue<
    this,
    ToMultipleFileValue<this["$value"]> | ToSingleFileValue<this["$value"]>,
    FileFieldSchema
  > {
    return this.withState<
      ToMultipleFileValue<this["$value"]> | ToSingleFileValue<this["$value"]>
    >(withMultiple(this.state, enabled));
  }
}

/** Creates a file upload field. */
export function file(): FileFieldBuilder {
  return new FileFieldBuilder();
}
