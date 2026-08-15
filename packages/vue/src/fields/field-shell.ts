import type { FieldSchema } from "@verikit/core";
import { defineComponent, h, type PropType, type VNodeChild } from "vue";
import { Label } from "#components/label";
import { cn } from "#lib/utils";

/** Props for the shared field wrapper used by Verikit inputs. */
export interface FieldShellProps {
  /** Schema metadata for the rendered field. */
  field: FieldSchema;
  /** Id assigned to the concrete input control. */
  id: string;
  /** Error content rendered below the input. */
  error?: VNodeChild;
  /** Class name applied to the shell container. */
  className?: string;
}

/**
 * Renders a label, description, error message, and field control wrapper.
 */
export const FieldShell = defineComponent({
  name: "FieldShell",
  props: {
    field: { type: Object as PropType<FieldSchema>, required: true },
    id: { type: String, required: true },
    error: { type: null as unknown as PropType<VNodeChild>, default: undefined },
    className: { type: String as PropType<string | undefined>, default: undefined },
  },
  setup(props, { slots }) {
    return () => {
      const descriptionId = props.field.description
        ? `${props.id}-description`
        : undefined;
      const errorId = props.error ? `${props.id}-error` : undefined;

      return h("div", { class: cn("grid gap-2", props.className) }, [
        props.field.label
          ? h(Label, { for: props.id, class: "gap-1" }, () => [
              props.field.label,
              props.field.required
                ? h("span", { class: "text-destructive", "aria-hidden": "true" }, "*")
                : null,
            ])
          : null,
        slots.default?.(),
        props.field.description
          ? h(
              "p",
              { id: descriptionId, class: "text-sm text-muted-foreground" },
              props.field.description,
            )
          : null,
        props.error
          ? h("p", { id: errorId, class: "text-sm text-destructive" }, props.error)
          : null,
      ]);
    };
  },
});

/** Builds ARIA props that connect a field with its description and error. */
export function fieldAriaProps(
  field: FieldSchema,
  id: string,
  error?: VNodeChild,
): {
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
} {
  const describedBy = [
    field.description ? `${id}-description` : undefined,
    error ? `${id}-error` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    "aria-describedby": describedBy || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-required": field.required ? true : undefined,
  };
}

/** Returns the explicit id or derives a stable id from the field name. */
export function fieldId(field: FieldSchema, id?: string): string {
  return id ?? `verikit-field-${field.name}`;
}
