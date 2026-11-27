import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-vue-next";
import {
  ComboboxAnchor,
  ComboboxCancel,
  ComboboxContent as RekaComboboxContent,
  ComboboxEmpty as RekaComboboxEmpty,
  ComboboxInput as RekaComboboxInput,
  ComboboxItem as RekaComboboxItem,
  ComboboxItemIndicator,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from "reka-ui";
import { defineComponent, h, type PropType } from "vue";
import { cn } from "#lib/utils";

/**
 * shadcn-compatible combobox root built on Reka UI. `value` is the selected
 * item (`null` for none) and `open` the popup's state; both are controlled.
 * Clearing (see {@link ComboboxInput}'s `showClear`) reports `null`. Other
 * Reka `ComboboxRoot` props, such as `ignoreFilter`, pass through.
 */
export const Combobox = defineComponent({
  name: "Combobox",
  inheritAttrs: false,
  props: {
    value: {
      type: String as PropType<string | null | undefined>,
      default: undefined,
    },
    open: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    name: { type: String as PropType<string | undefined>, default: undefined },
    onValueChange: {
      type: Function as PropType<(value: string | null) => void>,
      default: undefined,
    },
    onOpenChange: {
      type: Function as PropType<(open: boolean) => void>,
      default: undefined,
    },
  },
  setup(props, { slots, attrs }) {
    return () =>
      h(
        ComboboxRoot,
        {
          "data-slot": "combobox",
          modelValue: props.value ?? null,
          open: props.open,
          disabled: props.disabled,
          name: props.name,
          resetModelValueOnClear: true,
          "onUpdate:modelValue": (value: unknown) =>
            props.onValueChange?.((value as string | null) ?? null),
          "onUpdate:open": (open: boolean) => props.onOpenChange?.(open),
          ...attrs,
        },
        slots,
      );
  },
});

/**
 * The combobox's text input, with a toggle and an optional clear button. The
 * input's text is controlled by `value`; `onInputValueChange` reports only
 * what's typed, not the label Reka writes back after a selection.
 */
export const ComboboxInput = defineComponent({
  name: "ComboboxInput",
  inheritAttrs: false,
  props: {
    value: { type: String, default: "" },
    showClear: { type: Boolean, default: false },
    readOnly: { type: Boolean, default: false },
    onInputValueChange: {
      type: Function as PropType<(value: string) => void>,
      default: undefined,
    },
  },
  setup(props, { attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        ComboboxAnchor,
        {
          "data-slot": "combobox-input-group",
          class: "relative flex w-full items-center",
        },
        {
          default: () => [
            h(RekaComboboxInput, {
              "data-slot": "combobox-input",
              class: cn(
                "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-14 pl-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
                className as string,
              ),
              modelValue: props.value,
              readonly: props.readOnly || undefined,
              onInput: (event: Event) =>
                props.onInputValueChange?.(
                  (event.target as HTMLInputElement).value,
                ),
              ...rest,
            }),
            h(
              "div",
              {
                class:
                  "absolute right-1 flex items-center gap-0.5 text-muted-foreground",
              },
              [
                props.showClear
                  ? h(
                      ComboboxCancel,
                      {
                        "data-slot": "combobox-clear",
                        "aria-label": "Clear",
                        class:
                          "flex size-6 items-center justify-center rounded-md hover:text-foreground",
                      },
                      { default: () => h(XIcon, { class: "size-3.5" }) },
                    )
                  : null,
                h(
                  ComboboxTrigger,
                  {
                    "data-slot": "combobox-trigger",
                    "aria-label": "Show options",
                    disabled: props.readOnly,
                    class:
                      "flex size-6 items-center justify-center rounded-md hover:text-foreground disabled:pointer-events-none",
                  },
                  { default: () => h(ChevronDownIcon, { class: "size-4" }) },
                ),
              ],
            ),
          ],
        },
      );
    };
  },
});

/** Renders the combobox popup, positioned under its input. */
export const ComboboxContent = defineComponent({
  name: "ComboboxContent",
  inheritAttrs: false,
  props: {
    sideOffset: { type: Number, default: 4 },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        ComboboxPortal,
        {},
        {
          default: () =>
            h(
              RekaComboboxContent,
              {
                "data-slot": "combobox-content",
                position: "popper",
                sideOffset: props.sideOffset,
                class: cn(
                  "isolate z-50 max-h-(--reka-combobox-content-available-height) w-(--reka-combobox-trigger-width) min-w-36 origin-(--reka-combobox-content-transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                  className as string,
                ),
                ...rest,
              },
              slots,
            ),
        },
      );
    };
  },
});

/** Lists the combobox's items. */
export const ComboboxList = defineComponent({
  name: "ComboboxList",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        ComboboxViewport,
        {
          "data-slot": "combobox-list",
          class: cn("outline-none", className as string),
          ...rest,
        },
        slots,
      );
    };
  },
});

/** Renders a selectable item, with a check when it's the current value. */
export const ComboboxItem = defineComponent({
  name: "ComboboxItem",
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        RekaComboboxItem,
        {
          "data-slot": "combobox-item",
          value: props.value,
          disabled: props.disabled,
          class: cn(
            "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
            className as string,
          ),
          ...rest,
        },
        {
          default: () => [
            slots.default?.(),
            h(
              ComboboxItemIndicator,
              {
                class:
                  "pointer-events-none absolute right-2 flex size-4 items-center justify-center",
              },
              { default: () => h(CheckIcon, { class: "size-4" }) },
            ),
          ],
        },
      );
    };
  },
});

/** Shown in place of the list when it has no items. */
export const ComboboxEmpty = defineComponent({
  name: "ComboboxEmpty",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        RekaComboboxEmpty,
        {
          "data-slot": "combobox-empty",
          class: cn(
            "px-1.5 py-1 text-sm text-muted-foreground",
            className as string,
          ),
          ...rest,
        },
        slots,
      );
    };
  },
});
