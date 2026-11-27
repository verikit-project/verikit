import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { cn } from "#lib/utils";

/** shadcn-compatible combobox root built on Base UI. */
const Combobox = ComboboxPrimitive.Root;

/** The combobox's text input, with a toggle and an optional clear button. */
function ComboboxInput({
  className,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & { showClear?: boolean }) {
  return (
    <div
      data-slot="combobox-input-group"
      className="relative flex w-full items-center"
    >
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-14 pl-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className,
        )}
        {...props}
      />
      <div className="absolute right-1 flex items-center gap-0.5 text-muted-foreground">
        {showClear ? (
          <ComboboxPrimitive.Clear
            data-slot="combobox-clear"
            aria-label="Clear"
            className="flex size-6 items-center justify-center rounded-md hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </ComboboxPrimitive.Clear>
        ) : null}
        <ComboboxPrimitive.Trigger
          data-slot="combobox-trigger"
          aria-label="Show options"
          className="flex size-6 items-center justify-center rounded-md hover:text-foreground"
        >
          <ChevronDownIcon className="size-4" />
        </ComboboxPrimitive.Trigger>
      </div>
    </div>
  );
}

/** Renders the combobox popup, positioned under its input. */
function ComboboxContent({
  className,
  children,
  ...props
}: ComboboxPrimitive.Popup.Props) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner sideOffset={4} className="isolate z-50">
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

/** Lists the combobox's items. */
function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

/** Renders a selectable item, with a check when it's the current value. */
function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <CheckIcon className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

/** Shown in place of the list when it has no items. */
function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "px-1.5 py-1 text-sm text-muted-foreground empty:hidden",
        className,
      )}
      {...props}
    />
  );
}

export {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
};
