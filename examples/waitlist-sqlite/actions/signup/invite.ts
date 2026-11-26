import { eq, sql } from "drizzle-orm";
import { VerikitError } from "verikit";
import { db } from "../../db/client.ts";
import { signups } from "../../db/schema.ts";
import { invite as declaration } from "../../resources/signup.actions.ts";

interface SignupRecord {
  id: string;
  status: string;
}

// Created with `npx verikit make:action signup invite`. Runs on the server
// only; server/permissions.ts lets only admins run it. The label and
// confirmation come from the declaration in resources/signup.actions.ts.
// Call it with
//   client.resource("signup").action("invite", {}, { recordId, confirmed: true })
// or POST /api/signup/actions/invite with { "recordId": "...", "confirmed": true }.
export const invite = declaration
  // Checked before the handler runs, and by the panel for every row on the
  // page: the Invite button is disabled, with this reason, once someone is
  // invited.
  .availableWhen(({ record }) =>
    (record as SignupRecord | undefined)?.status === "invited"
      ? { available: false, reason: "Already invited." }
      : true,
  )
  .execute(async ({ record }) => {
    const id = (record as SignupRecord | undefined)?.id;

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
