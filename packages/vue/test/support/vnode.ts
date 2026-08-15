import type { VNode } from "vue";

/**
 * Minimal shape needed to call a `defineComponent` object's `setup` directly,
 * bypassing a real mount. Parameters are typed `never` (not their real prop
 * shape) so that any concrete component's more-specific `setup` is still
 * assignable here — contravariant parameter checking against `never` always
 * succeeds. `renderComponent` casts back to a callable shape when invoking it.
 */
export interface RawComponent {
  setup?: (props: never, context: never) => unknown;
}

export interface RawSetupContext {
  slots?: Record<string, (...args: unknown[]) => unknown>;
  attrs?: Record<string, unknown>;
  emit?: (...args: unknown[]) => void;
  expose?: (...args: unknown[]) => void;
}

/**
 * Invokes a `defineComponent` object's `setup()` directly and calls the
 * returned render function, without a real Vue component instance. Works for
 * components that don't rely on `inject`/lifecycle hooks/`useAttrs` — the
 * field, layout, and filter components here are all pure prop-in/vnode-out.
 * Props are passed loosely (not type-checked against the component's own
 * prop validators), since this only ever needs to exercise them, not model
 * Vue's own prop-resolution/defaulting behavior.
 */
export function renderComponent(
  component: RawComponent,
  props: Record<string, unknown>,
  context: RawSetupContext = {},
): VNode {
  const setup = component.setup as unknown as (
    props: Record<string, unknown>,
    context: RawSetupContext,
  ) => unknown;
  const setupResult = setup(props, {
    slots: {},
    attrs: {},
    emit: () => {},
    expose: () => {},
    ...context,
  });

  if (typeof setupResult !== "function") {
    throw new Error("Component setup() did not return a render function.");
  }

  return (setupResult as () => VNode)();
}

/** Normalizes a vnode's children (array, slots object, or single child) into a flat array. */
export function childrenOf(node: unknown): unknown[] {
  const vnode = node as VNode;
  const children = vnode.children;

  if (Array.isArray(children)) {
    return children as unknown[];
  }

  if (children && typeof children === "object" && "default" in children) {
    const slot = (children as Record<string, () => unknown>).default;
    const result = slot();
    return Array.isArray(result) ? (result as unknown[]) : [result];
  }

  if (children === null || children === undefined) {
    return [];
  }

  return [children];
}

/** Asserts a value is a vnode and returns it, narrowing for `.type`/`.props`/`.key` access. */
export function asVNode(value: unknown): VNode {
  if (
    value === null ||
    typeof value !== "object" ||
    !("props" in (value as Record<string, unknown>))
  ) {
    throw new Error("Expected a vnode.");
  }

  return value as VNode;
}
