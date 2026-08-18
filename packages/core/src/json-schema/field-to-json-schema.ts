import type { FieldSchema } from "../fields/base.js";
import type { DateFieldSchema, DateTimeFieldSchema } from "../fields/date.js";
import type { EmailFieldSchema } from "../fields/email.js";
import type { FileFieldSchema } from "../fields/file.js";
import type { ImageFieldSchema } from "../fields/image.js";
import type { NumberFieldSchema } from "../fields/number.js";
import type { SelectFieldSchema } from "../fields/select.js";
import type { StringLengthConstraints } from "../fields/shared/string-constraints.js";
import type { JsonSchemaValue } from "./json-schema-value.js";

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function applyStringLength(
  target: JsonSchemaValue,
  field: StringLengthConstraints,
): void {
  if (field.minLength !== undefined) {
    target.minLength = field.minLength;
  }
  if (field.maxLength !== undefined) {
    target.maxLength = field.maxLength;
  }
}

function applyDateRange(
  target: JsonSchemaValue,
  field: DateFieldSchema | DateTimeFieldSchema,
): void {
  if (field.min !== undefined) {
    target["x-minimum"] = toIsoString(field.min);
  }
  if (field.max !== undefined) {
    target["x-maximum"] = toIsoString(field.max);
  }
}

function widenNullable(target: JsonSchemaValue, field: FieldSchema): void {
  if (!field.nullable) {
    return;
  }

  if (target.enum) {
    target.enum = [...target.enum, null];
    return;
  }

  if (target.type === undefined) {
    return;
  }

  target.type = Array.isArray(target.type)
    ? [...target.type, "null"]
    : [target.type, "null"];
}

/**
 * Maps a finalized `FieldSchema` to JSON Schema representation.
 * Uses only structural state from the field's builder; never evaluates runtime
 * logic (permissions, custom validators, sibling conditions).
 */
export function fieldToJsonSchema(field: FieldSchema): JsonSchemaValue {
  const schema: JsonSchemaValue = {};

  switch (field.fieldType) {
    case "text":
    case "textarea": {
      schema.type = "string";
      applyStringLength(schema, field as StringLengthConstraints);
      break;
    }
    case "email": {
      const emailField = field as EmailFieldSchema;
      schema.type = "string";
      schema.format = "email";
      applyStringLength(schema, emailField);
      break;
    }
    case "number": {
      const numberField = field as NumberFieldSchema;
      schema.type = "number";
      if (numberField.min !== undefined) {
        schema.minimum = numberField.min;
      }
      if (numberField.max !== undefined) {
        schema.maximum = numberField.max;
      }
      if (numberField.step !== undefined) {
        schema.multipleOf = numberField.step;
      }
      break;
    }
    case "boolean": {
      schema.type = "boolean";
      break;
    }
    case "date": {
      schema.type = "string";
      schema.format = "date";
      applyDateRange(schema, field as DateFieldSchema);
      break;
    }
    case "datetime": {
      schema.type = "string";
      schema.format = "date-time";
      applyDateRange(schema, field as DateTimeFieldSchema);
      break;
    }
    case "select": {
      const selectField = field as SelectFieldSchema;
      if (selectField.options && selectField.options.length > 0) {
        schema.enum = selectField.options.map((option) => option.value);
      }
      break;
    }
    case "file":
    case "image": {
      const uploadField = field as FileFieldSchema | ImageFieldSchema;
      if (uploadField.multiple) {
        schema.type = "array";
        schema.items = { type: "string" };
      } else {
        schema.type = "string";
      }
      if (uploadField.accept) {
        schema["x-accept"] = uploadField.accept;
      }
      if (uploadField.maxSize !== undefined) {
        schema["x-maxSize"] = uploadField.maxSize;
      }
      break;
    }
    default: {
      // Unrecognized/custom field type (via createField()): no known
      // structural mapping, so leave the schema unconstrained rather than
      // fabricating a guarantee.
      break;
    }
  }

  widenNullable(schema, field);

  if (field.defaultValue !== undefined) {
    schema.default = field.defaultValue;
  }
  if (field.description !== undefined) {
    schema.description = field.description;
  }
  if (field.unique) {
    schema["x-unique"] = true;
  }
  if (field.validation) {
    schema["x-hasCustomValidation"] = true;
  }

  return schema;
}
