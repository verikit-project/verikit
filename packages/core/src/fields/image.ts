import { FieldBuilder } from "./base.js";
import {
  FileConstraints,
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
  accept(types: readonly string[]): ImageFieldBuilder<TValue> {
    return new ImageFieldBuilder(withAccept(this.state, types));
  }

  /** Sets the maximum accepted upload size in bytes. */
  maxSize(bytes: number): ImageFieldBuilder<TValue> {
    return new ImageFieldBuilder(withMaxSize(this.state, bytes));
  }

  /** Allows one or many uploaded images. */
  multiple(enabled = true): ImageFieldBuilder<TValue> {
    return new ImageFieldBuilder(withMultiple(this.state, enabled));
  }
}

/** Creates an image upload field. */
export function image(): ImageFieldBuilder {
  return new ImageFieldBuilder();
}
