import type { VNode } from "vue";

/**
 * Minimal shape for calling a component's `setup()` directly.
 * Parameters use `never` so concrete setup signatures remain assignable
 * under contravariant checking.
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
 * Invokes a component's `setup()` and returned render function directly,
 * without creating a Vue component instance. Intended for pure
 * prop-in/vnode-out components that don't depend on Vue instance APIs.
 * Props are intentionally passed without Vue's runtime prop resolution.
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
