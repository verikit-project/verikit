import assert from "node:assert/strict";
import test from "node:test";
import {
  boolean,
  createField,
  date,
  datetime,
  email,
  file,
  FileFieldBuilder,
  from,
  type FieldSchema,
  image,
  number,
  NumberFieldBuilder,
  select,
  text,
  TextFieldBuilder,
  textarea,
  toggle,
  type InferField,
} from "../../src/fields/index.js";
import {
  withAccept,
  withMaxSize,
  withMultiple,
} from "../../src/fields/shared/file-constraints.js";
import { normalizeOptions } from "../../src/fields/shared/options.js";
import {
  withMaxLength,
  withMinLength,
} from "../../src/fields/shared/string-constraints.js";
import { cloneValue, isPlainObject } from "../../src/utils/clone.js";

test("base field builder applies universal schema metadata", () => {
  const schema = text()
    .label("Name")
    .description("Display name")
    .placeholder("Ada Lovelace")
    .required()
    .default("Anonymous")
    .searchable()
    .sortable()
    .hidden()
    .readOnly()
    .meta({ component: "compact" })
    .toSchema("name");

  assert.deepEqual(schema, {
    type: "field",
    name: "name",
    fieldType: "text",
    label: "Name",
    description: "Display name",
    placeholder: "Ada Lovelace",
    required: true,
    nullable: false,
    defaultValue: "Anonymous",
    searchable: true,
    sortable: true,
    hidden: true,
    readOnly: true,
    meta: { component: "compact" },
  });
});

test("field names must be non-empty when finalized", () => {
  assert.throws(() => text().toSchema(""), /non-empty/);
  assert.throws(() => text().toSchema("   "), /non-empty/);
});

test("createField keeps the explicit fieldType authoritative", () => {
  const schema = createField<string>("email", {
    fieldType: "text",
  }).toSchema("email");

  assert.equal(schema.fieldType, "email");
});

test("default values cannot be undefined", () => {
  assert.throws(
    () =>
      createField<string | undefined>("text").default(
        // @ts-expect-error undefined defaults contradict the narrowed return type.
        undefined,
      ),
    /Default value cannot be undefined/,
  );

  const schema = createField<string | undefined>("text")
    .default("ready")
    .toSchema("status");

  assert.equal(schema.defaultValue, "ready");
});

test("default values must satisfy existing field constraints", () => {
  assert.throws(
    () => text().max(5).default("too long"),
    /Default value does not satisfy field constraints: Must be at most 5 characters\./,
  );
  assert.throws(
    () => text().default(123 as unknown as string),
    /Default value does not satisfy field constraints: Must be a string\./,
  );
  assert.throws(
    () => email().default("not-an-email"),
    /Default value does not satisfy field constraints: Must be a valid email address\./,
  );
  assert.throws(
    () => number().min(1).max(10).default(0),
    /Default value does not satisfy field constraints: Must be at least 1\./,
  );
  assert.throws(
    () => number().max(10).default(11),
    /Default value does not satisfy field constraints: Must be at most 10\./,
  );
  assert.throws(
    () => number().default(Number.POSITIVE_INFINITY),
    /Default value does not satisfy field constraints: Must be a finite number\./,
  );
  assert.throws(
    () => number().default("5" as unknown as number),
    /Default value does not satisfy field constraints: Must be a number\./,
  );
  assert.throws(
    () => select<string>().default("draft"),
    /Default value does not satisfy field constraints: Select fields must define at least one option\./,
  );
  assert.throws(
    () =>
      select<string>()
        .options(["draft", "live"])
        .default("archived" as "draft"),
    /Default value does not satisfy field constraints: Must be one of the allowed options\./,
  );
  assert.throws(
    () => text().default(null),
    /Default value does not satisfy field constraints: This field cannot be null\./,
  );
  assert.throws(
    () => date().default("not-a-date"),
    /Default value does not satisfy field constraints: Must be a valid date\./,
  );
  assert.throws(
    () => date().default(0 as unknown as Date),
    /Default value does not satisfy field constraints: Must be a valid date\./,
  );
  assert.throws(
    () => boolean().default("true" as unknown as boolean),
    /Default value does not satisfy field constraints: Must be a boolean\./,
  );
});

