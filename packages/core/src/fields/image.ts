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
 *
 * Image fields communicate image-specific intent to UI adapters, while
 * keeping storage and upload handling outside the core package.
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

  /**
   * Restrict accepted image MIME types or extensions.
   */
  accept(types: readonly string[]): ImageFieldBuilder<TValue> {
    return new ImageFieldBuilder(withAccept(this.state, types));
  }

  /**
   * Set the maximum accepted upload size in bytes.
   */
  maxSize(bytes: number): ImageFieldBuilder<TValue> {
    return new ImageFieldBuilder(withMaxSize(this.state, bytes));
  }

  /**
   * Allow one or many uploaded images.
   */
  multiple(enabled = true): ImageFieldBuilder<TValue> {
    return new ImageFieldBuilder(withMultiple(this.state, enabled));
  }
}

/**
 * Create an image upload field.
 */
export function image(): ImageFieldBuilder {
  return new ImageFieldBuilder();
}
