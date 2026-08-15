import { XIcon } from "lucide-vue-next";
import {
  DialogClose as RekaDialogClose,
  DialogContent as RekaDialogContent,
  DialogDescription as RekaDialogDescription,
  DialogOverlay,
  DialogPortal as RekaDialogPortal,
  DialogRoot,
  DialogTitle as RekaDialogTitle,
} from "reka-ui";
import { defineComponent, h, type PropType } from "vue";
import { cn } from "#lib/utils";

/** shadcn-compatible dialog root built on Reka UI. */
export const Dialog = defineComponent({
  name: "Dialog",
  inheritAttrs: false,
  props: {
    open: {
      type: Boolean as PropType<boolean | undefined>,
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
        DialogRoot,
        {
          open: props.open,
          "onUpdate:open": (open: boolean) => props.onOpenChange?.(open),
          ...attrs,
        },
        slots,
      );
  },
});

/** A button that closes the nearest ancestor dialog. */
export const DialogClose = defineComponent({
  name: "DialogClose",
  inheritAttrs: false,
  props: {
    asChild: { type: Boolean, default: false },
  },
  setup(props, { slots, attrs }) {
    return () =>
      h(RekaDialogClose, { asChild: props.asChild, ...attrs }, slots);
  },
});

/** Portals the dialog's backdrop and popup to `document.body`. */
export const DialogPortal = defineComponent({
  name: "DialogPortal",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => h(RekaDialogPortal, attrs, slots);
  },
});

/** The dimmed overlay shown beneath an open dialog's popup. */
export const DialogBackdrop = defineComponent({
  name: "DialogBackdrop",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(DialogOverlay, {
        "data-slot": "dialog-backdrop",
        class: cn(
          "fixed inset-0 z-50 bg-black/50 duration-100 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          className as string,
        ),
        ...rest,
      });
    };
  },
});

/**
 * The dialog's centered content pane, complete with its own portal, backdrop,
 * and close button so a consumer only has to render `Dialog` + `DialogContent`.
 */
export const DialogContent = defineComponent({
  name: "DialogContent",
  inheritAttrs: false,
  props: {
    showClose: { type: Boolean, default: true },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        DialogPortal,
        {},
        {
          default: () => [
            h(DialogBackdrop),
            h(
              RekaDialogContent,
              {
                "data-slot": "dialog-content",
                class: cn(
                  "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 shadow-lg duration-100 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                  className as string,
                ),
                ...rest,
              },
              {
                default: () => [
                  slots.default?.(),
                  props.showClose
                    ? h(
                        RekaDialogClose,
                        {
                          "data-slot": "dialog-close",
                          "aria-label": "Close",
                          class:
                            "absolute top-4 right-4 rounded-md opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
                        },
                        { default: () => h(XIcon, { class: "size-4" }) },
                      )
                    : null,
                ],
              },
            ),
          ],
        },
      );
    };
  },
});

/** Groups a dialog's title/description above its body. */
export const DialogHeader = defineComponent({
  name: "DialogHeader",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        "div",
        {
          "data-slot": "dialog-header",
          class: cn("flex flex-col gap-1.5", className as string),
          ...rest,
        },
        slots.default?.(),
      );
    };
  },
});

/** Groups a dialog's action buttons below its body. */
export const DialogFooter = defineComponent({
  name: "DialogFooter",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        "div",
        {
          "data-slot": "dialog-footer",
          class: cn("flex justify-end gap-2 pt-2", className as string),
          ...rest,
        },
        slots.default?.(),
      );
    };
  },
});

/** The dialog's accessible title text. */
export const DialogTitle = defineComponent({
  name: "DialogTitle",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        RekaDialogTitle,
        {
          "data-slot": "dialog-title",
          class: cn("text-lg font-semibold", className as string),
          ...rest,
        },
        slots,
      );
    };
  },
});

/** The dialog's accessible supporting description text. */
export const DialogDescription = defineComponent({
  name: "DialogDescription",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => {
      const { class: className, ...rest } = attrs as Record<string, unknown>;
      return h(
        RekaDialogDescription,
        {
          "data-slot": "dialog-description",
          class: cn("text-sm text-muted-foreground", className as string),
          ...rest,
        },
        slots,
      );
    };
  },
});