test("later field constraints must still accept an existing default value", () => {
  assert.throws(
    () => text().default("too long").max(5),
    /Default value does not satisfy field constraints: Must be at most 5 characters\./,
  );
  assert.throws(
    () => number().default(3).step(2),
    /Default value does not satisfy field constraints: Must be a multiple of 2\./,
  );

  assert.equal(text().default("ok").max(5).toSchema("name").defaultValue, "ok");
  assert.equal(
    email().default("ada@example.com").toSchema("email").defaultValue,
    "ada@example.com",
  );
  assert.equal(number().default(4).step(2).toSchema("count").defaultValue, 4);
  assert.equal(boolean().default(false).toSchema("active").defaultValue, false);
  assert.equal(
    date().default("2026-07-24").toSchema("startsOn").defaultValue,
    "2026-07-24",
  );
  assert.equal(
    file().default("uploads/report.pdf").toSchema("report").defaultValue,
    "uploads/report.pdf",
  );
  assert.deepEqual(
    createField<unknown>("custom" as FieldSchema["fieldType"])
      .default({ adapter: true })
      .toSchema("custom").defaultValue,
    { adapter: true },
  );
});

test("getState returns pre-finalized state without exposing mutable internals", () => {
  const builder = text().label("Name");
  const state = builder.getState();

  state.label = "Changed";

  assert.equal(builder.toSchema("name").label, "Name");
  assert.equal("name" in state, false);
  assert.equal("type" in state, false);
});

test("builder state snapshots caller-owned objects and arrays", () => {
  const meta = { component: "compact" };
  const options = [{ label: "One", value: 1 }];
  const accept = ["application/pdf"];
  const column = { table: "users", column: "email" };

  const metaSchema = text().meta(meta).toSchema("name");
  const selectSchema = select<number>().options(options).toSchema("rank");
  const fileBuilder = file().accept(accept);
  const sourcedBuilder = from(column).as(email());

  meta.component = "wide";
  options[0] = { label: "Two", value: 2 };
  accept[0] = "text/plain";
  column.column = "username";

  assert.deepEqual(metaSchema.meta, { component: "compact" });
  assert.deepEqual(selectSchema.options, [{ label: "One", value: 1 }]);
  assert.deepEqual(fileBuilder.toSchema("attachment").accept, [
    "application/pdf",
  ]);
  assert.deepEqual(sourcedBuilder.toSchema("email").source, {
    mode: "consume",
    column: { table: "users", column: "email" },
  });
});

test("builder state snapshots caller-owned Date defaults", () => {
  const published = new Date("2020-01-01T00:00:00.000Z");

  const schema = date().default(published).toSchema("publishedAt");

  published.setUTCFullYear(1999);

  assert.notEqual(schema.defaultValue, published);
  assert.deepEqual(schema.defaultValue, new Date("2020-01-01T00:00:00.000Z"));
});

test("clone utilities recognize null-prototype objects and preserve class instances", () => {
  class ColumnRef {
    constructor(readonly name: string) {}
  }

  const nullPrototype = Object.create(null) as { column?: string };
  nullPrototype.column = "email";
  const columnRef = new ColumnRef("email");

  const clonedNullPrototype = cloneValue(nullPrototype);
  const clonedColumnRef = cloneValue(columnRef);

  assert.equal(isPlainObject(nullPrototype), true);
  assert.equal(isPlainObject(columnRef), false);
  assert.deepEqual(clonedNullPrototype, { column: "email" });
  assert.notEqual(clonedNullPrototype, nullPrototype);
  assert.equal(clonedColumnRef, columnRef);
});

test("base modifiers preserve concrete string field methods", () => {
  const textSchema = text()
    .label("Title")
    .required()
    .min(2)
    .max(120)
    .toSchema("title");
  const textareaSchema = textarea()
    .description("Body")
    .nullable()
    .min(10)
    .max(1000)
    .toSchema("body");
  const emailSchema = email()
    .placeholder("person@example.com")
    .required()
    .max(255)
    .toSchema("email");

  assert.equal(textSchema.fieldType, "text");
  assert.equal(textSchema.minLength, 2);
  assert.equal(textSchema.maxLength, 120);
  assert.equal(textSchema.required, true);

  assert.equal(textareaSchema.fieldType, "textarea");
  assert.equal(textareaSchema.nullable, true);
  assert.equal(textareaSchema.minLength, 10);
  assert.equal(textareaSchema.maxLength, 1000);

  assert.equal(emailSchema.fieldType, "email");
  assert.equal(emailSchema.format, "email");
  assert.equal(emailSchema.maxLength, 255);
});

