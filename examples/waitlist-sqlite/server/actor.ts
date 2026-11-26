import { timingSafeEqual } from "node:crypto";

/** Who is making a request. Permission rules receive this as `actor`. */
export interface Actor {
  admin: boolean;
}

/**
 * An admin is a request carrying `Authorization: Bearer <ADMIN_TOKEN>`. With
 * no ADMIN_TOKEN set, nobody is an admin. A real app would read a session
 * from its auth library here instead.
 */
export function actorFromRequest(
  request: Request,
  adminToken = process.env.ADMIN_TOKEN,
): Actor {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${adminToken}`;

  return {
    admin:
      Boolean(adminToken) &&
      header.length === expected.length &&
      timingSafeEqual(Buffer.from(header), Buffer.from(expected)),
  };
}
