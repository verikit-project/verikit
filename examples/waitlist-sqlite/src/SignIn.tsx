import { useState, type FormEvent } from "react";
import { setAdminToken } from "./admin-token.ts";

/** Shown by the panel until an admin token has been accepted by the API. */
export function SignIn() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setChecking(true);
    setError(null);

    // Listing signups is admin-only, so it doubles as a token check.
    const response = await fetch("/api/signup?pageSize=1", {
      headers: { authorization: `Bearer ${value}` },
    });

    setChecking(false);

    if (response.ok) {
      setAdminToken(value);
    } else {
      setError(
        response.status === 403
          ? "That token isn't right. It's ADMIN_TOKEN in the server's .env file."
          : `The server responded with ${response.status}.`,
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <form
        onSubmit={submit}
        className="grid w-full max-w-sm gap-4 rounded-lg border border-border p-6"
      >
        <div>
          <h1 className="text-lg font-semibold">Waitlist admin</h1>
          <p className="text-sm text-muted-foreground">
            Enter the admin token to manage signups.
          </p>
        </div>
        <label className="grid gap-1.5 text-sm font-medium">
          Admin token
          <input
            type="password"
            value={value}
            onChange={(event) => setValue(event.currentTarget.value)}
            required
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 font-normal"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={checking}
          className="h-9 rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {checking ? "Checking…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