test("number field supports numeric constraints after base modifiers", () => {
  const schema = number()
    .label("Age")
    .required()
    .min(0)
    .max(130)
    .step(1)
    .toSchema("age");

  assert.deepEqual(schema, {
    type: "field",
    name: "age",
    fieldType: "number",
    label: "Age",
    required: true,
    nullable: false,
    min: 0,
    max: 130,
    step: 1,
  });
});

test("boolean and toggle fields produce boolean schemas", () => {
  assert.deepEqual(boolean().default(false).toSchema("active"), {
    type: "field",
    name: "active",
    fieldType: "boolean",
    defaultValue: false,
  });

  assert.equal(toggle().toSchema("enabled").fieldType, "boolean");
});

test("date fields produce date and datetime schemas", () => {
  assert.equal(date().label("Birthday").toSchema("birthday").fieldType, "date");
  assert.equal(
    datetime().readOnly().toSchema("publishedAt").fieldType,
    "datetime",
  );
});

test("date and datetime fields support min/max range constraints", () => {
  const dateSchema = date()
    .label("Starts on")
    .min("2020-01-01")
    .max("2020-12-31")
    .toSchema("startsOn");
  const datetimeSchema = datetime()
    .min(new Date("2020-01-01T00:00:00.000Z"))
    .max(new Date("2020-01-02T00:00:00.000Z"))
    .toSchema("publishedAt");

  assert.equal(dateSchema.min, "2020-01-01");
  assert.equal(dateSchema.max, "2020-12-31");
  assert.deepEqual(datetimeSchema.min, new Date("2020-01-01T00:00:00.000Z"));
  assert.deepEqual(datetimeSchema.max, new Date("2020-01-02T00:00:00.000Z"));
});

test("file and image fields expose upload constraints through builder methods", () => {
  const fileSchema = file()
    .accept(["application/pdf"])
    .maxSize(1024)
    .multiple()
    .toSchema("attachment");
  const imageSchema = image()
    .label("Avatar")
    .maxSize(2048)
    .multiple(false)
    .toSchema("avatar");
  const pngOnlyImageSchema = image().accept(["image/png"]).toSchema("photo");

  assert.deepEqual(fileSchema, {
    type: "field",
    name: "attachment",
    fieldType: "file",
    accept: ["application/pdf"],
    maxSize: 1024,
    multiple: true,
  });

  assert.equal(imageSchema.fieldType, "image");
  assert.deepEqual(imageSchema.accept, ["image/*"]);
  assert.equal(imageSchema.maxSize, 2048);
  assert.equal(imageSchema.multiple, false);
  assert.deepEqual(pngOnlyImageSchema.accept, ["image/png"]);
});

test("multiple() widens the inferred field value to an array, matching array validation", () => {
  const single = file();
  const multi = file().multiple();
  const backToSingle = file().multiple().multiple(false);
  const requiredMulti = file().required().multiple();
  const nullableMulti = file().nullable().multiple();

  const singleValue: InferField<typeof single> = "uploads/report.pdf";
  const multiValue: InferField<typeof multi> = [
    "uploads/a.pdf",
    "uploads/b.pdf",
  ];
  const backToSingleValue: InferField<typeof backToSingle> =
    "uploads/report.pdf";
  const requiredMultiValue: InferField<typeof requiredMulti> = [
    "uploads/a.pdf",
  ];
  const nullableMultiValue: InferField<typeof nullableMulti> = null;

  assert.equal(single.toSchema("doc").multiple, undefined);
  assert.equal(multi.toSchema("doc").multiple, true);
  assert.equal(backToSingle.toSchema("doc").multiple, false);
  assert.equal(requiredMulti.toSchema("doc").multiple, true);
  assert.equal(nullableMulti.toSchema("doc").multiple, true);
  assert.equal(singleValue, "uploads/report.pdf");
  assert.deepEqual(multiValue, ["uploads/a.pdf", "uploads/b.pdf"]);
  assert.equal(backToSingleValue, "uploads/report.pdf");
  assert.deepEqual(requiredMultiValue, ["uploads/a.pdf"]);
  assert.equal(nullableMultiValue, null);
});

