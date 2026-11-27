import type { BelongsToRelationshipSchema } from "@verikit/core";
import { defineComponent, h, ref, type PropType, type VNodeChild } from "vue";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "#components/combobox";
import { Label } from "#components/label";
import { cn } from "#lib/utils";
import { useRelationshipPicker } from "./use-relationship-picker.js";

function valueString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * Renders a `belongsTo` relationship as a permission-aware, searchable
 * combobox, reading and writing the related record's ID through its `.via()`
 * field. Typing searches the server (the target's `displayField` and
 * `.searchable()` fields), options load 25 at a time with "Load more", and the
 * selected record's label is shown even when it isn't among the loaded
 * options.
 */
export const BelongsToRelationshipField = defineComponent({
  name: "BelongsToRelationshipField",
  props: {
    relationship: {
      type: Object as PropType<BelongsToRelationshipSchema>,
      required: true,
    },
    /**
     * Name of the resource that owns the relationship (the one being edited).
     * Options come from its `/relationships/:name` route. Defaults to the
     * target resource, which only matches for a self-referencing relationship.
     */
    resourceName: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    id: { type: String as PropType<string | undefined>, default: undefined },
    /** Current foreign-key value (the selected record's id), if any. */
    value: { type: null as unknown as PropType<unknown>, required: false },
    /** Error content shown below the picker and linked with ARIA. */
    error: { type: null as unknown as PropType<VNodeChild>, required: false },
    /** Disables the picker. */
    disabled: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    /** Marks the picker as read-only. */
    readOnly: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    /** Class name applied to the outer wrapper. */
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    /** Called with the next foreign-key value (or `null` when cleared). */
    onValueChange: {
      type: Function as PropType<((value: string | null) => void) | undefined>,
      default: undefined,
    },
    /** Called when the picker's input loses focus. */
    onBlur: {
      type: Function as PropType<(() => void) | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    // While the popup is open the input holds what's typed (the selected
    // record's label stays visible as the placeholder); closed, it shows that
    // label.
    const open = ref(false);
    const search = ref("");
    // Created once in setup: calling composables during render would add
    // watchers on every update.
    const picker = useRelationshipPicker({
      resourceName: props.resourceName ?? props.relationship.resource,
      relationship: props.relationship,
      value: () => valueString(props.value),
      search,
    });

    function handleOpenChange(next: boolean): void {
      // A read-only picker still opens on arrow keys; keep it shut.
      if (next && props.readOnly === true) return;
      open.value = next;
      if (!next) search.value = "";
    }

    return () => {
      const inputId =
        props.id ??
        `verikit-relationship-${props.relationship.resource}-${props.relationship.name ?? ""}`;
      const errorId = props.error ? `${inputId}-error` : undefined;
      const currentValue = valueString(props.value);
      const selectedLabel = currentValue ? picker.labelFor(currentValue) : "";
      const editable = props.disabled !== true && props.readOnly !== true;

      return h("div", { class: cn("grid gap-2", props.className) }, [
        props.relationship.label
          ? h(
              Label,
              { for: inputId },
              { default: () => props.relationship.label },
            )
          : null,
        h(
          Combobox,
          {
            value: currentValue === "" ? null : currentValue,
            open: open.value,
            // Options are already searched on the server.
            ignoreFilter: true,
            name: props.relationship.name,
            disabled: props.disabled === true,
            onOpenChange: handleOpenChange,
            onValueChange: (next: string | null) => props.onValueChange?.(next),
          },
          {
            default: () => [
              h(ComboboxInput, {
                id: inputId,
                value: open.value ? search.value : selectedLabel,
                placeholder: picker.isLoading.value
                  ? "Loading…"
                  : selectedLabel || "Search…",
                showClear: editable && currentValue !== "",
                readOnly: props.readOnly === true,
                onInputValueChange: (text: string) => {
                  search.value = text;
                },
                onBlur: props.onBlur,
                "aria-describedby": errorId,
                "aria-invalid": props.error ? true : undefined,
              }),
              h(
                ComboboxContent,
                {},
                {
                  // Read reactive state inside these slots, not above: Reka's
                  // popper content is memoized, so only its own re-renders
                  // pick up newly loaded options.
                  default: () => [
                    h(
                      ComboboxEmpty,
                      {},
                      {
                        default: () =>
                          picker.isLoading.value ? "Loading…" : "No matches.",
                      },
                    ),
                    h(
                      ComboboxList,
                      {},
                      {
                        default: () =>
                          picker.ids.value.map((optionId) =>
                            h(
                              ComboboxItem,
                              { key: optionId, value: optionId },
                              { default: () => picker.labelFor(optionId) },
                            ),
                          ),
                      },
                    ),
                    picker.hasMore.value
                      ? h(
                          "button",
                          {
                            type: "button",
                            class:
                              "w-full rounded-md px-1.5 py-1 text-left text-sm text-muted-foreground hover:bg-accent disabled:opacity-50",
                            disabled: picker.isLoadingMore.value,
                            onClick: picker.loadMore,
                          },
                          picker.isLoadingMore.value ? "Loading…" : "Load more",
                        )
                      : null,
                  ],
                },
              ),
            ],
          },
        ),
        props.error
          ? h(
              "p",
              { id: errorId, class: "text-sm text-destructive" },
              props.error,
            )
          : null,
        picker.error.value
          ? h(
              "p",
              { role: "alert", class: "text-sm text-destructive" },
              picker.error.value.message,
            )
          : null,
      ]);
    };
  },
});
