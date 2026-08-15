import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-vue-next";
import {
  SelectContent as RekaSelectContent,
  SelectGroup as RekaSelectGroup,
  SelectIcon,
  SelectItem as RekaSelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel as RekaSelectLabel,
  SelectPortal,
  SelectRoot,
  SelectScrollDownButton as RekaSelectScrollDownButton,
  SelectScrollUpButton as RekaSelectScrollUpButton,
  SelectSeparator as RekaSelectSeparator,
  SelectTrigger as RekaSelectTrigger,
  SelectValue as RekaSelectValue,
  SelectViewport,
} from "reka-ui";
import { defineComponent, h, type PropType } from "vue";
import { cn } from "#lib/utils";

/** shadcn-compatible select root built on Reka UI. */
export const Select = defineComponent({
  name: "Select",
  inheritAttrs: false,
  props: {
    value: { type: String as PropType<string | undefined>, default: undefined },
    disabled: { type: Boolean, default: false },
    name: { type: String as PropType<string | undefined>, default: undefined },
    onValueChange: {
      type: Function as PropType<(value: string | null) => void>,
      default: undefined,
    },
  },
  setup(props, { slots, attrs }) {
    return () =>
      h(
        SelectRoot,
        {
          modelValue: props.value,
          disabled: props.disabled,
          name: props.name,
          "onUpdate:modelValue": (value: unknown) =>
            props.onValueChange?.((value as string | null) ?? null),
          ...attrs,
        },
        slots,
      );
  },
});

/** Groups related select items. */
export const SelectGroup = defineComponent({
  name: "SelectGroup",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        RekaSelectGroup,
        {
          "data-slot": "select-group",
          class: cn("scroll-my-1 p-1", className as string),
          ...rest,
        },
        slots,
      );
    };
  },
});

/** Displays the current select value or placeholder. */
export const SelectValue = defineComponent({
  name: "SelectValue",
  inheritAttrs: false,
  props: {
    placeholder: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props, { attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(RekaSelectValue, {
        "data-slot": "select-value",
        placeholder: props.placeholder,
        class: cn("flex flex-1 text-left", className as string),
        ...rest,
      });
    };
  },
});

/** Opens the select popup and displays the current value. */
export const SelectTrigger = defineComponent({
  name: "SelectTrigger",
  inheritAttrs: false,
  props: {
    size: { type: String as PropType<"sm" | "default">, default: "default" },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        RekaSelectTrigger,
        {
          "data-slot": "select-trigger",
          "data-size": props.size,
          class: cn(
            "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            className as string,
          ),
          ...rest,
        },
        {
          default: () => [
            slots.default?.(),
            h(
              SelectIcon,
              {},
              {
                default: () =>
                  h(ChevronDownIcon, {
                    class: "pointer-events-none size-4 text-muted-foreground",
                  }),
              },
            ),
          ],
        },
      );
    };
  },
});

/** Renders the select popup content. */
export const SelectContent = defineComponent({
  name: "SelectContent",
  inheritAttrs: false,
  props: {
    side: {
      type: String as PropType<"top" | "bottom" | "left" | "right">,
      default: "bottom",
    },
    sideOffset: { type: Number, default: 4 },
    align: {
      type: String as PropType<"start" | "center" | "end">,
      default: "center",
    },
    alignOffset: { type: Number, default: 0 },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        SelectPortal,
        {},
        {
          default: () =>
            h(
              RekaSelectContent,
              {
                position: "popper",
                side: props.side,
                sideOffset: props.sideOffset,
                align: props.align,
                alignOffset: props.alignOffset,
                class: cn(
                  "relative isolate z-50 max-h-(--reka-popper-available-height) w-(--reka-popper-anchor-width) min-w-36 origin-(--reka-popper-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                  className as string,
                ),
                ...rest,
              },
              {
                default: () => [
                  h(SelectScrollUpButton),
                  h(SelectViewport, {}, { default: () => slots.default?.() }),
                  h(SelectScrollDownButton),
                ],
              },
            ),
        },
      );
    };
  },
});

/** Renders a label inside a select group. */
export const SelectLabel = defineComponent({
  name: "SelectLabel",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        RekaSelectLabel,
        {
          "data-slot": "select-label",
          class: cn(
            "px-1.5 py-1 text-xs text-muted-foreground",
            className as string,
          ),
          ...rest,
        },
        slots,
      );
    };
  },
});

/** Renders a selectable item. */
export const SelectItem = defineComponent({
  name: "SelectItem",
  inheritAttrs: false,
  props: {
    value: { type: String as PropType<string>, required: true },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        RekaSelectItem,
        {
          "data-slot": "select-item",
          value: props.value,
          disabled: props.disabled,
          class: cn(
            "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
            className as string,
          ),
          ...rest,
        },
        {
          default: () => [
            h(
              SelectItemText,
              { class: "flex flex-1 shrink-0 gap-2 whitespace-nowrap" },
              { default: () => slots.default?.() },
            ),
            h(
              SelectItemIndicator,
              {
                class:
                  "pointer-events-none absolute right-2 flex size-4 items-center justify-center",
              },
              { default: () => h(CheckIcon, { class: "pointer-events-none" }) },
            ),
          ],
        },
      );
    };
  },
});

/** Renders a visual separator between select items. */
export const SelectSeparator = defineComponent({
  name: "SelectSeparator",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(RekaSelectSeparator, {
        "data-slot": "select-separator",
        class: cn(
          "pointer-events-none -mx-1 my-1 h-px bg-border",
          className as string,
        ),
        ...rest,
      });
    };
  },
});

/** Renders the scroll-up affordance for overflowing select content. */
export const SelectScrollUpButton = defineComponent({
  name: "SelectScrollUpButton",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        RekaSelectScrollUpButton,
        {
          "data-slot": "select-scroll-up-button",
          class: cn(
            "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
            className as string,
          ),
          ...rest,
        },
        { default: () => h(ChevronUpIcon) },
      );
    };
  },
});

/** Renders the scroll-down affordance for overflowing select content. */
export const SelectScrollDownButton = defineComponent({
  name: "SelectScrollDownButton",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        RekaSelectScrollDownButton,
        {
          "data-slot": "select-scroll-down-button",
          class: cn(
            "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
            className as string,
          ),
          ...rest,
        },
        { default: () => h(ChevronDownIcon) },
      );
    };
  },
});
