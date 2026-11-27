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
 * Fluent builder for image upload fields. Upload transport and storage are handled by adapters.
 */
export class ImageFieldBuilder<
  TValue = string | null | undefined,
> extends FieldBuilder<TValue, ImageFieldSchema> {
  /** Type-only; see `FieldBuilder.$kind`. @internal */
  declare readonly $kind: ImageFieldBuilder<this["$arg"]>;

  constructor(
    state: Omit<ImageFieldSchema, "type" | "name"> = {
      fieldType: "image",
      accept: ["image/*"],
    },
  ) {
    super(state);
  }

  /** Restricts accepted image MIME types or extensions. */
  accept(types: readonly string[]): this {
    return this.withPatch(withAccept(this.state, types));
  }

  /** Sets the maximum accepted upload size in bytes. */
  maxSize(bytes: number): this {
    return this.withPatch(withMaxSize(this.state, bytes));
  }

  /** Restricts the field back to a single uploaded image. */
  multiple(
    enabled: false,
  ): FieldBuilderWithValue<
    this,
    ToSingleFileValue<this["$value"]>,
    ImageFieldSchema
  >;
  /** Allows one or many uploaded images, widening the value to an array. */
  multiple(
    enabled?: true,
  ): FieldBuilderWithValue<
    this,
    ToMultipleFileValue<this["$value"]>,
    ImageFieldSchema
  >;
  multiple(
    enabled = true,
  ): FieldBuilderWithValue<
    this,
    ToMultipleFileValue<this["$value"]> | ToSingleFileValue<this["$value"]>,
    ImageFieldSchema
  > {
    return this.withState<
      ToMultipleFileValue<this["$value"]> | ToSingleFileValue<this["$value"]>
    >(withMultiple(this.state, enabled));
  }
}

/** Creates an image upload field. */
export function image(): ImageFieldBuilder {
  return new ImageFieldBuilder();
}
