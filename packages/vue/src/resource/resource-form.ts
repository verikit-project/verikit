import type { RelationshipNode } from "@verikit/core";
import type { SchemaPath } from "@verikit/ui-core/layout/path";
import { defineComponent, h, type PropType, type VNodeChild } from "vue";
import { Button } from "#components/button";
import { cn } from "#lib/utils";
import type { VerikitFieldRegistry } from "../fields/types.js";
import { RenderSchemaTree } from "../layout/render-schema-node.js";
import {
  useResourceSchemaTreeForm,
  type UseResourceSchemaTreeFormOptions,
} from "../query/use-resource-schema-tree-form.js";
import type { VerikitSchemaTreeSource } from "../form/use-verikit-schema-tree-form.js";

/** Props for {@link ResourceForm}. */
export interface ResourceFormProps<
  TRecord = Record<string, unknown>,
> extends UseResourceSchemaTreeFormOptions<TRecord> {
  /** The resource (or its schema) whose tree drives the form and submission. */
  resource: VerikitSchemaTreeSource;
  /** Optional renderer overrides keyed by field type. */
  registry?: Partial<VerikitFieldRegistry>;
  /**
   * Overrides relationship rendering. By default, `belongsTo` uses the
   * built-in picker; collection relationships require a custom renderer.
   */
  renderRelationship?: (node: RelationshipNode, path: SchemaPath) => VNodeChild;
  /** Label shown on the submit button while idle. Defaults to `"Save"`. */
  submitLabel?: string;
  /** Class name applied to the outer `<form>`. */
  className?: string;
}

/**
 * Renders a responsive resource form powered by `useResourceSchemaTreeForm`,
 * with layouts, relationships, conditional fields, and submission state.
 */
export const ResourceForm = defineComponent({
  name: "ResourceForm",
  props: {
    resource: {
      type: Object as PropType<VerikitSchemaTreeSource>,
      required: true,
    },
    id: { type: String as PropType<string | undefined>, default: undefined },
    actions: {
      type: Object as PropType<ResourceFormProps["actions"]>,
      default: undefined,
    },
    defaultValues: {
      type: Object as PropType<ResourceFormProps["defaultValues"]>,
      default: undefined,
    },
    onSuccess: {
      type: Function as PropType<ResourceFormProps["onSuccess"]>,
      default: undefined,
    },
    onError: {
      type: Function as PropType<ResourceFormProps["onError"]>,
      default: undefined,
    },
    registry: {
      type: Object as PropType<Partial<VerikitFieldRegistry> | undefined>,
      default: undefined,
    },
    renderRelationship: {
      type: Function as PropType<ResourceFormProps["renderRelationship"]>,
      default: undefined,
    },
    submitLabel: { type: String, default: "Save" },
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const result = useResourceSchemaTreeForm(props.resource, {
      id: props.id,
      actions: props.actions,
      defaultValues: props.defaultValues,
      onSuccess: props.onSuccess,
      onError: props.onError,
    });

    function handleSubmit(event: Event): void {
      event.preventDefault();
      event.stopPropagation();
      // `submitError` already handles mutation failures; suppress the rejection here.
      result.submit().catch(() => {});
    }

    return () =>
      h(
        "form",
        {
          class: cn("grid gap-4", props.className),
          onSubmit: handleSubmit,
          novalidate: true,
        },
        [
          RenderSchemaTree({
            nodes: result.tree,
            registry: props.registry,
            renderRelationship: props.renderRelationship,
            ...result.treeProps.value,
          }),
          result.submitError.value
            ? h(
                "p",
                { role: "alert", class: "text-sm text-destructive" },
                result.submitError.value.message,
              )
            : null,
          h("div", { class: "flex justify-end" }, [
            h(
              Button,
              { type: "submit", disabled: result.isSubmitting.value },
              {
                default: () =>
                  result.isSubmitting.value ? "Saving…" : props.submitLabel,
              },
            ),
          ]),
        ],
      );
  },
});
