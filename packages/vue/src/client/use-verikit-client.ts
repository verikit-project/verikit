import type { VerikitClient } from "@verikit/client";
import { QueryClient, VUE_QUERY_CLIENT } from "@tanstack/vue-query";
import {
  defineComponent,
  inject,
  onMounted,
  onUnmounted,
  provide,
  type InjectionKey,
  type PropType,
  type Slots,
} from "vue";

const VERIKIT_CLIENT_KEY: InjectionKey<VerikitClient> = Symbol("VerikitClient");

export interface VerikitProviderProps {
  client: VerikitClient;
  /**
   * An application's own `QueryClient`, so `@verikit/vue`'s query composables share its
   * cache instead of a second, isolated one. Omit it to let `VerikitProvider` create
   * and own a `QueryClient` for its subtree.
   */
  queryClient?: QueryClient;
}

/**
 * Provides a `VerikitClient` and TanStack Query `QueryClient` to its subtree.
 *
 * If `queryClient` is omitted, the provider creates one automatically.
 * Apps with an existing `QueryClient` can pass it to share the same cache.
 */
export const VerikitProvider = defineComponent({
  name: "VerikitProvider",
  props: {
    client: {
      type: Object as PropType<VerikitClient>,
      required: true,
    },
    queryClient: {
      type: Object as PropType<QueryClient>,
      required: false,
    },
  },
  setup(props, { slots }: { slots: Slots }) {
    const ownedQueryClient = new QueryClient();
    const activeQueryClient = props.queryClient ?? ownedQueryClient;

    provide(VERIKIT_CLIENT_KEY, props.client);
    provide(VUE_QUERY_CLIENT, activeQueryClient);

    onMounted(() => activeQueryClient.mount());
    onUnmounted(() => activeQueryClient.unmount());

    return () => slots.default?.();
  },
});

/** Reads the nearest ancestor `VerikitProvider`'s client. */
export function useVerikitClient(): VerikitClient {
  const client = inject(VERIKIT_CLIENT_KEY);

  if (!client) {
    throw new Error("useVerikitClient must be used within a VerikitProvider.");
  }

  return client;
}