test("select field normalizes primitive and labelled options", () => {
  const primitiveSchema = select<string>()
    .label("Breed")
    .options(["siamese", "tabby"])
    .toSchema("breed");
  const labelledSchema = select<number>()
    .options([
      { label: "One", value: 1 },
      { label: "Two", value: 2 },
    ])
    .toSchema("rank");

  assert.deepEqual(primitiveSchema.options, [
    { label: "siamese", value: "siamese" },
    { label: "tabby", value: "tabby" },
  ]);
  assert.deepEqual(labelledSchema.options, [
    { label: "One", value: 1 },
    { label: "Two", value: 2 },
  ]);
});

test("from attaches consume-mode column source without finalizing the field", () => {
  const column = { table: "users", column: "email" };
  const schema = from(column)
    .as(email().label("Email").required())
    .toSchema("email");

  assert.equal(schema.fieldType, "email");
  assert.equal(schema.label, "Email");
  assert.equal(schema.required, true);
  assert.deepEqual(schema.source, {
    mode: "consume",
    column,
  });
});

test("from as() preserves type-specific field modifiers", () => {
  const emailColumn = { table: "users", column: "email" };
  const fileColumn = { table: "documents", column: "attachment" };

  const emailSchema = from(emailColumn).as(email()).max(255).toSchema("email");
  const fileSchema = from(fileColumn)
    .as(file())
    .maxSize(1024)
    .multiple()
    .toSchema("attachment");

  assert.equal(emailSchema.fieldType, "email");
  assert.equal(emailSchema.maxLength, 255);
  assert.deepEqual(emailSchema.source, {
    mode: "consume",
    column: emailColumn,
  });

  assert.equal(fileSchema.fieldType, "file");
  assert.equal(fileSchema.maxSize, 1024);
  assert.equal(fileSchema.multiple, true);
  assert.deepEqual(fileSchema.source, {
    mode: "consume",
    column: fileColumn,
  });
});

test("from is not directly finalizable as a field", () => {
  const sourced = from({ table: "users", column: "email" });

  assert.equal("toSchema" in sourced, false);
});

test("from options shortcut creates a sourced select field", () => {
  const column = { table: "cats", column: "breed" };
  const schema = from(column).options(["siamese", "tabby"]).toSchema("breed");

  assert.equal(schema.fieldType, "select");
  assert.deepEqual(schema.options, [
    { label: "siamese", value: "siamese" },
    { label: "tabby", value: "tabby" },
  ]);
  assert.deepEqual(schema.source, {
    mode: "consume",
    column,
  });
});

test("validation can transform the inferred field value and stores the validator", () => {
  const validation = {
    parse(value: unknown) {
      return String(value).trim();
    },
  };
  const builder = text().validation(validation);
  const inferred: InferField<typeof builder> = "trimmed";
  const schema = builder.toSchema("name");

  assert.equal(inferred, "trimmed");
  assert.equal(schema.validation, validation);
  assert.equal(schema.validation?.parse?.("  padded  "), "padded");
});

test("standard schema validation narrows inferred output type", () => {
  const builder = text().validation({
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value: unknown) => ({
        value: Number(value),
      }),
    },
  });
  const inferred: InferField<typeof builder> = 42;
  const schema = builder.toSchema("count");

  assert.equal(inferred, 42);
  assert.equal(schema.validation?.["~standard"]?.vendor, "test");
  assert.deepEqual(schema.validation?.["~standard"]?.validate("42"), {
    value: 42,
  });
});

