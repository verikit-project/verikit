import { eq, sql } from "drizzle-orm";
import { action, VerikitError } from "verikit";
import { db } from "../../db/client.ts";
import { signups } from "../../db/schema.ts";

// Created with `npx verikit make:action signup invite`. Runs on the server
// only; server/permissions.ts lets only admins run it. Call it with
//   client.resource("signup").action("invite", {}, { recordId })
// or POST /api/signup/actions/invite with { "recordId": "..." }.
export const invite = action("invite")
  .label("Invite")
  .execute(async ({ record }) => {
    const id = (record as { id?: string } | undefined)?.id;

    if (!id) {
      throw new VerikitError(
        "Pass the signup to invite as recordId.",
        "VALIDATION_ERROR",
        400,
      );
    }

    // Writes outside Verikit's own update must increment `revision` too,
    // or an admin's in-flight edit could silently overwrite this change.
    db.update(signups)
      .set({ status: "invited", revision: sql`${signups.revision} + 1` })
      .where(eq(signups.id, id))
      .run();

    // A real app would send the invitation email here.
    return { id, status: "invited" };
  });
