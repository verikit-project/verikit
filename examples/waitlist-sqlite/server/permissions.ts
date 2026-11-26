import { definePermissions } from "verikit";
import type { ServerResourceConfig } from "verikit/server";
import type { ResourceName } from "../resources/index.ts";
import type { Actor } from "./actor.ts";

const isAdmin = ({ actor }: { actor: Actor }) => actor.admin;

// Permissions fail closed: anything without a rule is denied, down to
// individual fields. Anyone may join the waitlist with an email, name, and
// source; only an admin may list or read signups, change them, or invite.
//
// Field reads are `true` because listing and reading are already admin-only.
// It also matters for the panel: search, sort, and filter only use fields
// whose read rule is a static `true`, since a rule that depends on the
// request (like isAdmin) could otherwise leak values through query results.
const signupPermissions = definePermissions<Actor>()
  .can("create", true)
  .can("list", isAdmin)
  .can("read", isAdmin)
  .can("update", isAdmin)
  .can("delete", isAdmin)
  .field("email", { read: true, write: true })
  .field("name", { read: true, write: true })
  .field("source", { read: true, write: true })
  .field("status", { read: true, write: isAdmin })
  .action("invite", isAdmin);

// Every resource needs an entry here; TypeScript reports any that are missing.
export const permissions: Record<
  ResourceName,
  ServerResourceConfig<Actor>["permissions"]
> = {
  signup: signupPermissions,
};
