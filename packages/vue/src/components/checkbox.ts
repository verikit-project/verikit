import { CheckIcon } from "lucide-vue-next";
import { CheckboxIndicator, CheckboxRoot } from "reka-ui";
import { defineComponent, h, type PropType } from "vue";
import { cn } from "#lib/utils";

/** shadcn-compatible checkbox built on Reka UI. */
export const Checkbox = defineComponent({
  name: "Checkbox",
  inheritAttrs: false,
  props: {
    checked: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    indeterminate: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    onCheckedChange: {
      type: Function as PropType<(checked: boolean) => void>,
      default: undefined,
    },
  },
  setup(props, { attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      const modelValue = props.indeterminate
        ? "indeterminate"
        : (props.checked ?? false);

      return h(
        CheckboxRoot,
        {
          "data-slot": "checkbox",
          modelValue,
          disabled: props.disabled,
          class: cn(
            "peer relative flex size-4 shrink-0 items-center justify-center rounded-lg border border-input transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary",
            className as string,
          ),
          "onUpdate:modelValue": (value: unknown) => {
            props.onCheckedChange?.(value === true);
          },
          ...rest,
        },
        {
          default: () =>
            h(
              CheckboxIndicator,
              {
                "data-slot": "checkbox-indicator",
                class:
                  "grid place-content-center text-current transition-none [&>svg]:size-3.5",
              },
              { default: () => h(CheckIcon) },
            ),
        },
      );
    };
  },
});
