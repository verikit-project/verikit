import type { VerikitClient } from "@verikit/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";

const VerikitClientContext = createContext<VerikitClient | undefined>(
  undefined,
);

export interface VerikitProviderProps {
  client: VerikitClient;
  /**
   * An application's own `QueryClient`, so `@verikit/react`'s query hooks share its
   * cache instead of a second, isolated one. Omit it to let `VerikitProvider` create
   * and own a `QueryClient` for its subtree.
   */
  queryClient?: QueryClient;
  children?: ReactNode;
}

/**
 * Provides a `VerikitClient` and TanStack Query `QueryClient` to its subtree.
 *
 * If `queryClient` is omitted, the provider creates one automatically.
 * Apps with an existing `QueryClient` can pass it to share the same cache.
 */
export function VerikitProvider({
  client,
  queryClient,
  children,
}: VerikitProviderProps) {
  const [ownedQueryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient ?? ownedQueryClient}>
      <VerikitClientContext.Provider value={client}>
        {children}
      </VerikitClientContext.Provider>
    </QueryClientProvider>
  );
}

/** Reads the nearest ancestor `VerikitProvider`'s client. */
export function useVerikitClient(): VerikitClient {
  const client = useContext(VerikitClientContext);

  if (!client) {
    throw new Error("useVerikitClient must be used within a VerikitProvider.");
  }

  return client;
}