test("shared helpers return copied state with requested changes", () => {
  const base = {
    fieldType: "text" as const,
    label: "Name",
    minLength: undefined,
    maxLength: undefined,
  };

  assert.deepEqual(withMinLength(base, 2), {
    fieldType: "text",
    label: "Name",
    minLength: 2,
    maxLength: undefined,
  });
  assert.deepEqual(withMaxLength(base, 10), {
    fieldType: "text",
    label: "Name",
    minLength: undefined,
    maxLength: 10,
  });
  assert.deepEqual(
    withAccept({ fieldType: "file" as const, accept: undefined }, ["text/csv"]),
    {
      fieldType: "file",
      accept: ["text/csv"],
    },
  );
  assert.deepEqual(
    withMaxSize({ fieldType: "file" as const, maxSize: undefined }, 512),
    {
      fieldType: "file",
      maxSize: 512,
    },
  );
  assert.deepEqual(
    withMultiple({ fieldType: "file" as const, multiple: undefined }, true),
    {
      fieldType: "file",
      multiple: true,
    },
  );
  assert.deepEqual(normalizeOptions(["a", 2, true]), [
    { label: "a", value: "a" },
    { label: "2", value: 2 },
    { label: "true", value: true },
  ]);
});

test("shared helpers do not mutate source state", () => {
  const state = { fieldType: "file" as const, accept: undefined };
  const updated = withAccept(state, ["text/csv"]);

  assert.deepEqual(state, {
    fieldType: "file",
    accept: undefined,
  });
  assert.notEqual(updated, state);
});

test("field constraints reject invalid values and ranges", () => {
  assert.throws(() => text().min(-1), /minLength/);
  assert.throws(() => text().max(1.5), /maxLength/);
  assert.throws(() => text().min(3).max(2), /minLength/);
  assert.throws(() => email().max(2).min(3), /minLength/);
  assert.throws(() => number().min(Number.NaN), /min/);
  assert.throws(() => number().min(10).max(5), /min/);
  assert.throws(() => number().step(0), /step/);
  assert.throws(() => date().min("not-a-date"), /valid date/);
  assert.throws(() => date().max("2020-01-01").min("2020-06-01"), /later/);
  assert.throws(() => file().accept([""]), /non-empty/);
  assert.throws(() => image().maxSize(-1), /maxSize/);
});

test("type-specific modifiers preserve subclass identity like base modifiers do", () => {
  class CurrencyFieldBuilder<
    TValue = number | null | undefined,
  > extends NumberFieldBuilder<TValue> {
    isCurrency(): true {
      return true;
    }
  }
  class SlugFieldBuilder<
    TValue = string | null | undefined,
  > extends TextFieldBuilder<TValue> {
    isSlug(): true {
      return true;
    }
  }
  class AttachmentFieldBuilder<
    TValue = string | null | undefined,
  > extends FileFieldBuilder<TValue> {
    isAttachment(): true {
      return true;
    }
  }

  const currencyBuilder = new CurrencyFieldBuilder()
    .label("Price")
    .min(0)
    .max(100)
    .step(0.01);
  const slugBuilder = new SlugFieldBuilder().required().min(1).max(80);
  const attachmentBuilder = new AttachmentFieldBuilder()
    .accept(["application/pdf"])
    .maxSize(1024)
    .multiple();

  assert.ok(currencyBuilder instanceof CurrencyFieldBuilder);
  assert.equal(currencyBuilder.isCurrency(), true);
  assert.ok(slugBuilder instanceof SlugFieldBuilder);
  assert.equal(slugBuilder.isSlug(), true);
  assert.ok(attachmentBuilder instanceof AttachmentFieldBuilder);
  assert.equal(attachmentBuilder.isAttachment(), true);

  assert.deepEqual(currencyBuilder.toSchema("price"), {
    type: "field",
    name: "price",
    fieldType: "number",
    label: "Price",
    min: 0,
    max: 100,
    step: 0.01,
  });
});

test("createField remains available for custom core field construction", () => {
  const schema = createField<string>("text")
    .label("Custom")
    .nullable()
    .toSchema("custom");

  assert.equal(schema.fieldType, "text");
  assert.equal(schema.label, "Custom");
  assert.equal(schema.nullable, true);
});

test("shared field-constraint helpers are reachable from the public fields barrel", async () => {
  // These live alongside `withAccept`/`withMaxSize`/`withMultiple` (already
  // exported here) but were previously only importable via their deep
  // `shared/*.js` paths — an asymmetry in the barrel, not an intentional
  // internal/public split.
  const barrel: Record<string, unknown> =
    await import("../../src/fields/index.js");

  for (const name of [
    "withMinLength",
    "withMaxLength",
    "normalizeOptions",
    "withMinDate",
    "withMaxDate",
  ]) {
    assert.equal(typeof barrel[name], "function", `${name} should be exported`);
  }
});
