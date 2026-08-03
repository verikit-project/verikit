import type { VerikitClient } from "@verikit/client";
import { createContext, useContext, type ReactNode } from "react";

const VerikitClientContext = createContext<VerikitClient | undefined>(
  undefined,
);

export interface VerikitProviderProps {
  client: VerikitClient;
  children?: ReactNode;
}

/** Supplies a `VerikitClient` instance to `useVerikitClient()` for its subtree. */
export function VerikitProvider({ client, children }: VerikitProviderProps) {
  return (
    <VerikitClientContext.Provider value={client}>
      {children}
    </VerikitClientContext.Provider>
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
