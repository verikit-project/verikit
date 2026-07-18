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
 * Schema describing an image upload field.
 */
export interface ImageFieldSchema extends FileConstraints {
  fieldType: "image";
}

/**
 * Fluent builder for image upload fields.
 * Upload transport and storage are handled by adapters.
 */
export class ImageFieldBuilder<
  TValue = string | null | undefined,
> extends FieldBuilder<TValue, ImageFieldSchema> {
  constructor(
    state: Omit<ImageFieldSchema, "type" | "name"> = {
      fieldType: "image",
      accept: ["image/*"],
    },
  ) {
    super(state);
  }

  /** Restricts accepted image MIME types or extensions. */
  accept(
    types: readonly string[],
  ): FieldBuilderWithValue<this, TValue, ImageFieldSchema> {
    return this.withState(withAccept(this.state, types));
  }

  /** Sets the maximum accepted upload size in bytes. */
  maxSize(
    bytes: number,
  ): FieldBuilderWithValue<this, TValue, ImageFieldSchema> {
    return this.withState(withMaxSize(this.state, bytes));
  }

  /** Restricts the field back to a single uploaded image. */
  multiple(
    enabled: false,
  ): FieldBuilderWithValue<this, ToSingleFileValue<TValue>, ImageFieldSchema>;
  /** Allows one or many uploaded images, widening the value to an array. */
  multiple(
    enabled?: true,
  ): FieldBuilderWithValue<this, ToMultipleFileValue<TValue>, ImageFieldSchema>;
  multiple(
    enabled = true,
  ): FieldBuilderWithValue<
    this,
    ToMultipleFileValue<TValue> | ToSingleFileValue<TValue>,
    ImageFieldSchema
  > {
    return this.withState<
      ToMultipleFileValue<TValue> | ToSingleFileValue<TValue>
    >(withMultiple(this.state, enabled));
  }
}

/** Creates an image upload field. */
export function image(): ImageFieldBuilder {
  return new ImageFieldBuilder();
}
