import { useMemo } from "react";
import { createClient } from "verikit/client";
import { VerikitProvider } from "verikit/react";
import { Panel } from "verikit/react-panel";
import { resources } from "../resources/index.ts";
import { useAdminSession, useAdminToken } from "./admin-token.ts";
import { SignIn } from "./SignIn.tsx";

export function App() {
  const token = useAdminToken();
  // A new client for each token, so data cached for one sign-in is never
  // shown to the next. See "Cache identity" in @verikit/client's README.
  const client = useMemo(
    () =>
      createClient({
        baseUrl: "/api",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      }),
    [token],
  );

  return (
    <VerikitProvider client={client}>
      <Panel
        title="Waitlist"
        resources={resources}
        auth={{ useSession: useAdminSession, signIn: <SignIn /> }}
      />
    </VerikitProvider>
  );
}
