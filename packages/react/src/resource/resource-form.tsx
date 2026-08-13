import type { FormEvent, ReactElement } from "react";
import { Button } from "#components/button";
import { cn } from "#lib/utils";
import { RenderField } from "../fields/registry.js";
import type { VerikitFieldRegistry } from "../fields/types.js";
import {
  useResourceForm,
  type UseResourceFormOptions,
  type UseResourceFormSource,
} from "../query/use-resource-form.js";

/** Props for {@link ResourceForm}. */
export interface ResourceFormProps<
  TRecord = Record<string, unknown>,
> extends UseResourceFormOptions<TRecord> {
  /** The resource (or its schema) whose fields drive the form and submission. */
  resource: UseResourceFormSource;
  /** Optional renderer overrides keyed by field type. */
  registry?: Partial<VerikitFieldRegistry>;
  /** Label shown on the submit button while idle. Defaults to `"Save"`. */
  submitLabel?: string;
  /** Class name applied to the outer `<form>`. */
  className?: string;
}

/**
 * A polished, mobile-friendly form for a single resource: wraps
 * `useResourceForm` with real markup  one stacked field per visible schema
 * field, a submit-error banner, and a submit button reflecting in-flight
 * state  so a consumer doesn't have to hand-write field iteration to use
 * the headless hook. Hidden fields are skipped, matching `RenderField`'s own
 * suppression of fields the actor can't read.
 */
export function ResourceForm<TRecord = Record<string, unknown>>({
  resource,
  id,
  defaultValues,
  onSuccess,
  onError,
  registry,
  submitLabel = "Save",
  className,
}: ResourceFormProps<TRecord>): ReactElement {
  const result = useResourceForm<TRecord>(resource, {
    id,
    defaultValues,
    onSuccess,
    onError,
  });
  const fields = Object.values(result.fields).filter((field) => !field.hidden);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // `submit()` rejects on a failed create/update; `submitError` above
    // already surfaces that failure as state, which is this component's
    // whole purpose, so the rejection itself has nowhere useful to go.
    result.submit().catch(() => {});
  };

  return (
    <form
      className={cn("grid gap-4", className)}
      onSubmit={handleSubmit}
      noValidate
    >
      {fields.map((field) => (
        <RenderField
          key={field.name}
          {...result.getFieldProps(field.name)}
          registry={registry}
        />
      ))}
      {result.submitError ? (
        <p role="alert" className="text-sm text-destructive">
          {result.submitError.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={result.isSubmitting}>
          {result.isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
