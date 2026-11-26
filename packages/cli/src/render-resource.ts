import type { FieldSpec } from "./field-spec.js";
import { SCOPED_IMPORTS, type ImportSources } from "./imports.js";
import { sentenceCase } from "./names.js";

const BUILDERS: Record<
  Exclude<FieldSpec["type"], "belongsTo">,
  { call: string; import: string; extras: string }
> = {
  text: { call: "text()", import: "text", extras: ".searchable().sortable()" },
  textarea: { call: "textarea()", import: "textarea", extras: ".searchable()" },
  email: {
    call: "email()",
    import: "email",
    extras: ".searchable().sortable()",
  },
  number: {
    call: "number()",
    import: "number",
    extras: ".sortable().filterable()",
  },
  integer: {
    call: "number().step(1)",
    import: "number",
    extras: ".sortable().filterable()",
  },
  boolean: { call: "boolean()", import: "boolean", extras: ".filterable()" },
  date: { call: "date()", import: "date", extras: ".sortable().filterable()" },
  datetime: {
    call: "datetime()",
    import: "datetime",
    extras: ".sortable().filterable()",
  },
  select: { call: "select()", import: "select", extras: ".filterable()" },
};

function presence(spec: FieldSpec): string {
  if (spec.nullable) {
    return ".nullable()";
  }

  // A checkbox always has a value, so default it instead of requiring it.
  return spec.type === "boolean" ? ".default(false)" : ".required()";
}

function fieldLine(spec: FieldSpec): { line: string; imports: string[] } {
  if (spec.type === "belongsTo") {
    // The relationship picker edits this key, so keep the raw id out of forms and tables.
    return {
      line: `${spec.name}Id: text().label(${JSON.stringify(sentenceCase(spec.name))})${presence(spec)}.formHidden().tableHidden(),`,
      imports: ["text"],
    };
  }

  const builder = BUILDERS[spec.type];
  const options =
    spec.type === "select"
      ? `.options([${spec.options!.map((option) => JSON.stringify(option)).join(", ")}])`
      : "";

  return {
    line: `${spec.name}: ${builder.call}${options}.label(${JSON.stringify(sentenceCase(spec.name))})${presence(spec)}${builder.extras},`,
    imports: [builder.import],
  };
}

/** How a `belongsTo` field refers to its target resource. */
export interface RelationTarget {
  /** Exported const to import, e.g. "user". */
  exportName: string;
  /** File in the resources directory, e.g. "user.ts". */
  file: string;
  /** Field shown in the picker instead of the record id. */
  displayField?: string;
}

/**
 * Source for `resources/<name>.ts`. `resourceName` is already camelCase.
 * `targets` describes every `belongsTo` target other than the resource itself.
 */
export function renderResource(
  resourceName: string,
  specs: readonly FieldSpec[],
  targets: Readonly<Record<string, RelationTarget>> = {},
  imports: ImportSources = SCOPED_IMPORTS,
): string {
  const names = new Set(["defineResource"]);
  const lines = specs.map((spec) => {
    const field = fieldLine(spec);
    field.imports.forEach((name) => names.add(name));
    return `    ${field.line}`;
  });
  const relations = specs.filter((spec) => spec.type === "belongsTo");
  const self: RelationTarget = {
    exportName: resourceName,
    file: "",
    displayField: specs.find(
      (spec) => spec.type === "text" || spec.type === "email",
    )?.name,
  };
  const targetOf = (spec: FieldSpec) =>
    spec.target === resourceName ? self : targets[spec.target!]!;

  if (relations.length > 0) {
    names.add("belongsTo");
  }

  const fields =
    lines.length > 0
      ? `  fields: {\n${lines.join("\n")}\n  },`
      : "  fields: {},";
  const relationships =
    relations.length > 0
      ? `\n  relationships: (field) => ({\n${relations
          .map((spec) => {
            const target = targetOf(spec);
            const display = target.displayField
              ? `.displayField(${JSON.stringify(target.displayField)})`
              : "";
            return `    ${spec.name}: belongsTo(() => ${target.exportName}).label(${JSON.stringify(sentenceCase(spec.name))})${display}.via(field(${JSON.stringify(`${spec.name}Id`)})),`;
          })
          .join("\n")}\n  }),`
      : "";
  const importsByFile = new Map<string, string>();

  for (const spec of relations) {
    const target = targetOf(spec);

    if (target !== self) {
      importsByFile.set(target.file, target.exportName);
    }
  }

  const targetImports = [...importsByFile]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, name]) => `import { ${name} } from "./${file}";\n`)
    .join("");

  return `import { ${[...names].sort().join(", ")} } from "${imports.core}";
${targetImports}
export const ${resourceName} = defineResource(${JSON.stringify(resourceName)}, {
${fields}${relationships}
});
`;
}

/** Source for `actions/<resource>/<action>.ts`. `actionName` is already camelCase. */
export function renderAction(
  resourceName: string,
  actionName: string,
  imports: ImportSources = SCOPED_IMPORTS,
): string {
  return `import { action } from "${imports.runtime}";

// Runs on the server only, so it can use the database and secrets.
// Call it from the browser with:
//   client.resource(${JSON.stringify(resourceName)}).action(${JSON.stringify(actionName)}, input, { recordId })
export const ${actionName} = action(${JSON.stringify(actionName)})
  .label(${JSON.stringify(sentenceCase(actionName))})
  .execute(async ({ record, input }) => {
    // TODO: implement "${actionName}" for ${resourceName}. \`record\` is set
    // when the client passes a recordId; \`input\` holds the form's values.
    console.log(${JSON.stringify(actionName)}, record, input);
    return { ok: true };
  });
`;
}
