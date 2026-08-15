import type { BelongsToRelationshipSchema } from "@verikit/core";
import { defineComponent, h, type PropType, type VNodeChild } from "vue";
import { Label } from "#components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/select";
import { cn } from "#lib/utils";
import { useResourceRelationship } from "../query/use-resource-queries.js";

// Matches the server's maximum list page size, so a picker is not silently
// limited to its ordinary table-page default (currently 25 records).
const RELATIONSHIP_PICKER_PAGE_SIZE = 100;

function recordId(record: Record<string, unknown>): string {
  return String(record.id);
}

function recordLabel(
  record: Record<string, unknown>,
  displayField: string | undefined,
): string {
  const raw = displayField ? record[displayField] : undefined;

  return raw === null || raw === undefined ? recordId(record) : String(raw);
}

/**
 * Renders a `belongsTo` relationship as a permission-aware combobox,
 * reading and writing the related record's ID through its `.via()` field.
 */
export const BelongsToRelationshipField = defineComponent({
  name: "BelongsToRelationshipField",
  props: {
    relationship: {
      type: Object as PropType<BelongsToRelationshipSchema>,
      required: true,
    },
    id: { type: String as PropType<string | undefined>, default: undefined },
    value: { type: Object as unknown as PropType<unknown>, default: undefined },
    error: { type: Object as unknown as PropType<VNodeChild>, default: undefined },
    disabled: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    readOnly: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    className: { type: String as PropType<string | undefined>, default: undefined },
    onValueChange: {
      type: Function as PropType<((value: string | null) => void) | undefined>,
      default: undefined,
    },
    onBlur: { type: Function as PropType<(() => void) | undefined>, default: undefined },
  },
  setup(props) {
    return () => {
      const relationshipName = props.relationship.name ?? "";
      const inputId =
        props.id ??
        `verikit-relationship-${props.relationship.resource}-${relationshipName}`;
      const errorId = props.error ? `${inputId}-error` : undefined;
      const relationshipQuery = useResourceRelationship<Record<string, unknown>>(
        props.relationship.resource,
        relationshipName,
        { pageSize: RELATIONSHIP_PICKER_PAGE_SIZE },
        { enabled: relationshipName.length > 0 },
      );
      const records = relationshipQuery.data.value?.records ?? [];
      const currentValue =
        props.value === null || props.value === undefined ? "" : String(props.value);

      return h("div", { class: cn("grid gap-2", props.className) }, [
        props.relationship.label
          ? h(Label, { for: inputId }, { default: () => props.relationship.label })
          : null,
        h(
          Select,
          {
            name: relationshipName,
            value: currentValue,
            disabled: props.disabled === true,
            onValueChange: props.onValueChange,
          },
          {
            default: () => [
              h(
                SelectTrigger,
                {
                  id: inputId,
                  class: "w-full",
                  onBlur: props.onBlur,
                  "aria-describedby": errorId,
                  "aria-invalid": props.error ? true : undefined,
                },
                {
                  default: () =>
                    h(SelectValue, {
                      placeholder: relationshipQuery.isLoading.value ? "Loading…" : "Select…",
                    }),
                },
              ),
              h(SelectContent, {}, {
                default: () =>
                  records.map((record) =>
                    h(
                      SelectItem,
                      { key: recordId(record), value: recordId(record) },
                      { default: () => recordLabel(record, props.relationship.displayField) },
                    ),
                  ),
              }),
            ],
          },
        ),
        props.error
          ? h("p", { id: errorId, class: "text-sm text-destructive" }, props.error)
          : null,
        relationshipQuery.error.value
          ? h(
              "p",
              { role: "alert", class: "text-sm text-destructive" },
              relationshipQuery.error.value.message,
            )
          : null,
      ]);
    };
  },
});
